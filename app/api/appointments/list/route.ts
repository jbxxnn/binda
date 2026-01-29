import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DateTime } from 'luxon';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const staffId = searchParams.get('staffId');

        if (!from || !to) {
            return NextResponse.json({ error: 'Missing from/to dates' }, { status: 400 });
        }

        const supabase = await createClient();

        let query = supabase
            .from('appointments')
            .select(`
                id,
                start_time,
                end_time,
                status,
                service:services(name), 
                staff:staff(name),
                customer:customers(name)
            `)
            .gte('start_time', from)
            .lte('start_time', to);

        if (staffId && staffId !== 'all') {
            query = query.eq('staff_id', staffId);
        }

        // We might want to filter out cancelled? Or show them?
        // Calendar usually shows everything but maybe grayed out.

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching appointments:', error);
            return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
        }

        // Transform for frontend if needed, or send raw
        return NextResponse.json(data);

    } catch (error) {
        console.error('Internal Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
