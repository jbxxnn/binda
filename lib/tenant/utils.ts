/**
 * Tenant Utilities
 * Functions for extracting and validating tenant information from URLs
 */

/**
 * Extract tenant slug from URL
 * Supports two patterns:
 * 1. Subdomain: tenant-slug.yourdomain.com
 * 2. Path: yourdomain.com/tenant-slug/...
 */
export function getTenantSlugFromUrl(url: string | URL): string | null {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    // Check for subdomain pattern (e.g., tenant-slug.localhost:3000 or tenant-slug.example.com)
    const subdomainMatch = hostname.match(/^([^.]+)\./);
    if (subdomainMatch && subdomainMatch[1] !== 'www') {
      return subdomainMatch[1];
    }

    // Check for path pattern (e.g., /tenant-slug/...)
    const pathMatch = pathname.match(/^\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      // Exclude common paths that aren't tenant slugs
      const excludedPaths = ['auth', 'api', 'dashboard', 'book', 'admin', '_next', 'favicon.ico'];
      if (!excludedPaths.includes(pathMatch[1])) {
        return pathMatch[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract tenant slug from request headers (set by middleware)
 */
export function getTenantSlugFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-slug');
}

/**
 * Extract tenant ID from request headers (set by middleware)
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-id');
}

/**
 * Validate tenant slug format
 * Slug should be lowercase, alphanumeric with hyphens, 3-50 characters
 */
export function isValidTenantSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]{3,50}$/;
  return slugRegex.test(slug) && !slug.startsWith('-') && !slug.endsWith('-');
}

/**
 * Normalize tenant slug (lowercase, replace spaces with hyphens, etc.)
 */
export function normalizeTenantSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if a path should bypass tenant resolution
 * (e.g., API routes, auth routes, static files)
 */
export function shouldBypassTenantResolution(pathname: string): boolean {
  const bypassPaths = [
    '/api/',
    '/auth/',
    '/_next/',
    '/favicon.ico',
    '/opengraph-image.png',
    '/twitter-image.png',
  ];

  return bypassPaths.some((path) => pathname.startsWith(path));
}
