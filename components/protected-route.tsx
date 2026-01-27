'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole, hasPermission } from '@/lib/auth/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: keyof import('@/lib/auth/roles').UserPermissions;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push(redirectTo);
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          router.push(redirectTo);
          return;
        }

        // Check tenant access
        if (!profile.tenant_id) {
          router.push(redirectTo);
          return;
        }

        // Check role requirement
        if (requiredRole) {
          const roleHierarchy: Record<UserRole, number> = {
            owner: 4,
            admin: 3,
            staff: 2,
            customer: 1,
          };

          const userRoleLevel = roleHierarchy[profile.role as UserRole] || 0;
          const requiredRoleLevel = roleHierarchy[requiredRole];

          if (userRoleLevel < requiredRoleLevel) {
            router.push(redirectTo);
            return;
          }
        }

        // Check permission requirement
        if (requiredPermission) {
          if (!hasPermission(profile.role as UserRole, requiredPermission)) {
            router.push(redirectTo);
            return;
          }
        }

        setAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole, requiredPermission, redirectTo, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
