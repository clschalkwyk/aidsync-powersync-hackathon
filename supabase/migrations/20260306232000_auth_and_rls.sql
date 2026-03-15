create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'clinician',
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_role_check
    check (role in ('clinician', 'supervisor', 'admin'))
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_allergies enable row level security;
alter table public.patient_conditions enable row level security;
alter table public.current_medications enable row level security;
alter table public.encounters enable row level security;
alter table public.vitals enable row level security;
alter table public.scanned_inserts enable row level security;
alter table public.interaction_checks enable row level security;
alter table public.attachments enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "patients_authenticated_all"
on public.patients
for all
to authenticated
using (true)
with check (true);

create policy "patient_allergies_authenticated_all"
on public.patient_allergies
for all
to authenticated
using (true)
with check (true);

create policy "patient_conditions_authenticated_all"
on public.patient_conditions
for all
to authenticated
using (true)
with check (true);

create policy "current_medications_authenticated_all"
on public.current_medications
for all
to authenticated
using (true)
with check (true);

create policy "encounters_authenticated_all"
on public.encounters
for all
to authenticated
using (true)
with check (true);

create policy "vitals_authenticated_all"
on public.vitals
for all
to authenticated
using (true)
with check (true);

create policy "scanned_inserts_authenticated_all"
on public.scanned_inserts
for all
to authenticated
using (true)
with check (true);

create policy "interaction_checks_authenticated_all"
on public.interaction_checks
for all
to authenticated
using (true)
with check (true);

create policy "attachments_authenticated_all"
on public.attachments
for all
to authenticated
using (true)
with check (true);
