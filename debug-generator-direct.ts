
// Set Env Vars FIRST
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://unhzfvwtopsyptdomqoh.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHpmdnd0b3BzeXB0ZG9tcW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI0ODgwNSwiZXhwIjoyMDg0ODI0ODA1fQ.6q_pTLi6bUSRB4PPKXplIFVlbRvhYvPOHji33sHujA8';

import { generateSlots } from './lib/booking/slot-generator';

async function testGenerator() {
    console.log('--- START GENERATOR TEST ---');

    const tenantId = 'bdc0b824-2c5f-4582-8d69-9a3d445cf80f';
    const serviceId = 'c35ff213-0b58-48ca-8ad9-2ff27ffc41fc'; // Haircut
    const staffId = 'ee2bda07-8cc4-4e98-8d62-80f01879a949';   // Mary
    const date = '2026-01-27'; // Tue

    try {
        const slots = await generateSlots(
            tenantId,
            serviceId,
            date,
            'UTC', // timezone
            staffId
        );

        console.log(`Generated ${slots.length} slots for ${date}:`);
        slots.forEach(s => console.log(`  - ${s.start} -> ${s.end} (${s.available ? 'AVAILABLE' : 'BOOKED'})`));

    } catch (e) {
        console.error('Error generating slots:', e);
    }
    console.log('--- END GENERATOR TEST ---');
}

testGenerator();
