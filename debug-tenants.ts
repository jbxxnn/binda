
import { createClient } from '@supabase/supabase-js';

// Hardcoding for debug speed - read from .env.local previously
const SUPABASE_URL = 'https://unhzfvwtopsyptdomqoh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHpmdnd0b3BzeXB0ZG9tcW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI0ODgwNSwiZXhwIjoyMDg0ODI0ODA1fQ.6q_pTLi6bUSRB4PPKXplIFVlbRvhYvPOHji33sHujA8';

const supabase = createClient(
    SUPABASE_URL,
    SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function listTenants() {
    console.log('Fetching tenants...');
    const { data, error } = await supabase.from('tenants').select('id, name, slug');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Tenants:', data);
    }
}

listTenants();
