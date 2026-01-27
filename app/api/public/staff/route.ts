import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// NOTE: This handles getting staff for a Service (publicly)
// Or we could make a `api/public/services/[id]/staff`? 
// Let's use query params for flexibility: ?serviceId=...

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
        return NextResponse.json({ error: 'Missing serviceId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    try {
        // Fetch staff via junction table
        const { data: assignedStaff, error } = await supabase
            .from('service_staff')
            .select(`
                staff_id,
                staff:staff(id, name, is_active)
            `)
            .eq('service_id', serviceId);

        if (error) throw error;

        // Filter valid/active staff
        const staff = assignedStaff
            .map((item: any) => item.staff)
            .filter((s: any) => s && s.is_active);

        return NextResponse.json(staff);
    } catch (error) {
        console.error('Public Staff Error:', error);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}
