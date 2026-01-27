import { createClient } from '@supabase/supabase-js';

// Note: This client has FULL ACCESS (bypasses RLS). Use with caution.
// Only use in Server Components or Server Actions/API Routes. Never client-side.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
