import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeTenantSlug, isValidTenantSlug } from '@/lib/tenant/utils';

/**
 * GET /api/tenants
 * Get current user's tenant
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userProfile.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tenants
 * Create a new tenant (for onboarding)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, timezone = 'UTC', currency = 'NGN' } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 },
      );
    }

    // Normalize and validate slug
    const normalizedSlug = normalizeTenantSlug(slug);
    if (!isValidTenantSlug(normalizedSlug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 },
      );
    }

    // Check if slug is already taken (Public read access should allow this, or use admin)
    const adminSupabase = createAdminClient();
    const { data: existingTenant } = await adminSupabase
      .from('tenants')
      .select('id')
      .eq('slug', normalizedSlug)
      .single();

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 409 },
      );
    }

    // Create tenant using Admin Client (Bypass RLS)
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert({
        name,
        slug: normalizedSlug,
        timezone,
        currency,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error('Error creating tenant:', tenantError);
      return NextResponse.json(
        { error: 'Failed to create tenant: ' + (tenantError?.message || 'Unknown error') },
        { status: 500 },
      );
    }

    // Update user's tenant_id
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        tenant_id: tenant.id,
        role: 'owner'
      })
      .eq('id', user.id);

    if (userUpdateError) {
      console.error('Error updating user:', userUpdateError);
      // Tenant was created but user update failed - this is a problem
      // In production, you might want to rollback or handle this differently
    }

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tenants
 * Update tenant details (settings)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and role
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userProfile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Ensure user is owner or admin
    if (userProfile.role !== 'owner' && userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, timezone, currency } = body;

    // Validate input
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Update tenant using Admin Client (Bypass RLS)
    const adminSupabase = createAdminClient();

    const { data: updatedTenant, error: updateError } = await adminSupabase
      .from('tenants')
      .update({
        name,
        timezone,
        currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProfile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tenant:', updateError);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
