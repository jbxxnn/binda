import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/staff
 * List all staff for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: staff, error } = await supabase
            .from('staff')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching staff:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(staff);
    } catch (error) {
        console.error('Error in GET /api/staff:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/staff
 * Create a new staff member
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get tenant_id
        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (!userProfile?.tenant_id) {
            return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
        }

        const body = await request.json();
        const { name, email, phone, is_active = true } = body;

        // Validation
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const { data: staff, error } = await supabase
            .from('staff')
            .insert({
                tenant_id: userProfile.tenant_id,
                name,
                email,
                phone,
                is_active
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating staff:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Initialize default working hours for the new staff (Mon-Fri, 9-5)
        // 0 = Sunday, 1 = Monday, ...
        const defaultHours = [1, 2, 3, 4, 5].map(day => ({
            staff_id: staff.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '17:00'
        }));

        const { error: hoursError } = await supabase
            .from('staff_working_hours')
            .insert(defaultHours);

        if (hoursError) {
            console.warn('Failed to set default working hours:', hoursError);
            // Don't fail the request, but log it
        }

        return NextResponse.json(staff, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/staff:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
