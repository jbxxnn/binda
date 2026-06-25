alter table public.businesses
  drop constraint if exists businesses_created_by_fkey,
  add constraint businesses_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.businesses
  drop constraint if exists businesses_approved_by_fkey,
  add constraint businesses_approved_by_fkey
    foreign key (approved_by) references public.profiles(id) on delete set null;

alter table public.transactions
  alter column recorded_by drop not null;

alter table public.transactions
  drop constraint if exists transactions_recorded_by_fkey,
  add constraint transactions_recorded_by_fkey
    foreign key (recorded_by) references public.profiles(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_recorded_by_fkey,
  add constraint payments_recorded_by_fkey
    foreign key (recorded_by) references public.profiles(id) on delete set null;
