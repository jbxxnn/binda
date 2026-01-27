# Binda — Detailed Implementation Plan

This document outlines the step-by-step implementation plan for building the Binda multi-tenant booking system.

---

## 📋 Current State

✅ **Completed:**
- Next.js project setup
- Supabase authentication integration
- Basic auth pages (login, sign-up, password reset)
- UI component library (shadcn/ui)

❌ **To Build:**
- Database schema and migrations
- Multi-tenant architecture
- Booking engine
- Payment integration
- Admin dashboard
- Customer booking interface
- Walk-in management
- All core features

---

## 🎯 Implementation Phases

### Phase 1: Foundation & Database Setup
**Goal:** Establish the database foundation with all tables, RLS policies, and indexes.

### Phase 2: Multi-Tenant Architecture
**Goal:** Implement tenant isolation, user management, and tenant context throughout the app.

### Phase 3: Core Business Logic
**Goal:** Build services, staff, and customer management with working hours and time-off.

### Phase 4: Time-Slot Generation Engine
**Goal:** Implement the sophisticated slot generation algorithm with all edge cases.

### Phase 5: Booking System
**Goal:** Build appointment booking with slot locking, deposits, and payment integration.

### Phase 6: Admin Dashboard
**Goal:** Create admin interface for managing calendar, appointments, and walk-ins.

### Phase 7: Customer Booking Interface
**Goal:** Build public-facing booking page for customers.

### Phase 8: Walk-In Management
**Goal:** Implement walk-in queue and assignment system.

### Phase 9: Notifications & Polish
**Goal:** Add email notifications, error handling, UX improvements, and complete Admin Management UIs.

---

## 📝 Detailed Task Breakdown

---

## Phase 1: Foundation & Database Setup

### 1.1 Database Schema Creation
**Priority:** Critical  
**Estimated Time:** 2-3 days

#### Tasks:
1. **Create Supabase migration files**
   - Set up migration structure
   - Create `supabase/migrations/` directory

2. **Create `tenants` table**
   ```sql
   - id (uuid, primary key)
   - name (text)
   - slug (text, unique)
   - timezone (text, default 'UTC')
   - currency (text, default 'NGN')
   - status (text: 'active' | 'suspended' | 'trial')
   - created_at (timestamptz)
   - updated_at (timestamptz)
   ```
   - Add indexes: `slug`, `status`

3. **Create `users` table** (extends Supabase auth.users)
   ```sql
   - id (uuid, primary key, references auth.users)
   - tenant_id (uuid, references tenants)
   - name (text)
   - email (text, unique)
   - role (text: 'owner' | 'admin' | 'staff' | 'customer')
   - created_at (timestamptz)
   - updated_at (timestamptz)
   ```
   - Add indexes: `tenant_id`, `email`, `role`

4. **Create `staff` table**
   ```sql
   - id (uuid, primary key)
   - tenant_id (uuid, references tenants)
   - name (text)
   - email (text)
   - phone (text)
   - is_active (boolean, default true)
   - created_at (timestamptz)
   - updated_at (timestamptz)
   ```
   - Add indexes: `tenant_id`, `is_active`

5. **Create `staff_working_hours` table**
   ```sql
   - id (uuid, primary key)
   - staff_id (uuid, references staff)
   - day_of_week (int, 0-6)
   - start_time (time)
   - end_time (time)
   - created_at (timestamptz)
   ```
   - Add indexes: `staff_id`, `day_of_week`
   - Add constraint: `end_time > start_time`

6. **Create `staff_time_off` table**
   ```sql
   - id (uuid, primary key)
   - staff_id (uuid, references staff)
   - start_datetime (timestamptz)
   - end_datetime (timestamptz)
   - reason (text, nullable)
   - created_at (timestamptz)
   ```
   - Add indexes: `staff_id`, `start_datetime`, `end_datetime`
   - Add GiST index for time range queries
   - Add constraint: `end_datetime > start_datetime`

