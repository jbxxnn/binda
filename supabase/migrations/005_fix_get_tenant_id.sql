-- Migration: Fix get_tenant_id resolution
-- Reason: JWT does not contain tenant_id at top level, and client updates might be unreliable.
-- Source of truth is public.users table.

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Look up tenant_id from public.users table for the authenticated user
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
