import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tenants/[slug]
 * Get tenant by slug (public endpoint for booking pages)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug, timezone, currency, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !tenant) {
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
