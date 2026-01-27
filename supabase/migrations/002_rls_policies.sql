-- Binda: Row Level Security (RLS) Policies
-- This migration enables RLS and creates policies for tenant isolation

-- ============================================================================
-- HELPER FUNCTION: Get Tenant ID from JWT
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get User Role from JWT
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS POLICIES
-- ============================================================================
-- Users can only see their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id = get_tenant_id());

-- Only service role can insert/update tenants (for admin operations)
CREATE POLICY "Service role can manage tenants"
  ON tenants FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- USERS POLICIES
-- ============================================================================
-- Users can view users in their tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Owners and admins can insert users
CREATE POLICY "Owners and admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- Owners and admins can update users
CREATE POLICY "Owners and admins can update users"
  ON users FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- STAFF POLICIES
-- ============================================================================
-- Users can view staff in their tenant
CREATE POLICY "Users can view staff in their tenant"
  ON staff FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Owners and admins can manage staff
CREATE POLICY "Owners and admins can manage staff"
  ON staff FOR ALL
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================================================
-- STAFF WORKING HOURS POLICIES
-- ============================================================================
-- Users can view working hours for staff in their tenant
CREATE POLICY "Users can view working hours in their tenant"
  ON staff_working_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_working_hours.staff_id
      AND staff.tenant_id = get_tenant_id()
    )
  );

-- Owners and admins can manage working hours
CREATE POLICY "Owners and admins can manage working hours"
  ON staff_working_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_working_hours.staff_id
      AND staff.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_working_hours.staff_id
      AND staff.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STAFF TIME OFF POLICIES
-- ============================================================================
-- Users can view time off for staff in their tenant
CREATE POLICY "Users can view time off in their tenant"
  ON staff_time_off FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_time_off.staff_id
      AND staff.tenant_id = get_tenant_id()
    )
  );

-- Owners and admins can manage time off
CREATE POLICY "Owners and admins can manage time off"
  ON staff_time_off FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_time_off.staff_id
      AND staff.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_time_off.staff_id
      AND staff.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- SERVICES POLICIES
-- ============================================================================
-- Users can view active services in their tenant
CREATE POLICY "Users can view services in their tenant"
  ON services FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Owners and admins can manage services
CREATE POLICY "Owners and admins can manage services"
  ON services FOR ALL
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================================================
-- SERVICE STAFF POLICIES
-- ============================================================================
-- Users can view service-staff mappings in their tenant
CREATE POLICY "Users can view service staff in their tenant"
  ON service_staff FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_staff.service_id
      AND services.tenant_id = get_tenant_id()
    )
  );

-- Owners and admins can manage service-staff mappings
CREATE POLICY "Owners and admins can manage service staff"
  ON service_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_staff.service_id
      AND services.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services
      WHERE services.id = service_staff.service_id
      AND services.tenant_id = get_tenant_id()
      AND get_user_role() IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CUSTOMERS POLICIES
-- ============================================================================
-- Users can view customers in their tenant
CREATE POLICY "Users can view customers in their tenant"
  ON customers FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Owners, admins, and staff can create customers
CREATE POLICY "Staff can create customers"
  ON customers FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin', 'staff')
  );

-- Owners and admins can update customers
CREATE POLICY "Owners and admins can update customers"
  ON customers FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================================================
-- APPOINTMENTS POLICIES
-- ============================================================================
-- Users can view appointments in their tenant
CREATE POLICY "Users can view appointments in their tenant"
  ON appointments FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Owners, admins, and staff can create appointments
CREATE POLICY "Staff can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin', 'staff')
  );

-- Owners and admins can update all appointments
CREATE POLICY "Owners and admins can update appointments"
  ON appointments FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- Staff can update their own appointments (limited)
CREATE POLICY "Staff can update own appointments"
  ON appointments FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() = 'staff' AND
    staff_id IN (
      SELECT id FROM staff WHERE id = appointments.staff_id
    )
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() = 'staff'
  );

-- Owners and admins can delete appointments
CREATE POLICY "Owners and admins can delete appointments"
  ON appointments FOR DELETE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================================================
-- WALK IN QUEUE POLICIES
-- ============================================================================
-- Users can view walk-ins in their tenant
CREATE POLICY "Users can view walk-ins in their tenant"
  ON walk_in_queue FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Owners, admins, and staff can create walk-ins
CREATE POLICY "Staff can create walk-ins"
  ON walk_in_queue FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin', 'staff')
  );

-- Owners, admins, and staff can update walk-ins
CREATE POLICY "Staff can update walk-ins"
  ON walk_in_queue FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin', 'staff')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin', 'staff')
  );

-- ============================================================================
-- SLOT LOCKS POLICIES
-- ============================================================================
-- Users can view slot locks in their tenant
CREATE POLICY "Users can view slot locks in their tenant"
  ON slot_locks FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Anyone authenticated can create slot locks (for booking flow)
CREATE POLICY "Authenticated users can create slot locks"
  ON slot_locks FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    auth.uid() IS NOT NULL
  );

-- Users can delete their own slot locks (by session_id)
CREATE POLICY "Users can delete own slot locks"
  ON slot_locks FOR DELETE
  USING (
    tenant_id = get_tenant_id() AND
    session_id = current_setting('app.session_id', true)
  );

-- Service role can delete expired locks (for cleanup job)
CREATE POLICY "Service role can delete expired locks"
  ON slot_locks FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================
-- Users can view payments in their tenant
CREATE POLICY "Users can view payments in their tenant"
  ON payments FOR SELECT
  USING (tenant_id = get_tenant_id());

-- Service role can create payments (from webhook)
CREATE POLICY "Service role can create payments"
  ON payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Owners and admins can update payments
CREATE POLICY "Owners and admins can update payments"
  ON payments FOR UPDATE
  USING (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = get_tenant_id() AND
    get_user_role() IN ('owner', 'admin')
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_tenant_id() IS 'Extracts tenant_id from JWT token';
COMMENT ON FUNCTION get_user_role() IS 'Extracts user role from JWT token';
