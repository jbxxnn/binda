'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({
  children,
  initialTenant,
}: {
  children: React.ReactNode;
  initialTenant?: Tenant | null;
}) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant || null);
  const [loading, setLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  const refreshTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTenant(null);
        setLoading(false);
        return;
      }

      // Get tenant from user's profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (userError || !userProfile?.tenant_id) {
        setError('No tenant found for user');
        setTenant(null);
        setLoading(false);
        return;
      }

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userProfile.tenant_id)
        .eq('status', 'active')
        .single();

      if (tenantError) {
        setError(tenantError.message);
        setTenant(null);
      } else {
        setTenant(tenantData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTenant) {
      refreshTenant();
    }
  }, [initialTenant]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