7. **Create `services` table**
   ```sql
   - id (uuid, primary key)
   - tenant_id (uuid, references tenants)
   - name (text)
   - description (text, nullable)
   - duration_minutes (int)
   - buffer_before_minutes (int, default 0)
   - buffer_after_minutes (int, default 0)
   - price (numeric)
   - deposit_type (text: 'none' | 'fixed' | 'percentage')
   - deposit_value (numeric, nullable)
   - is_active (boolean, default true)
   - created_at (timestamptz)
   - updated_at (timestamptz)
   ```
   - Add indexes: `tenant_id`, `is_active`
   - Add constraint: `deposit_value >= 0`

8. **Create `service_staff` junction table**
   ```sql
   - service_id (uuid, references services)
   - staff_id (uuid, references staff)
   - Primary key: (service_id, staff_id)
   ```
   - Add indexes: `service_id`, `staff_id`

9. **Create `customers` table**
   ```sql
   - id (uuid, primary key)
   - tenant_id (uuid, references tenants)
   - name (text)
   - phone (text)
   - email (text, nullable)
   - created_at (timestamptz)
   - updated_at (timestamptz)
   ```
   - Add indexes: `tenant_id`, `phone`, `email`
   - Add unique constraint: `(tenant_id, phone)`

10. **Create `appointments` table**
    ```sql
    - id (uuid, primary key)
    - tenant_id (uuid, references tenants)
    - staff_id (uuid, references staff)
    - service_id (uuid, references services)
    - customer_id (uuid, references customers)
    - start_time (timestamptz)
    - end_time (timestamptz)
    - status (text: 'confirmed' | 'cancelled' | 'completed' | 'no_show')
    - booking_source (text: 'online' | 'walk_in' | 'admin' | 'whatsapp' | 'instagram')
    - deposit_paid (boolean, default false)
    - payment_id (uuid, nullable, references payments)
    - notes (text, nullable)
    - created_at (timestamptz)
    - updated_at (timestamptz)
    ```
    - Add indexes: `tenant_id`, `staff_id`, `customer_id`, `start_time`, `end_time`, `status`
    - Add GiST index for time range overlap queries: `(tenant_id, tstzrange(start_time, end_time))`
    - Add constraint: `end_time > start_time`

11. **Create `walk_in_queue` table**
    ```sql
    - id (uuid, primary key)
    - tenant_id (uuid, references tenants)
    - customer_name (text)
    - customer_phone (text, nullable)
    - requested_service_id (uuid, references services)
    - status (text: 'waiting' | 'assigned' | 'cancelled')
    - assigned_staff_id (uuid, nullable, references staff)
    - assigned_appointment_id (uuid, nullable, references appointments)
    - created_at (timestamptz)
    - updated_at (timestamptz)
    ```
    - Add indexes: `tenant_id`, `status`, `created_at`

12. **Create `slot_locks` table**
    ```sql
    - id (uuid, primary key)
    - tenant_id (uuid, references tenants)
    - staff_id (uuid, references staff)
    - service_id (uuid, references services)
    - start_time (timestamptz)
    - end_time (timestamptz)
    - expires_at (timestamptz)
    - session_id (text)
    - created_at (timestamptz)
    ```
    - Add indexes: `tenant_id`, `expires_at`, `session_id`
    - Add GiST index for time range queries
    - Add constraint: `expires_at > created_at`

13. **Create `payments` table**
    ```sql
    - id (uuid, primary key)
    - tenant_id (uuid, references tenants)
    - appointment_id (uuid, nullable, references appointments)
    - provider (text: 'paystack')
    - amount (numeric)
    - currency (text)
    - status (text: 'pending' | 'success' | 'failed' | 'refunded')
    - reference (text, unique)
    - paystack_reference (text, nullable)
    - metadata (jsonb, nullable)
    - created_at (timestamptz)
    - updated_at (timestamptz)
    ```
    - Add indexes: `tenant_id`, `appointment_id`, `reference`, `status`

### 1.2 Row Level Security (RLS) Policies
**Priority:** Critical  
**Estimated Time:** 1-2 days

