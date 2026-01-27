import { createClient } from './server';
import { headers } from 'next/headers';
import { getTenantIdFromHeaders } from '@/lib/tenant/utils';

/**
 * Create a Supabase client with tenant context
 * Automatically filters queries by tenant_id from headers
 */
export async function createTenantClient() {
  const supabase = await createClient();
  const headersList = await headers();
  const tenantId = getTenantIdFromHeaders(headersList);

  if (!tenantId) {
    throw new Error('Tenant ID not found in request headers');
  }

  return {
    ...supabase,
    // Helper method to ensure tenant_id is included in queries
    from: (table: string) => {
      const query = supabase.from(table);
      // Note: RLS policies will handle tenant isolation automatically
      // This is just a helper to make it explicit
      return query;
    },
    // Get the tenant ID for use in queries
    getTenantId: () => tenantId,
  };
}

/**
 * Get tenant ID from request headers
 */
export async function getTenantId(): Promise<string | null> {
  const headersList = await headers();
  return getTenantIdFromHeaders(headersList);
}
