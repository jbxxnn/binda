import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { id: staffId } = await params;

        // Verify auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');

        let query = supabase
            .from('staff_time_off')
            .select('*')
            .eq('staff_id', staffId)
            .order('start_time', { ascending: true });

        if (from) {
            query = query.gte('end_time', from); // Only future/current meetings
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching time off:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
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

        const body = await request.json();
        const { start_time, end_time, reason } = body;

        if (!start_time || !end_time) {
            return NextResponse.json({ error: 'Missing start_time or end_time' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('staff_time_off')
            .insert({
                staff_id: staffId,
                start_time,
                end_time,
                reason
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating time off:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const timeOffId = searchParams.get('timeOffId');

        if (!timeOffId) {
            return NextResponse.json({ error: 'Missing timeOffId' }, { status: 400 });
        }

        const { error } = await supabase
            .from('staff_time_off')
            .delete()
            .eq('id', timeOffId);

        if (error) {
            console.error('Error deleting time off:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