#### Tasks:
1. **Enable RLS on all tables**
   - Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` for each table

2. **Create helper function for tenant context**
   ```sql
   CREATE OR REPLACE FUNCTION get_tenant_id()
   RETURNS uuid AS $$
   SELECT (auth.jwt() ->> 'tenant_id')::uuid;
   $$ LANGUAGE sql STABLE;
   ```

3. **Create RLS policies for each table:**
   - **tenants**: Users can only see their own tenant
   - **users**: Users can only see users in their tenant
   - **staff**: Users can only see staff in their tenant
   - **services**: Users can only see services in their tenant
   - **customers**: Users can only see customers in their tenant
   - **appointments**: Users can only see appointments in their tenant
   - **walk_in_queue**: Users can only see walk-ins in their tenant
   - **slot_locks**: Users can only see locks in their tenant
   - **payments**: Users can only see payments in their tenant

4. **Create role-based access policies:**
   - **Owners/Admins**: Full CRUD access
   - **Staff**: Read access, limited write (own appointments)
   - **Customers**: Read-only access to own data

### 1.3 Database Functions & Triggers
**Priority:** High  
**Estimated Time:** 1 day

#### Tasks:
1. **Create function to auto-update `updated_at`**
   ```sql
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Add triggers for `updated_at` on all relevant tables**

3. **Create function to clean expired slot locks**
   ```sql
   CREATE OR REPLACE FUNCTION cleanup_expired_slot_locks()
   RETURNS void AS $$
   DELETE FROM slot_locks WHERE expires_at < NOW();
   $$ LANGUAGE sql;
   ```

4. **Create scheduled job (pg_cron) to run cleanup every minute**

5. **Create function to validate appointment time ranges**
   - Ensure no overlapping appointments for same staff
   - Check against working hours
   - Validate time-off periods

---

## Phase 2: Multi-Tenant Architecture

### 2.1 Tenant Context & Middleware
**Priority:** Critical  
**Estimated Time:** 2-3 days

#### Tasks:
1. **Create tenant context provider**
   - `lib/tenant/context.tsx`
   - Store current tenant in React context
   - Provide tenant info to all components

2. **Create tenant middleware**
   - `middleware.ts` in Next.js root
   - Extract tenant from subdomain or path
   - Validate tenant exists and is active
   - Set tenant in request headers

3. **Create tenant utilities**
   - `lib/tenant/utils.ts`
   - Functions to get tenant from URL
   - Tenant validation helpers

4. **Update Supabase client to include tenant context**
   - Modify `lib/supabase/client.ts` and `server.ts`
   - Add tenant_id to all queries automatically
   - Create tenant-aware query helpers

### 2.2 User Management & Roles
**Priority:** Critical  
**Estimated Time:** 2 days

#### Tasks:
1. **Create user profile sync**
   - Sync Supabase auth.users with public.users table
   - Create database trigger to auto-create user profile on signup
   - Handle user updates

2. **Create role management utilities**
   - `lib/auth/roles.ts`
   - Role checking functions
   - Permission helpers

3. **Create protected route wrapper**
   - `components/protected-route.tsx`
   - Check authentication and tenant access
   - Redirect unauthorized users

4. **Update auth flow to handle tenant assignment**
   - On signup, assign tenant (from subdomain or invite)
   - On login, validate tenant access
   - Handle tenant switching (if user belongs to multiple tenants)

### 2.3 Tenant Setup & Onboarding
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create tenant creation API**
   - `app/api/tenants/route.ts`
   - Create tenant with slug validation
   - Set up default settings

2. **Create tenant onboarding flow**
   - `app/onboarding/page.tsx`
   - Collect business info
   - Set timezone and currency
   - Create first admin user

3. **Create tenant settings page**
   - `app/settings/tenant/page.tsx`
   - Edit tenant info
   - Manage subscription status

---

## Phase 3: Core Business Logic

