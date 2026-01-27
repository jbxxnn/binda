-- Binda: Initial Database Schema
-- This migration creates all core tables for the multi-tenant booking system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'admin', 'staff', 'customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- ============================================================================
-- STAFF TABLE
-- ============================================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_is_active ON staff(is_active);
CREATE INDEX idx_staff_tenant_active ON staff(tenant_id, is_active);

-- ============================================================================
-- STAFF WORKING HOURS TABLE
-- ============================================================================
CREATE TABLE staff_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_staff_working_hours_staff_id ON staff_working_hours(staff_id);
CREATE INDEX idx_staff_working_hours_day ON staff_working_hours(staff_id, day_of_week);

-- ============================================================================
-- STAFF TIME OFF TABLE
-- ============================================================================
CREATE TABLE staff_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_datetime_range CHECK (end_datetime > start_datetime)
);

CREATE INDEX idx_staff_time_off_staff_id ON staff_time_off(staff_id);
CREATE INDEX idx_staff_time_off_start ON staff_time_off(start_datetime);
CREATE INDEX idx_staff_time_off_end ON staff_time_off(end_datetime);
-- GiST index for efficient time range overlap queries
CREATE INDEX idx_staff_time_off_range ON staff_time_off USING GIST (staff_id, tstzrange(start_datetime, end_datetime));

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  deposit_type TEXT NOT NULL DEFAULT 'none' CHECK (deposit_type IN ('none', 'fixed', 'percentage')),
  deposit_value NUMERIC(10, 2) CHECK (deposit_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_services_tenant_active ON services(tenant_id, is_active);

-- ============================================================================
-- SERVICE STAFF JUNCTION TABLE
-- ============================================================================
CREATE TABLE service_staff (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, staff_id)
);

CREATE INDEX idx_service_staff_service_id ON service_staff(service_id);
CREATE INDEX idx_service_staff_staff_id ON service_staff(staff_id);

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_tenant_phone UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);

-- ============================================================================
-- PAYMENTS TABLE (Created before appointments due to foreign key dependency)
-- ============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID, -- Will add foreign key constraint after appointments table is created
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  reference TEXT NOT NULL UNIQUE,
  paystack_reference TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);

-- ============================================================================
-- APPOINTMENTS TABLE (Most Critical)
-- ============================================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  booking_source TEXT NOT NULL DEFAULT 'online' CHECK (booking_source IN ('online', 'walk_in', 'admin', 'whatsapp', 'instagram')),
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  payment_id UUID REFERENCES payments(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_appointment_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_service_id ON appointments(service_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_end_time ON appointments(end_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_tenant_status ON appointments(tenant_id, status);
-- GiST index for efficient time range overlap queries
CREATE INDEX idx_appointments_time_range ON appointments USING GIST (tenant_id, staff_id, tstzrange(start_time, end_time));

-- ============================================================================
-- WALK IN QUEUE TABLE
-- ============================================================================
CREATE TABLE walk_in_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  requested_service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'cancelled')),
  assigned_staff_id UUID REFERENCES staff(id),
  assigned_appointment_id UUID REFERENCES appointments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_walk_in_queue_tenant_id ON walk_in_queue(tenant_id);
CREATE INDEX idx_walk_in_queue_status ON walk_in_queue(status);
CREATE INDEX idx_walk_in_queue_created_at ON walk_in_queue(created_at);
CREATE INDEX idx_walk_in_queue_tenant_status ON walk_in_queue(tenant_id, status);

-- ============================================================================
-- SLOT LOCKS TABLE
-- ============================================================================
CREATE TABLE slot_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_slot_lock_time_range CHECK (end_time > start_time),
  CONSTRAINT check_slot_lock_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_slot_locks_tenant_id ON slot_locks(tenant_id);
CREATE INDEX idx_slot_locks_expires_at ON slot_locks(expires_at);
CREATE INDEX idx_slot_locks_session_id ON slot_locks(session_id);
-- GiST index for efficient time range overlap queries
CREATE INDEX idx_slot_locks_time_range ON slot_locks USING GIST (tenant_id, staff_id, tstzrange(start_time, end_time));

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (After all tables are created)
-- ============================================================================
-- Add foreign key from payments to appointments (circular dependency resolved)
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_appointment_id
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE tenants IS 'Represents one salon/business';
COMMENT ON TABLE users IS 'User accounts linked to Supabase auth.users';
COMMENT ON TABLE staff IS 'Staff members who provide services';
COMMENT ON TABLE staff_working_hours IS 'Weekly recurring availability for staff';
COMMENT ON TABLE staff_time_off IS 'Time-off periods that override working hours';
COMMENT ON TABLE services IS 'Services offered by tenants';
COMMENT ON TABLE service_staff IS 'Many-to-many mapping of services to staff';
COMMENT ON TABLE customers IS 'Customers who book appointments';
COMMENT ON TABLE appointments IS 'All appointments including walk-ins - blocks time identically';
COMMENT ON TABLE walk_in_queue IS 'Queue of walk-in customers waiting for service';
COMMENT ON TABLE slot_locks IS 'Temporary locks to prevent double-booking during checkout';
COMMENT ON TABLE payments IS 'Payment records from Paystack';
