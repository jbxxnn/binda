create table if not exists public.vendor_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  phone_number text,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vendor_feedback_business_id
on public.vendor_feedback(business_id);

alter table public.vendor_feedback enable row level security;

drop policy if exists "admins manage vendor feedback" on public.vendor_feedback;
create policy "admins manage vendor feedback"
on public.vendor_feedback
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "members read vendor feedback" on public.vendor_feedback;
create policy "members read vendor feedback"
on public.vendor_feedback
for select
using (public.is_business_member(business_id) or public.is_admin());
