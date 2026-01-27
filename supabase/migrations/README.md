# Database Migrations

This directory contains SQL migration files for setting up the Binda database schema.

## Migration Files

1. **001_initial_schema.sql** - Creates all database tables with indexes
2. **002_rls_policies.sql** - Sets up Row Level Security (RLS) policies for tenant isolation
3. **003_functions_triggers.sql** - Creates helper functions, triggers, and validation logic

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended for Initial Setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open each migration file in order (001, 002, 003)
4. Copy and paste the contents into the SQL Editor
5. Click **Run** to execute each migration

**Important:** Run migrations in order (001 → 002 → 003)

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push

# Or run migrations individually
supabase migration up
```

### Option 3: Using psql

If you have direct database access:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations in order
\i 001_initial_schema.sql
\i 002_rls_policies.sql
\i 003_functions_triggers.sql
```

## Migration Order

**CRITICAL:** Migrations must be run in this exact order:

1. **001_initial_schema.sql** - Creates all tables
2. **002_rls_policies.sql** - Enables RLS and creates policies (requires tables to exist)
3. **003_functions_triggers.sql** - Creates functions and triggers (requires tables and RLS)

## What Each Migration Does

### 001_initial_schema.sql

Creates the following tables:
- `tenants` - Business/salon information
- `users` - User accounts (extends auth.users)
- `staff` - Staff members
- `staff_working_hours` - Weekly recurring availability
- `staff_time_off` - Time-off periods
- `services` - Services offered
- `service_staff` - Service-to-staff mapping
- `customers` - Customer records
- `appointments` - All appointments (including walk-ins)
- `walk_in_queue` - Walk-in customer queue
- `slot_locks` - Temporary locks during booking
- `payments` - Payment records

All tables include:
- Proper indexes for performance
- Foreign key constraints
- Check constraints for data validation
- `created_at` and `updated_at` timestamps

### 002_rls_policies.sql

- Enables Row Level Security (RLS) on all tables
- Creates helper functions: `get_tenant_id()` and `get_user_role()`
- Sets up policies for:
  - Tenant isolation (users can only see their tenant's data)
  - Role-based access (owners, admins, staff, customers)
  - CRUD operations based on user role

### 003_functions_triggers.sql

Creates:
- **Triggers** for auto-updating `updated_at` columns
- **Validation functions** for appointment time ranges
- **Cleanup function** for expired slot locks
- **User sync function** to create user profiles on auth signup
- **Helper functions** for deposits, slot availability, etc.

## Post-Migration Setup

After running all migrations:

1. **Set up a cleanup job** (optional but recommended):
   - In Supabase Dashboard, go to **Database** → **Cron Jobs**
   - Create a cron job to run `cleanup_expired_slot_locks()` every minute:
   ```sql
   SELECT cron.schedule(
     'cleanup-slot-locks',
     '* * * * *', -- Every minute
     $$SELECT cleanup_expired_slot_locks()$$
   );
   ```

2. **Create your first tenant** (via application or SQL):
   ```sql
   INSERT INTO tenants (name, slug, timezone, currency)
   VALUES ('My Salon', 'my-salon', 'Africa/Lagos', 'NGN');
   ```

3. **Test RLS policies**:
   - Create a test user
   - Verify they can only see their tenant's data

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran migrations in order (001 → 002 → 003)
- Check that all previous migrations completed successfully

### Error: "permission denied"
- Ensure you're using a user with sufficient permissions
- For RLS policies, make sure you're authenticated with a valid JWT token

### Error: "duplicate key value"
- A table or index already exists
- You may need to drop existing objects first (be careful in production!)

### RLS blocking all queries
- Check that your JWT token includes `tenant_id` in the claims
- Verify RLS policies are correctly set up
- Test with service role key if needed (bypasses RLS)

## Verifying Migrations

Run these queries to verify everything is set up correctly:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;
```

## Next Steps

After completing Phase 1 migrations:

1. ✅ Database schema is ready
2. ✅ RLS policies are active
3. ✅ Functions and triggers are working
4. ➡️ Move to **Phase 2: Multi-Tenant Architecture**

## Notes

- All timestamps are stored in UTC
- All tables include `tenant_id` for multi-tenant isolation
- RLS policies enforce tenant isolation at the database level
- The `users` table extends Supabase's `auth.users` table
- Slot locks expire automatically (cleanup function should run periodically)
