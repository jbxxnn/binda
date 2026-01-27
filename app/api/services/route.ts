import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/services
 * List all services for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get tenant_id from user profile (handled by RLS generally, but good to have context)
        // Actually, for RLS to work with `get_tenant_id()` we need to rely on the policy 
        // referencing `public.users`. 
        // The previous fix updated `get_tenant_id` to query `public.users` directly.
        // So simple select from services should work and be scoped.

        const { data: services, error } = await supabase
            .from('services')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching services:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(services);
    } catch (error) {
        console.error('Error in GET /api/services:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/services
 * Create a new service
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // We need the tenant_id to insert. 
        // RLS policies for INSERT usually check `tenant_id = get_tenant_id()`.
        // But we also need to PROVIDE the tenant_id in the insert payload because the column is Not Null.

        // Fetch user's tenant_id
        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userProfile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
        }

        const body = await request.json();
        const {
            name,
            description,
            duration_minutes,
            price,
            buffer_before_minutes = 0,
            buffer_after_minutes = 0,
            deposit_type = 'none',
            deposit_value = 0,
            is_active = true
        } = body;

        // Validation
        if (!name || duration_minutes === undefined || price === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data: service, error } = await supabase
            .from('services')
            .insert({
                tenant_id: userProfile.tenant_id,
                name,
                description,
                duration_minutes,
                price,
                buffer_before_minutes,
                buffer_after_minutes,
                deposit_type,
                deposit_value,
                is_active
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating service:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(service, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/services:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
