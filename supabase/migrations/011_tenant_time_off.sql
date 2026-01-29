
-- Drop table if it exists
drop table if exists tenant_time_off;

-- Create table for managing tenant-wide closures/holidays
create table tenant_time_off (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

-- Index for performance
create index idx_tenant_time_off_tenant_id on tenant_time_off(tenant_id);

-- Enable RLS
alter table tenant_time_off enable row level security;

-- Policy: Allow access to users belonging to the same tenant
create policy "Tenant time off access" on tenant_time_off
  for all
  using (
      tenant_id = (select get_tenant_id())
  );