### 3.1 Services Management
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create services API routes**
   - `app/api/services/route.ts` (GET, POST)
   - `app/api/services/[id]/route.ts` (GET, PUT, DELETE)
   - CRUD operations with tenant isolation

2. **Create services management UI**
   - `app/services/page.tsx` (list view)
   - `app/services/new/page.tsx` (create)
   - `app/services/[id]/edit/page.tsx` (edit)
   - Form components with validation

3. **Create service components**
   - `components/services/service-form.tsx`
   - `components/services/service-card.tsx`
   - `components/services/service-list.tsx`

### 3.2 Staff Management
**Priority:** High  
**Estimated Time:** 3 days

#### Tasks:
1. **Create staff API routes**
   - `app/api/staff/route.ts` (GET, POST)
   - `app/api/staff/[id]/route.ts` (GET, PUT, DELETE)
   - `app/api/staff/[id]/working-hours/route.ts` (GET, POST, PUT)
   - `app/api/staff/[id]/time-off/route.ts` (GET, POST, DELETE)

2. **Create staff management UI**
   - `app/staff/page.tsx` (list view)
   - `app/staff/new/page.tsx` (create)
   - `app/staff/[id]/edit/page.tsx` (edit)
   - `app/staff/[id]/schedule/page.tsx` (working hours)

3. **Create staff components**
   - `components/staff/staff-form.tsx`
   - `components/staff/staff-card.tsx`
   - `components/staff/working-hours-editor.tsx`
   - `components/staff/time-off-manager.tsx`



### 3.3 Customer Management
**Priority:** Medium  
**Estimated Time:** 2 days

#### Tasks:
1. **Create customers API routes**
   - `app/api/customers/route.ts` (GET, POST)
   - `app/api/customers/[id]/route.ts` (GET, PUT, DELETE)
   - `app/api/customers/search/route.ts` (search by phone/email)

2. **Create customer management UI**
   - `app/customers/page.tsx` (list view)
   - `app/customers/[id]/page.tsx` (detail view with history)
   - Search and filter functionality

3. **Create customer components**
   - `components/customers/customer-form.tsx`
   - `components/customers/customer-card.tsx`
   - `components/customers/customer-history.tsx`

---

## Phase 4: Time-Slot Generation Engine

### 4.1 Core Slot Generation Logic
**Priority:** Critical  
**Estimated Time:** 4-5 days

#### Tasks:
1. **Create slot generation service**
   - `lib/booking/slot-generator.ts`
   - Implement the 10-step algorithm from README
   - Handle all edge cases

2. **Create timezone utilities**
   - `lib/utils/timezone.ts`
   - Use Luxon for timezone handling
   - Convert between tenant timezone and UTC
   - Handle DST transitions

3. **Create working hours resolver**
   - `lib/booking/working-hours.ts`
   - Load staff working hours for a date
   - Apply time-off overrides
   - Generate available time ranges

4. **Create conflict detection**
   - `lib/booking/conflicts.ts`
   - Check appointment overlaps
   - Check slot lock conflicts
   - Use GiST indexes for efficient queries

5. **Create slot generation API**
   - `app/api/slots/route.ts`
   - Accept: date, service_id, optional staff_id
   - Return: array of available slots
   - Cache results for performance

### 4.2 Slot Generation Edge Cases
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Handle partial overlaps**
   - Slots that partially conflict with appointments
   - Buffer time enforcement

2. **Handle same-day booking cutoffs**
   - Configurable cutoff time (e.g., no bookings within 2 hours)
   - Respect tenant settings

3. **Handle staff-specific durations**
   - Different staff may have different service durations
   - Calculate slots accordingly

4. **Handle walk-ins blocking time**
   - Walk-ins are appointments, so they block slots
   - Ensure proper conflict detection

5. **Handle concurrent booking attempts**
   - Slot locks prevent double-booking
   - Return accurate availability

6. **Handle DST transitions**
   - Proper timezone conversion
   - No duplicate or missing slots

### 4.3 Slot Locking System
**Priority:** Critical  
**Estimated Time:** 2 days

