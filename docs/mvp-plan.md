# Binda MVP Plan

## Product Goal

Build a WhatsApp-first business assistant for small vendors in Minna. A vendor should be able to register a business, record sales from WhatsApp, review simple business reports, and manage products and customers without learning accounting software.

## Core Roles

- `admin`: platform operator with full oversight across businesses, enquiries, and summaries.
- `vendor`: authenticated user with access to one or more businesses through `business_memberships`.

## User Journey

### 1. Vendor onboarding

1. Vendor opens a WhatsApp Flow for business setup.
2. Vendor submits business details.
3. System creates or links the user profile, business record, and owner membership.
4. Vendor receives a confirmation message and dashboard link.

### 2. Daily vendor loop

1. Vendor sends a WhatsApp message.
2. Bot resolves the vendor by phone number and loads today's summary.
3. Bot returns a simple menu:
   - Record Sale
   - Products
   - Customers
   - Reports
   - Business Profile
   - Settings
4. Vendor records a sale using a short WhatsApp Flow.
5. System stores transaction, line items, and payment state, then replies with an updated sales total.

### 3. Dashboard usage

1. Vendor logs into the web dashboard with Supabase Auth.
2. Vendor sees only businesses they belong to.
3. Admin logs in separately and sees all businesses, categories, enquiries, and platform summaries.

### 4. Daily and weekly summaries

1. A scheduler triggers every evening for reminders.
2. A daily summary runs at close of business.
3. A weekly summary runs every Sunday.
4. Summary data can be cached into `business_summary_cache` for quick reads in WhatsApp and the dashboard.

### 5. Customer enquiry routing

1. An admin or customer-facing intake creates an enquiry.
2. System matches vendors by category, product keywords, location, and active status.
3. Matching vendors receive a WhatsApp notification.

## Schema Notes

- Use `profiles` for app-level user records linked to `auth.users`.
- Use `business_memberships` rather than a single owner field so one user can manage multiple businesses.
- Keep `transactions`, `transaction_items`, and `payments` separate to support partial payments and later debt collection workflows.
- Use `business_summary_cache` for fast dashboard and WhatsApp summaries.
- Keep status values as Postgres enums for consistency across the app and Edge/API handlers.

## Security Model

- RLS enabled on every exposed table.
- Vendors can access only rows tied to businesses where they have membership.
- Admin access is granted through the `profiles.role = 'admin'` check.
- WhatsApp webhook requests must verify the Meta signature header before processing.

## Implementation Order

1. Create SQL schema, enums, indexes, triggers, and RLS policies.
2. Add seed data for categories, admin, sample vendors, products, customers, and transactions.
3. Scaffold Next.js app with Supabase SSR auth helpers.
4. Build login, vendor dashboard, and admin dashboard.
5. Add WhatsApp webhook and flow submission handlers.
6. Add reporting helpers and scheduled job entry points.
