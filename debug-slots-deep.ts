
import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS
const SUPABASE_URL = 'https://unhzfvwtopsyptdomqoh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHpmdnd0b3BzeXB0ZG9tcW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI0ODgwNSwiZXhwIjoyMDg0ODI0ODA1fQ.6q_pTLi6bUSRB4PPKXplIFVlbRvhYvPOHji33sHujA8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function debugSlotsDeep() {
    console.log('--- START DEBUG ---');

    // 1. Fetch ALL Services with tenant_id
    const { data: services, error: serviceError } = await supabase.from('services').select('*');
    if (serviceError) return console.error('Error fetching services:', serviceError);
    if (!services || services.length === 0) return console.log('No services found at all.');

    console.log(`Found ${services.length} services.`);

    for (const service of services) {
        console.log(`\n------------------------------`);
        console.log(`[Service] ${service.name}\n  ID: ${service.id}\n  Tenant: ${service.tenant_id}\n  Duration: ${service.duration_minutes}m`);

        const { data: links } = await supabase.from('service_staff').select('staff_id').eq('service_id', service.id);
        const staffIds = links?.map(l => l.staff_id) || [];

        if (staffIds.length === 0) {
            console.log(`  -> No staff assigned.`);
            continue;
        }

        console.log(`  -> Assigned Staff IDs: ${staffIds.join(', ')}`);
    }
    console.log('\n--- END DEBUG ---');
}

debugSlotsDeep();
