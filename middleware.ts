import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getTenantSlugFromUrl, shouldBypassTenantResolution } from '@/lib/tenant/utils';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass tenant resolution for certain paths
  if (shouldBypassTenantResolution(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client for server-side operations
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Extract tenant slug from URL
  const tenantSlug = getTenantSlugFromUrl(request.url);

  // If no tenant slug found, continue without tenant context
  // (This allows for tenant-agnostic routes like auth pages)
  if (!tenantSlug) {
    return response;
  }

  // Fetch tenant from database
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug, status')
    .eq('slug', tenantSlug)
    .single();

  // If tenant doesn't exist or is suspended, redirect or show error
  if (error || !tenant) {
    // For now, allow the request to continue
    // You might want to redirect to a 404 page or error page
    return response;
  }

  if (tenant.status !== 'active') {
    // Tenant exists but is suspended
    // You might want to redirect to a suspended page
    return response;
  }

  // Set tenant information in request headers for use in server components and API routes
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);
  response.headers.set('x-tenant-name', tenant.name);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
