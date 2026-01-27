import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/staff/[id]/working-hours
 * Get working hours for a staff member
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

        const { data: workingHours, error } = await supabase
            .from('staff_working_hours')
            .select('*')
            .eq('staff_id', id)
            .order('day_of_week');

        if (error) {
            console.error('Error fetching working hours:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(workingHours);
    } catch (error) {
        console.error('Error in GET /api/staff/[id]/working-hours:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/staff/[id]/working-hours
 * Update working hours for a staff member
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id: staffId } = await params;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership/permissions implicitly via RLS or explicit check if needed.
        // RLS "Owners and admins can manage working hours" checking `get_tenant_id()` 
        // vs staff's tenant_id is robust.

        const body = await request.json();
        const { hours } = body;
        // Expect body: { hours: [{ day_of_week: 0, start_time: '...', end_time: '...' }, ...] }

        if (!Array.isArray(hours)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // We'll perform a transaction-like update:
        // 1. Delete existing hours for this staff
        // 2. Insert new hours
        // This is simpler than matching individual rows.

        // Note: Supabase JS library doesn't strictly support "transactions" in one call 
        // without RPC, but we can do sequential ops. 
        // ideally accessing the same table.

        // Better approach with Supabase/Postgres: Upsert.
        // But we might want to remove days that are not in the list (if closed).

        // Strategy: Delete all for staff_id, then Insert.

        const { error: deleteError } = await supabase
            .from('staff_working_hours')
            .delete()
            .eq('staff_id', staffId);

        if (deleteError) {
            console.error('Error clearing old working hours:', deleteError);
            return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
        }

        // Prepare insert data
        const insertData = hours.map((h: any) => ({
            staff_id: staffId,
            day_of_week: h.day_of_week,
            start_time: h.start_time,
            end_time: h.end_time,
        }));

        if (insertData.length > 0) {
            const { error: insertError } = await supabase
                .from('staff_working_hours')
                .insert(insertData);

            if (insertError) {
                console.error('Error inserting new working hours:', insertError);
                return NextResponse.json({ error: 'Failed to save new schedule' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PUT /api/staff/[id]/working-hours:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
