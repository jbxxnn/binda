-- Migration: Fix users tenant_id constraint
-- Reason: Signups for new tenant owners don't have a tenant_id yet

-- 1. Make tenant_id nullable in users table
ALTER TABLE public.users ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Update the trigger function to handle NULL tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Extract tenant_id from user metadata if available
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- Insert into public.users
  INSERT INTO public.users (id, tenant_id, name, email, role)
  VALUES (
    NEW.id,
    v_tenant_id, -- Can be NULL now
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
