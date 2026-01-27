import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/customers
 * List all customers for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching customers:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(customers);
    } catch (error) {
        console.error('Error in GET /api/customers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userProfile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
        }

        const body = await request.json();
        const { name, email, phone } = body;

        // Validation
        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and Phone are required' }, { status: 400 });
        }

        const { data: customer, error } = await supabase
            .from('customers')
            .insert({
                tenant_id: userProfile.tenant_id,
                name,
                email,
                phone,
            })
            .select()
            .single();

        if (error) {
            // Check for unique constraint violation (phone number per tenant)
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 });
            }
            console.error('Error creating customer:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/customers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
