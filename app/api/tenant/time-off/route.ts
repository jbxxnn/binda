import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // We need to get the user's tenant_id. 
        // Assuming your auth/RLS setup handles isolation, 
        // or we fetch it from the user metadata/table if explicit fitlering is needed above RLS.
        // For now, RLS on the table should handle `using (tenant_id = get_tenant_id())`
        // So we just select *

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');

        let query = supabase
            .from('tenant_time_off')
            .select('*')
            .order('start_time', { ascending: true });

        if (from) {
            query = query.gte('end_time', from);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tenant closures:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get tenant_id from context/helper if RLS automation isn't enough for insert?
        // Usually insert needs explicit tenant_id unless there's a trigger or default.
        // Let's assume we need to fetch it or simpler: RLS ensures we can only insert for our tenant
        // but we still need to provide the value in the INSERT statement if the column is not nullable.

        // Fetch tenant id for user
        const { data: tenantData, error: tenantError } = await supabase.rpc('get_tenant_id');
        if (tenantError || !tenantData) {
            console.error('Error getting tenant id:', tenantError);
            return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
        }
        const tenantId = tenantData;

        const body = await request.json();
        const { start_time, end_time, reason } = body;

        if (!start_time || !end_time) {
            return NextResponse.json({ error: 'Missing start_time or end_time' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('tenant_time_off')
            .insert({
                tenant_id: tenantId,
                start_time,
                end_time,
                reason
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating closure:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const { error } = await supabase
            .from('tenant_time_off')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting closure:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
