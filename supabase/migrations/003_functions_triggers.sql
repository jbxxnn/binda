-- Binda: Database Functions and Triggers
-- This migration creates helper functions, triggers, and validation logic

-- ============================================================================
-- FUNCTION: Auto-update updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Auto-update updated_at on relevant tables
-- ============================================================================
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_walk_in_queue_updated_at
  BEFORE UPDATE ON walk_in_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Clean expired slot locks
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_slot_locks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.slot_locks
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Validate appointment time ranges
-- Checks for overlapping appointments, working hours, and time-off
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_appointment_time(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_appointment_id UUID DEFAULT NULL -- For updates, exclude current appointment
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_overlapping_count INTEGER;
  v_time_off_count INTEGER;
BEGIN
  -- Check 1: Ensure end_time > start_time
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  -- Check 2: Check for overlapping appointments (excluding current appointment if updating)
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND status != 'cancelled'
    AND (p_appointment_id IS NULL OR id != p_appointment_id)
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  IF v_overlapping_count > 0 THEN
    RAISE EXCEPTION 'Appointment overlaps with existing appointment';
  END IF;

  -- Check 3: Check if time falls within staff working hours
  v_day_of_week := EXTRACT(DOW FROM p_start_time);
  v_start_time := p_start_time::TIME;
  v_end_time := p_end_time::TIME;

  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM public.staff_working_hours
  WHERE staff_id = p_staff_id
    AND day_of_week = v_day_of_week
    AND start_time <= v_start_time
    AND end_time >= v_end_time;

  IF v_overlapping_count = 0 THEN
    RAISE EXCEPTION 'Appointment time is outside staff working hours';
  END IF;

  -- Check 4: Check if time conflicts with staff time-off
  SELECT COUNT(*)
  INTO v_time_off_count
  FROM public.staff_time_off
  WHERE staff_id = p_staff_id
    AND tstzrange(start_datetime, end_datetime) && tstzrange(p_start_time, p_end_time);

  IF v_time_off_count > 0 THEN
    RAISE EXCEPTION 'Appointment time conflicts with staff time-off';
  END IF;

  -- Check 5: Check for active slot locks (excluding the one being converted)
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM public.slot_locks
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND expires_at > NOW()
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  IF v_overlapping_count > 0 THEN
    RAISE EXCEPTION 'Time slot is currently locked by another booking';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Validate appointment before insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_appointment_validity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.validate_appointment_time(
    NEW.tenant_id,
    NEW.staff_id,
    NEW.start_time,
    NEW.end_time,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_before_insert
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_validity();

CREATE TRIGGER validate_appointment_before_update
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time OR OLD.staff_id IS DISTINCT FROM NEW.staff_id)
  EXECUTE FUNCTION check_appointment_validity();

-- ============================================================================
-- FUNCTION: Sync user profile on auth.users insert
-- Creates a user profile in public.users when a new auth user is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Extract tenant_id from user metadata if available
  -- This will be set during signup process
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- If tenant_id is not provided, we'll need to handle it in the application
  -- For now, we'll create the user record but tenant_id must be set via application logic
  IF v_tenant_id IS NULL THEN
    -- Log warning but don't fail - tenant_id will be set by application
    RAISE WARNING 'New user created without tenant_id. Application must set it.';
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (id, tenant_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(v_tenant_id, '00000000-0000-0000-0000-000000000000'::UUID), -- Temporary, must be updated
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTION: Calculate deposit amount
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_deposit(
  p_service_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_deposit_type TEXT;
  v_deposit_value NUMERIC;
  v_price NUMERIC;
  v_deposit_amount NUMERIC;
BEGIN
  SELECT deposit_type, deposit_value, price
  INTO v_deposit_type, v_deposit_value, v_price
  FROM public.services
  WHERE id = p_service_id;

  IF v_deposit_type = 'none' THEN
    RETURN 0;
  ELSIF v_deposit_type = 'fixed' THEN
    RETURN COALESCE(v_deposit_value, 0);
  ELSIF v_deposit_type = 'percentage' THEN
    RETURN (v_price * COALESCE(v_deposit_value, 0) / 100);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get available slots for a service
-- This is a helper function - full slot generation will be in application code
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_staff_available_time_ranges(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_tenant_timezone TEXT;
BEGIN
  -- Get tenant timezone
  SELECT timezone INTO v_tenant_timezone
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- Get day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date::TIMESTAMPTZ);

  -- Return working hours for the day, converted to timestamptz
  RETURN QUERY
  SELECT
    (p_date + swh.start_time)::TIMESTAMPTZ AS start_time,
    (p_date + swh.end_time)::TIMESTAMPTZ AS end_time
  FROM public.staff_working_hours swh
  WHERE swh.staff_id = p_staff_id
    AND swh.day_of_week = v_day_of_week
  ORDER BY swh.start_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Check if time slot is available
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_slot_available(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Check for conflicting appointments
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND status != 'cancelled'
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  IF v_conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check for active slot locks
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.slot_locks
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND expires_at > NOW()
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  IF v_conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates updated_at timestamp';
COMMENT ON FUNCTION public.cleanup_expired_slot_locks() IS 'Removes expired slot locks - should be called periodically';
COMMENT ON FUNCTION public.validate_appointment_time(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS 'Validates appointment time against working hours, time-off, and conflicts';
COMMENT ON FUNCTION public.check_appointment_validity() IS 'Trigger function that validates appointments before insert/update';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile when new auth user is created';
COMMENT ON FUNCTION public.calculate_deposit(UUID) IS 'Calculates deposit amount based on service settings';
COMMENT ON FUNCTION public.get_staff_available_time_ranges(UUID, UUID, DATE) IS 'Returns available time ranges for staff on a given date';
COMMENT ON FUNCTION public.is_slot_available(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Checks if a time slot is available (no conflicts)';
