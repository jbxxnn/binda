import { createClient } from '@/lib/supabase/server';
import { UserRole } from './roles';

export interface UserProfile {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Get current user's profile from database
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'name' | 'role'>>,
): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Check if user belongs to a tenant
 */
export async function userBelongsToTenant(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single();

  return !error && !!data;
}
