-- Migration: Fix Appointment Validation Function Columns
-- Cause: Migration 010 renamed staff_time_off columns from start_datetime/end_datetime to start_time/end_time.
-- Fix: Update validate_appointment_time function to reference the correct column names.

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
  v_tenant_timezone TEXT;
  v_local_start_time TIMESTAMP; -- Local time without timezone
  v_local_end_time TIMESTAMP;
BEGIN
  -- Check 1: Ensure end_time > start_time
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  -- Get Tenant Timezone
  SELECT timezone INTO v_tenant_timezone
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- Default to UTC if not found
  IF v_tenant_timezone IS NULL THEN
     v_tenant_timezone := 'UTC'; 
  END IF;

  -- Convert UTC p_start_time to Local Tenant Time
  v_local_start_time := p_start_time AT TIME ZONE v_tenant_timezone;
  v_local_end_time := p_end_time AT TIME ZONE v_tenant_timezone;

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

  -- Check 3: Check if time falls within staff working hours (USING LOCAL TIME)
  v_day_of_week := EXTRACT(DOW FROM v_local_start_time);
  v_start_time := v_local_start_time::TIME;
  v_end_time := v_local_end_time::TIME;

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
  -- FIXED: Using start_time/end_time instead of start_datetime/end_datetime
  SELECT COUNT(*)
  INTO v_time_off_count
  FROM public.staff_time_off
  WHERE staff_id = p_staff_id
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

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
