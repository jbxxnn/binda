import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantSlugFromUrl } from '@/lib/tenant/utils';

/**
 * POST /api/auth/signup
 * Handle user signup with tenant assignment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { email, password, name, tenantSlug } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Try to get tenant slug from URL if not provided
    const urlTenantSlug = tenantSlug || getTenantSlugFromUrl(request.url);
    let tenantId: string | null = null;

    // If tenant slug is provided, get tenant ID
    if (urlTenantSlug) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', urlTenantSlug)
        .eq('status', 'active')
        .single();

      if (!tenantError && tenant) {
        tenantId = tenant.id;
      }
    }

    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/confirm`,
        data: {
          name: name || email.split('@')[0],
          tenant_id: tenantId, // This will be in user metadata
          role: tenantId ? 'customer' : 'owner', // If no tenant, they'll be owner of new tenant
        },
      },
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 },
      );
    }

    // The database trigger (handle_new_user) will create the user profile
    // But we need to ensure tenant_id is set if we have it
    if (tenantId) {
      // Wait a bit for the trigger to create the user profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update user profile with tenant_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ tenant_id: tenantId })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating user tenant:', updateError);
        // Don't fail the signup, but log the error
      } else {
        // Update JWT with tenant_id for RLS policies
        await supabase.auth.updateUser({
          data: {
            tenant_id: tenantId,
            role: 'customer',
          },
        });
      }
    }

    return NextResponse.json({
      user: authData.user,
      hasTenant: !!tenantId,
      needsOnboarding: !tenantId,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
