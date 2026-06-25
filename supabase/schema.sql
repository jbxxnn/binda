create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('admin', 'vendor');
create type public.membership_role as enum ('owner', 'manager', 'staff');
create type public.business_status as enum ('pending_review', 'approved', 'inactive');
create type public.payment_status as enum ('paid', 'pending', 'partial');
create type public.payment_method as enum ('cash', 'transfer', 'pos');
create type public.enquiry_status as enum ('new', 'matched', 'closed');
create type public.summary_period as enum ('today', 'yesterday', 'week', 'month', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone_number text unique,
  role public.app_role not null default 'vendor',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.business_categories(id),
  business_name text not null,
  owner_name text not null,
  phone_number text not null,
  whatsapp_phone text not null unique,
  location_area text not null,
  address_text text,
  delivery_available boolean not null default false,
  products_services text not null,
  profile_image_url text,
  status public.business_status not null default 'pending_review',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, user_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone_number text,
  email text,
  address_text text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  recorded_by uuid not null references public.profiles(id),
  transaction_date timestamptz not null default timezone('utc', now()),
  subtotal_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  amount_pending numeric(12,2) not null default 0,
  payment_status public.payment_status not null,
  payment_method public.payment_method not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_name text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(12,2) not null default 0,
  payment_method public.payment_method not null,
  payment_date timestamptz not null default timezone('utc', now()),
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.business_categories(id),
  customer_name text,
  customer_phone text,
  location_area text not null,
  requested_item text not null,
  details text,
  status public.enquiry_status not null default 'new',
  matched_business_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.business_summary_cache (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_type public.summary_period not null,
  period_start date not null,
  period_end date not null,
  total_sales numeric(12,2) not null default 0,
  transactions_count integer not null default 0,
  paid_amount numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0,
  average_transaction_value numeric(12,2) not null default 0,
  best_sales_day date,
  returning_customers integer not null default 0,
  top_products jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, period_type, period_start, period_end)
);

create index idx_businesses_category_id on public.businesses(category_id);
create index idx_businesses_location_area on public.businesses(location_area);
create index idx_business_memberships_user on public.business_memberships(user_id);
create index idx_products_business_id on public.products(business_id);
create index idx_customers_business_id on public.customers(business_id);
create index idx_transactions_business_id on public.transactions(business_id);
create index idx_transactions_customer_id on public.transactions(customer_id);
create index idx_transactions_date on public.transactions(transaction_date);
create index idx_transaction_items_transaction_id on public.transaction_items(transaction_id);
create index idx_payments_business_id on public.payments(business_id);
create index idx_enquiries_category_id on public.enquiries(category_id);
create index idx_summary_cache_business_id on public.business_summary_cache(business_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.business_memberships
    where business_id = target_business_id and user_id = auth.uid()
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone_number'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute procedure public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute procedure public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.payments enable row level security;
alter table public.enquiries enable row level security;
alter table public.business_summary_cache enable row level security;

create policy "profiles self or admin select"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles self update"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "admins manage categories"
on public.business_categories
for all
using (public.is_admin())
with check (public.is_admin());

create policy "vendors can read categories"
on public.business_categories
for select
using (auth.uid() is not null);

create policy "admins manage businesses"
on public.businesses
for all
using (public.is_admin())
with check (public.is_admin());

create policy "members read businesses"
on public.businesses
for select
using (public.is_business_member(id));

create policy "members create businesses"
on public.businesses
for insert
with check (created_by = auth.uid() or public.is_admin());

create policy "members update their businesses"
on public.businesses
for update
using (public.is_business_member(id) or public.is_admin())
with check (public.is_business_member(id) or public.is_admin());

create policy "admins manage memberships"
on public.business_memberships
for all
using (public.is_admin())
with check (public.is_admin());

create policy "members read memberships"
on public.business_memberships
for select
using (user_id = auth.uid() or public.is_business_member(business_id) or public.is_admin());

create policy "members manage products"
on public.products
for all
using (public.is_business_member(business_id) or public.is_admin())
with check (public.is_business_member(business_id) or public.is_admin());

create policy "members manage customers"
on public.customers
for all
using (public.is_business_member(business_id) or public.is_admin())
with check (public.is_business_member(business_id) or public.is_admin());

create policy "members manage transactions"
on public.transactions
for all
using (public.is_business_member(business_id) or public.is_admin())
with check (public.is_business_member(business_id) or public.is_admin());

create policy "members manage transaction items"
on public.transaction_items
for all
using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and (public.is_business_member(t.business_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and (public.is_business_member(t.business_id) or public.is_admin())
  )
);

create policy "members manage payments"
on public.payments
for all
using (public.is_business_member(business_id) or public.is_admin())
with check (public.is_business_member(business_id) or public.is_admin());

create policy "admins manage enquiries"
on public.enquiries
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage summaries"
on public.business_summary_cache
for all
using (public.is_admin())
with check (public.is_admin());

create policy "members read summaries"
on public.business_summary_cache
for select
using (public.is_business_member(business_id) or public.is_admin());
