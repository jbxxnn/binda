create table if not exists public.whatsapp_auth_identities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  phone_number text not null unique,
  pin_salt text,
  pin_hash text,
  last_verified_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_whatsapp_auth_identities_phone_number
on public.whatsapp_auth_identities(phone_number);

create trigger whatsapp_auth_identities_set_updated_at
before update on public.whatsapp_auth_identities
for each row execute procedure public.set_updated_at();

alter table public.whatsapp_auth_identities enable row level security;

create policy "admins manage whatsapp auth identities"
on public.whatsapp_auth_identities
for all
using (public.is_admin())
with check (public.is_admin());

create policy "members read whatsapp auth identities"
on public.whatsapp_auth_identities
for select
using (public.is_business_member(business_id) or public.is_admin());
