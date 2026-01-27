-- Migration: Update Appointment Status Constraint
-- Goal: Allow 'pending_payment' as a valid status for appointments.

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'pending_payment'));
