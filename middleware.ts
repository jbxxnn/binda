import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isAppSubdomain = hostname.startsWith('app.');
  
  // Handle app subdomain routing
  if (isAppSubdomain) {
    // For app subdomain, rewrite to /app/* routes
    const url = request.nextUrl.clone();
    const pathname = url.pathname;
    
    // If accessing root of app subdomain, redirect to dashboard
    if (pathname === '/') {
      url.pathname = '/app/dashboard';
      return NextResponse.redirect(url);
    }
    
    // Rewrite app subdomain requests to /app/* routes
    if (!pathname.startsWith('/app/')) {
      url.pathname = `/app${pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  
  // Continue with Supabase session handling
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
