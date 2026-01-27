
# Binda — Multi-Tenant Booking & Walk-In Management SaaS

Binda is a **multi-tenant appointment booking and walk-in management SaaS** designed specifically for salons, barbershops, and service-based businesses that rely heavily on WhatsApp, Instagram DMs, phone calls, and walk-ins.

Unlike traditional booking systems, Binda enforces **appointment priority**, **walk-in control**, and **real-time availability** using a centralized scheduling engine.

---

## 🚀 Core Problems Solved

Most salons face the same operational issues:

- Appointments taken via WhatsApp and Instagram DMs
- No centralized booking calendar
- Walk-ins conflicting with confirmed bookings
- No-shows due to lack of deposits or cancellation rules
- Staff double-booking
- No real visibility of availability

Binda solves these by providing:

- One authoritative booking calendar
- Appointment-first scheduling logic
- Walk-in queue and controlled assignment
- Deposit-based booking enforcement
- Real-time availability generation
- Multi-staff service scheduling
- Fully multi-tenant SaaS architecture

---

## 🎯 Target Market

- Hair salons
- Barbershops
- Nail salons
- Beauty studios
- Small–medium service businesses

Optimized for:
- 2–10 staff per business
- Heavy mobile usage
- WhatsApp-first customer communication

---

## 🧱 System Architecture

```

Frontend (Next.js)
↓
API / Edge Functions
↓
Supabase Postgres (multi-tenant)
↓
Paystack (payments)
↓
Email / WhatsApp notifications

```

---

## 🧠 Core Principles

### 1. Single Source of Truth

All bookings — regardless of origin — must exist in one system.

Sources include:
- Online self-booking
- Admin dashboard
- WhatsApp / Instagram requests
- Walk-ins

If it is not in the calendar, it does not exist.

---

### 2. Appointment Priority

Appointments always take precedence over walk-ins.

Walk-ins:
- Cannot override confirmed bookings
- Are only allowed in available time slots
- Can be queued and assigned automatically

---

### 3. Multi-Tenant by Design

- One database
- Shared tables
- Strict tenant isolation via Row Level Security (RLS)
- No per-tenant schemas
- Horizontally scalable

---

## 🗄️ Database Schema

### Core Tables

---

### `tenants`

Represents one salon/business.

```sql
tenants (
  id uuid primary key,
  name text,
  slug text,
  timezone text,
  currency text,
  status text,
  created_at timestamptz
)
```

---

### `users`

Authentication accounts.

```sql
users (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  name text,
  email text,
  role text,
  created_at timestamptz
)
```

---

### `staff`

```sql
staff (
  id uuid primary key,
  tenant_id uuid,
  name text,
  email text,
  phone text,
  is_active boolean,
  created_at timestamptz
)
```

---

### `staff_working_hours`

Weekly recurring availability.

```sql
staff_working_hours (
  id uuid,
  staff_id uuid,
  day_of_week int,   -- 0–6
  start_time time,
  end_time time
)
```

---

### `staff_time_off`

Overrides working hours.

```sql
staff_time_off (
  id uuid,
  staff_id uuid,
  start_datetime timestamptz,
  end_datetime timestamptz,
  reason text
)
```

---

### `services`

```sql
services (
  id uuid primary key,
  tenant_id uuid,
  name text,
  duration_minutes int,
  buffer_before_minutes int,
  buffer_after_minutes int,
  price numeric,
  deposit_type text,       -- none | fixed | percentage
  deposit_value numeric,
  is_active boolean
)
```

---

### `service_staff`

Many-to-many mapping.

```sql
service_staff (
  service_id uuid,
  staff_id uuid
)
```

---

### `customers`

```sql
customers (
  id uuid primary key,
  tenant_id uuid,
  name text,
  phone text,
  email text,
  created_at timestamptz
)
```

---

### `appointments`

The most critical table.

```sql
appointments (
  id uuid primary key,
  tenant_id uuid,
  staff_id uuid,
  service_id uuid,
  customer_id uuid,

  start_time timestamptz,
  end_time timestamptz,

  status text,          -- confirmed, cancelled, completed, no_show
  booking_source text,  -- online, walk_in, admin, whatsapp, instagram

  deposit_paid boolean,
  payment_id uuid,

  created_at timestamptz
)
```