#### Tasks:
1. **Create slot lock API**
   - `app/api/slots/lock/route.ts` (POST)
   - `app/api/slots/unlock/route.ts` (POST)
   - `app/api/slots/validate/route.ts` (GET)

2. **Implement lock creation**
   - Create lock with 5-minute expiry
   - Validate slot is still available
   - Return lock ID and expiry time

3. **Implement lock validation**
   - Check lock exists and is valid
   - Extend lock if needed during checkout

4. **Implement lock cleanup**
   - Background job to delete expired locks
   - Manual cleanup on appointment creation

---

## Phase 5: Booking System

### 5.1 Appointment Booking API
**Priority:** Critical  
**Estimated Time:** 3 days

#### Tasks:
1. **Create appointments API routes**
   - `app/api/appointments/route.ts` (GET, POST)
   - `app/api/appointments/[id]/route.ts` (GET, PUT, DELETE)
   - `app/api/appointments/[id]/cancel/route.ts` (POST)
   - `app/api/appointments/[id]/complete/route.ts` (POST)

2. **Implement booking creation**
   - Validate slot is available (check lock)
   - Create customer if doesn't exist
   - Create appointment
   - Delete slot lock
   - Handle conflicts gracefully

3. **Implement booking validation**
   - Check staff availability
   - Check service is active
   - Check customer exists or create
   - Validate time ranges

4. **Implement booking updates**
   - Reschedule appointments
   - Update status
   - Add notes

### 5.2 Paystack Integration
**Priority:** Critical  
**Estimated Time:** 3-4 days

#### Tasks:
1. **Install Paystack SDK**
   - `npm install paystack`
   - Set up environment variables

2. **Create Paystack service**
   - `lib/payments/paystack.ts`
   - Initialize payment
   - Verify payment
   - Handle webhooks

3. **Create payment API routes**
   - `app/api/payments/initialize/route.ts` (POST)
   - `app/api/payments/verify/route.ts` (POST)
   - `app/api/payments/webhook/route.ts` (POST)

4. **Implement deposit calculation**
   - Calculate deposit based on service settings
   - Fixed or percentage deposits
   - Handle "none" deposit type

5. **Implement payment flow**
   - Initialize payment with Paystack
   - Redirect to Paystack checkout
   - Verify payment on callback
   - Create payment record
   - Link to appointment
   - Update appointment deposit_paid status

6. **Implement webhook handler**
   - Verify webhook signature
   - Handle payment success/failure
   - Update payment and appointment status
   - Send notifications

### 5.3 Booking Components
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create booking form component**
   - `components/booking/booking-form.tsx`
   - Service selection
   - Staff selection (optional)
   - Date/time selection
   - Customer info
   - Payment integration

2. **Create slot picker component**
   - `components/booking/slot-picker.tsx`
   - Display available slots
   - Handle slot selection
   - Show locked slots
   - Handle slot expiry

3. **Create payment component**
   - `components/booking/payment-form.tsx`
   - Display deposit amount
   - Initialize Paystack payment
   - Handle payment callback

---

## Phase 6: Admin Dashboard

### 6.1 Calendar View
**Priority:** Critical  
**Estimated Time:** 4-5 days

#### Tasks:
1. **Install calendar library**
   - Choose library (react-big-calendar, fullcalendar, or custom)
   - Set up calendar component

2. **Create calendar page**
   - `app/dashboard/calendar/page.tsx`
   - Day/week/month views
   - Staff filtering
   - Service filtering

3. **Create appointment components**
   - `components/calendar/appointment-card.tsx`
   - Display appointment details
   - Color coding by status
   - Drag-and-drop rescheduling (optional)

4. **Implement calendar data fetching**
   - Load appointments for date range
   - Efficient queries with proper indexes
   - Real-time updates (Supabase subscriptions)

5. **Create appointment detail modal**
   - View full appointment details
   - Edit appointment
   - Cancel appointment
   - Mark as completed/no-show

### 6.2 Dashboard Overview
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create dashboard home page**
   - `app/dashboard/page.tsx`
   - Today's appointments
   - Upcoming appointments
   - Walk-in queue
   - Quick stats

