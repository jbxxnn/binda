import { createClient } from "@supabase/supabase-js";

import { requireServerEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const config = requireServerEnv();

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