All appointments — including walk-ins — block time identically.

---

### `walk_in_queue`

```sql
walk_in_queue (
  id uuid,
  tenant_id uuid,
  customer_name text,
  requested_service_id uuid,
  status text,        -- waiting, assigned, cancelled
  created_at timestamptz
)
```

---

### `slot_locks`

Prevents double-booking during checkout.

```sql
slot_locks (
  id uuid,
  tenant_id uuid,
  staff_id uuid,
  service_id uuid,
  start_time timestamptz,
  expires_at timestamptz,
  session_id text
)
```

Locks auto-expire after 3–5 minutes.

---

### `payments`

```sql
payments (
  id uuid,
  tenant_id uuid,
  provider text,
  amount numeric,
  currency text,
  status text,
  reference text,
  created_at timestamptz
)
```

---

## 🔐 Row Level Security (RLS)

Every table includes:

```sql
tenant_id uuid NOT NULL
```

RLS example:

```sql
USING (
  tenant_id = auth.jwt() ->> 'tenant_id'
);
```

This guarantees:

* No cross-tenant data leaks
* Safe shared-table architecture
* Unlimited tenant growth

---

## ⏱️ Time-Slot Generation Engine

### Inputs

* Date
* Service ID
* Optional staff ID
* Tenant timezone

---

### Algorithm Steps

1. Resolve service duration

   ```
   total_duration =
     duration +
     buffer_before +
     buffer_after
   ```

2. Identify eligible staff

3. Load working hours for selected date

4. Subtract staff time-off intervals

5. Generate raw slots
   (e.g., every 15 minutes)

6. Remove conflicting appointments

   ```
   slot.start < appt.end
   AND
   slot.end > appt.start
   ```

7. Remove active slot locks

8. Apply booking cutoff rules

9. Merge staff availability

10. Return available slots

---

### Edge Cases Handled

* Partial overlaps
* Buffer time enforcement
* Same-day booking cutoffs
* Staff-specific service duration
* Walk-ins blocking time
* DST transitions
* Timezone safety
* Concurrent booking attempts

---

## 🔒 Slot Locking Flow

```
User selects slot
        ↓
Create slot lock (5 min)
        ↓
Payment / confirmation
        ↓
Convert lock → appointment
        ↓
Delete lock
```

Prevents race conditions and double bookings.

---

## 💳 Deposits & Cancellation Rules

* Fixed or percentage deposits
* Paystack integration
* Configurable cancellation cutoff
* Automatic no-show handling
* Admin override support

Deposits typically reduce no-shows by 70–90%.

---

## 📈 Scalability

### Designed Capacity

* 10,000+ tenants
* 5M+ appointments/month
* Millions of customers
* Shared PostgreSQL database

### Key Scaling Enablers

* Composite indexes
* GiST time-range overlap queries
* Server-side slot generation
* Supabase connection pooling
* Stateless API design

Supabase PostgreSQL comfortably supports this scale.

---

## 🧰 Technology Stack

* **Frontend:** Next.js
* **Backend:** Supabase Edge Functions / API
* **Database:** PostgreSQL (Supabase)
* **Auth:** Supabase Auth
* **Payments:** Paystack
* **Notifications:** Email / WhatsApp
* **Timezone Handling:** Luxon (with date-fns-tz for formatting)

---

## 🧭 Product Roadmap

### MVP

* Appointment scheduling
* Admin calendar
* Online booking page
* Deposits
* Walk-in support

### Phase 2

* Analytics dashboard
* Staff performance metrics
* Customer history
* Memberships

### Phase 3

* Multi-location salons
* Franchise management
* Advanced CRM
* Mobile apps

---

## 🧩 Key Differentiators

* Walk-in aware scheduling
* Appointment priority enforcement
* WhatsApp-first workflow
* True multi-tenant architecture
* Salon-specific UX
* Deposit-driven booking discipline

---

## 📄 License

MIT License

---

## 👤 Author

Built as a scalable SaaS foundation for service businesses where **time conflicts cost money**.

---

```# binda
