import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type helper for Params
type Params = Promise<{ id: string }>;

export async function GET(
    request: NextRequest,
    { params }: { params: Params }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        // Fetch staff assigned to this service
        const { data: assignedStaff, error } = await supabase
            .from('service_staff')
            .select(`
                staff_id,
                staff:staff(id, name, is_active)
            `)
            .eq('service_id', id);

        if (error) throw error;

        // Flatten structure
        const result = assignedStaff.map((item: any) => item.staff);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch assigned staff' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Params }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        const body = await request.json();
        const { staffId } = body;

        if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 });

        const { error } = await supabase
            .from('service_staff')
            .insert({
                service_id: id,
                staff_id: staffId
            });

        if (error) {
            // Check unique constraint violation
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Staff already assigned' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to assign staff' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Params }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        const searchParams = request.nextUrl.searchParams;
        const staffId = searchParams.get('staffId'); // Pass as query param for delete

        if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 });

        const { error } = await supabase
            .from('service_staff')
            .delete()
            .eq('service_id', id)
            .eq('staff_id', staffId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove staff' }, { status: 500 });
    }
}
