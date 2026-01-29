import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/services/[id]
 * Get a single service details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: service, error } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            // Postgres returns error if row not found (when using .single())
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/services/[id]
 * Update a service
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Check if service exists and belongs to tenant (RLS handles this implicitly usually, 
        // but update will just return 0 rows if not found/owned)

        const { data: service, error } = await supabase
            .from('services')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating service:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Handle staff assignment sync if provided
        if (body.assignedStaffIds && Array.isArray(body.assignedStaffIds)) {
            // This is a "sync" operation:
            // 1. Delete all existing for this service
            // 2. Insert new ones
            // OR use upsert/diff logic. Deleting all and re-inserting is simplest for now 
            // but risky if there's other metadata on the relationship.
            // Assuming `service_staff` is just a join table (service_id, staff_id).

            // First, delete all existing assignments
            const { error: deleteError } = await supabase
                .from('service_staff')
                .delete()
                .eq('service_id', id);

            if (deleteError) {
                console.error('Error clearing staff assignments:', deleteError);
            } else if (body.assignedStaffIds.length > 0) {
                // Insert new ones
                const staffInserts = body.assignedStaffIds.map((staffId: string) => ({
                    service_id: id,
                    staff_id: staffId
                }));

                const { error: insertError } = await supabase
                    .from('service_staff')
                    .insert(staffInserts);

                if (insertError) {
                    console.error('Error inserting staff assignments:', insertError);
                }
            }
        }

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error updating service:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/services/[id]
 * Delete a service
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting service:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
