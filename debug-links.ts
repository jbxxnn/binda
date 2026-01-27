
import { createClient } from '@supabase/supabase-js';

// Hardcoded for debug
const SUPABASE_URL = 'https://unhzfvwtopsyptdomqoh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHpmdnd0b3BzeXB0ZG9tcW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI0ODgwNSwiZXhwIjoyMDg0ODI0ODA1fQ.6q_pTLi6bUSRB4PPKXplIFVlbRvhYvPOHji33sHujA8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkLinks() {
    console.log('Checking Service-Staff Links...');
    const { data: links, error } = await supabase.from('service_staff').select('*');
    if (error) console.error(error);
    else console.log('Links:', links);

    console.log('Checking Staff Working Hours...');
    const { data: hours, error: hError } = await supabase.from('staff_working_hours').select('*');
    if (hError) console.error(hError);
    else console.log('Hours:', hours);
}

checkLinks();
