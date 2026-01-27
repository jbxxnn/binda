import { createClient } from '@/lib/supabase/server';

/**
 * Update user's JWT token with tenant_id
 * This is necessary for RLS policies to work correctly
 */
export async function updateUserJWTWithTenant() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get user's tenant_id
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (!userProfile?.tenant_id) {
    return null;
  }

  // Update user metadata with tenant_id and role
  // This will be included in the JWT token
  const { error } = await supabase.auth.updateUser({
    data: {
      tenant_id: userProfile.tenant_id,
      role: userProfile.role,
    },
  });

  if (error) {
    console.error('Error updating user JWT:', error);
    return null;
  }

  return userProfile;
}

/**
 * Get tenant_id from current user's JWT
 */
export async function getTenantIdFromJWT(): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Try to get from user metadata first
  const tenantId = user.user_metadata?.tenant_id;
  if (tenantId) {
    return tenantId;
  }

  // Fallback to database lookup
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return userProfile?.tenant_id || null;
}
