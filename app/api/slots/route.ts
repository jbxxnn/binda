import { NextRequest, NextResponse } from 'next/server';
import { generateSlots } from '@/lib/booking/slot-generator';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date');
        const serviceId = searchParams.get('serviceId');
        const staffId = searchParams.get('staffId');

        if (!date || !serviceId) {
            return NextResponse.json({ error: 'Missing date or serviceId' }, { status: 400 });
        }

        // 1. Try to get Tenant ID from authenticated user (Admin Dashboard)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let tenantId: string | null = null;
        let timezone = 'UTC';

        if (user) {
            const { data: userProfile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
            tenantId = userProfile?.tenant_id;
        }

        // 2. If no user, try to get Tenant ID from Service (Public Booking)
        if (!tenantId && serviceId) {
            const adminClient = createAdminClient();
            const { data: service } = await adminClient
                .from('services')
                .select('tenant_id')
                .eq('id', serviceId)
                .single();

            if (service) {
                tenantId = service.tenant_id;
            }
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Unauthorized or Tenant Context Missing' }, { status: 401 });
        }

        // 3. Fetch Tenant Timezone (using Admin Client to be safe, or just use the logic below)
        // Since we might be public, use Admin Client for tenant config
        const adminClient = createAdminClient();
        const { data: tenant } = await adminClient
            .from('tenants')
            .select('timezone')
            .eq('id', tenantId)
            .single();

        if (tenant) timezone = tenant.timezone;

        const slots = await generateSlots(
            tenantId,
            serviceId,
            date,
            timezone,
            staffId || undefined
        );

        return NextResponse.json(slots);

    } catch (error) {
        console.error('Error generating slots:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
