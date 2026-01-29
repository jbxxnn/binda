
-- Drop table if it exists to ensure clean schema creation (since this is a new feature)
drop table if exists staff_time_off;

-- Create table for managing staff time off / blocks
create table staff_time_off (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references staff(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

-- Add index for querying by staff and time range
create index if not exists idx_staff_time_off_staff_id on staff_time_off(staff_id);
create index if not exists idx_staff_time_off_range on staff_time_off(start_time, end_time);

-- Enable RLS
alter table staff_time_off enable row level security;

-- Policies (assuming standard tenant isolation or checking staff ownership)
-- For now, allowing authenticated users (likely admins/staff) to view and manage.
-- In a real multi-tenant app, you'd check tenant_id via staff table join or auth.
-- Assuming existing patterns:

create policy "Staff time off valid for tenant" on staff_time_off
  for all
  using (
    exists (
      select 1 from staff s
      where s.id = staff_time_off.staff_id
      and s.tenant_id = (select get_tenant_id())
    )
  );
