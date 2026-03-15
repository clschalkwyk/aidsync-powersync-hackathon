-- 1. Drop the problematic recursive policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

-- 2. Create a helper function that bypasses RLS (security definer)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('supervisor', 'admin')
  );
end;
$$ language plpgsql security definer;

-- 3. Re-create the policies using the new function
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin()
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  or public.is_admin()
)
with check (
  auth.uid() = id
  or public.is_admin()
);