2. **Create dashboard components**
   - `components/dashboard/stats-card.tsx`
   - `components/dashboard/today-appointments.tsx`
   - `components/dashboard/upcoming-appointments.tsx`

### 6.3 Appointment Management
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create appointments list page**
   - `app/dashboard/appointments/page.tsx`
   - Filter by status, date, staff
   - Search functionality
   - Bulk actions

2. **Create appointment detail page**
   - `app/dashboard/appointments/[id]/page.tsx`
   - Full appointment details
   - Customer history
   - Edit/cancel actions

---

## Phase 7: Customer Booking Interface

### 7.1 Public Booking Page
**Priority:** Critical  
**Estimated Time:** 3-4 days

#### Tasks:
1. **Create public booking route**
   - `app/book/[tenant-slug]/page.tsx`
   - Or `app/[tenant-slug]/book/page.tsx`
   - Public-facing, no auth required

2. **Create booking flow**
   - Step 1: Service selection
   - Step 2: Staff selection (optional)
   - Step 3: Date selection
   - Step 4: Time slot selection
   - Step 5: Customer information
   - Step 6: Payment (if deposit required)
   - Step 7: Confirmation

3. **Create booking components**
   - `components/public/service-selector.tsx`
   - `components/public/staff-selector.tsx`
   - `components/public/date-picker.tsx`
   - `components/public/slot-selector.tsx`
   - `components/public/customer-form.tsx`
   - `components/public/booking-confirmation.tsx`

4. **Implement booking state management**
   - Use React state or Zustand
   - Persist booking state across steps
   - Handle navigation between steps

### 7.2 Booking Confirmation & Emails
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create confirmation page**
   - `app/book/[tenant-slug]/confirmation/page.tsx`
   - Display booking details
   - QR code for check-in (optional)
   - Add to calendar links

2. **Create email templates**
   - Booking confirmation email
   - Reminder email (24h before)
   - Cancellation email
   - Use Resend or similar service

3. **Implement email sending**
   - `lib/emails/send-booking-confirmation.ts`
   - `lib/emails/send-reminder.ts`
   - Integrate with email service

---

## Phase 8: Walk-In Management

### 8.1 Walk-In Queue System
**Priority:** High  
**Estimated Time:** 3 days

#### Tasks:
1. **Create walk-in API routes**
   - `app/api/walk-ins/route.ts` (GET, POST)
   - `app/api/walk-ins/[id]/route.ts` (GET, PUT, DELETE)
   - `app/api/walk-ins/[id]/assign/route.ts` (POST)

2. **Create walk-in queue UI**
   - `app/dashboard/walk-ins/page.tsx`
   - Display waiting walk-ins
   - Show requested service
   - Queue order (FIFO)

3. **Create walk-in components**
   - `components/walk-ins/walk-in-card.tsx`
   - `components/walk-ins/walk-in-form.tsx`
   - `components/walk-ins/queue-list.tsx`

### 8.2 Walk-In Assignment
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create assignment logic**
   - Find available slots for walk-in
   - Check appointment priority
   - Auto-assign or manual assignment

2. **Create assignment UI**
   - `components/walk-ins/assign-walk-in.tsx`
   - Show available slots
   - Select staff and time
   - Convert walk-in to appointment

3. **Handle walk-in to appointment conversion**
   - Create customer if needed
   - Create appointment
   - Update walk-in status
   - Block time slot

---

## Phase 9: Notifications & Polish

### 9.1 Email Notifications
**Priority:** Medium  
**Estimated Time:** 2 days

#### Tasks:
1. **Set up email service**
   - Choose provider (Resend, SendGrid, etc.)
   - Configure SMTP or API

2. **Create email templates**
   - Booking confirmation
   - Booking reminder (24h before)
   - Booking cancellation
   - Payment receipt
   - No-show notification

3. **Implement email sending**
   - `lib/notifications/email.ts`
   - Queue emails for reliability
   - Handle failures gracefully

