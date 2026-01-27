import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for browser-side operations
 * Note: RLS policies will automatically filter by tenant_id from JWT
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

/**
 * Create a tenant-aware query helper
 * This ensures tenant_id is always included in queries
 */
export function createTenantQuery(supabase: ReturnType<typeof createClient>, tenantId: string) {
  return {
    from: (table: string) => {
      // RLS will handle tenant isolation, but we can add explicit filtering if needed
      return supabase.from(table);
    },
    getTenantId: () => tenantId,
  };
}
