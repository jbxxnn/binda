-- Migration: Fix get_user_role resolution
-- Reason: JWT does not reliably contain the 'role' claim (or it's nested).
-- Source of truth is public.users table.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Look up role from public.users table for the authenticated user
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