### 9.2 WhatsApp Integration (Future)
**Priority:** Low (Phase 2)  
**Estimated Time:** TBD

#### Tasks:
- To be discussed as project progresses
- May use WhatsApp Business API
- Or manual entry with notifications

### 9.3 Error Handling & Validation
**Priority:** High  
**Estimated Time:** 2 days

#### Tasks:
1. **Create error handling utilities**
   - `lib/utils/errors.ts`
   - Standardized error responses
   - Error logging

2. **Add validation to all forms**
   - Use Zod or similar
   - Client and server-side validation
   - User-friendly error messages

3. **Add loading states**
   - Skeleton loaders
   - Optimistic updates
   - Progress indicators

### 9.4 Performance Optimization
**Priority:** Medium  
**Estimated Time:** 2 days

#### Tasks:
1. **Optimize database queries**
   - Add missing indexes
   - Use query optimization
   - Implement pagination

2. **Implement caching**
   - Cache slot generation results
   - Cache tenant info
   - Use React Query or SWR

3. **Optimize bundle size**
   - Code splitting
   - Lazy loading
   - Tree shaking

### 9.5 Testing
**Priority:** High  
**Estimated Time:** 3-4 days

#### Tasks:
1. **Set up testing framework**
   - Jest + React Testing Library
   - Or Vitest

2. **Write unit tests**
   - Slot generation logic
   - Conflict detection
   - Timezone handling

3. **Write integration tests**
   - Booking flow
   - Payment flow
   - API endpoints

4. **Write E2E tests**
   - Critical user flows
   - Use Playwright or Cypress

---

## 📦 Dependencies to Install

### Core Dependencies
```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
npm install paystack
npm install luxon
npm install date-fns date-fns-tz
npm install zod
npm install zustand  # or react-query for state management
npm install react-hook-form
npm install @hookform/resolvers
```

### UI Dependencies
```bash
npm install react-big-calendar  # or fullcalendar
npm install @radix-ui/react-dialog
npm install @radix-ui/react-select
npm install @radix-ui/react-popover
npm install lucide-react
```

### Development Dependencies
```bash
npm install -D @types/luxon
npm install -D @testing-library/react
npm install -D @testing-library/jest-dom
npm install -D jest
npm install -D @types/jest
```

---

## 🔧 Environment Variables

Add to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Email (Resend or similar)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Estimated Timeline

- **Phase 1:** 4-6 days
- **Phase 2:** 4-5 days
- **Phase 3:** 7 days
- **Phase 4:** 6-7 days
- **Phase 5:** 6-7 days
- **Phase 6:** 6-7 days
- **Phase 7:** 5-6 days
- **Phase 8:** 5 days
- **Phase 9:** 7-9 days

**Total MVP:** ~50-65 days (10-13 weeks)

---

## 🎯 MVP Definition

The MVP should include:
- ✅ Multi-tenant setup with RLS
- ✅ Services and staff management
- ✅ Time-slot generation engine
- ✅ Online booking with deposits
- ✅ Admin calendar view
- ✅ Walk-in queue and assignment
- ✅ Basic email notifications

**Not in MVP:**
- WhatsApp integration
- Analytics dashboard
- Mobile apps
- Multi-location support
- Advanced CRM features

---

## 🚀 Getting Started

1. **Start with Phase 1** - Database setup is critical
2. **Test each phase** before moving to the next
3. **Use feature flags** for incomplete features
4. **Deploy incrementally** - test in staging first
5. **Document as you go** - update README with implementation details

---

## 📝 Notes

- All dates/times should be stored in UTC in the database
- Convert to tenant timezone only for display
- Use Luxon for all timezone operations
- Always validate tenant access in API routes
- Use Supabase RLS as the primary security layer
- Implement proper error boundaries in React
- Use TypeScript strictly - no `any` types
- Follow Next.js 14+ App Router patterns
- Use Server Components by default, Client Components only when needed

---

This implementation plan is a living document and should be updated as the project progresses.
