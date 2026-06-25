create or replace function private.handle_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  delete from public.businesses b
  where exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = b.id
      and bm.user_id = old.id
      and bm.role = 'owner'
  );

  return old;
end;
$$;

drop trigger if exists on_profile_deleted on public.profiles;

create trigger on_profile_deleted
before delete on public.profiles
for each row execute procedure private.handle_profile_delete();
