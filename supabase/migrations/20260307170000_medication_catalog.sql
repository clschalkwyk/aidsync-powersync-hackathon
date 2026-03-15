create table if not exists public.active_ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null unique,
  common_name text,
  ingredient_class text,
  synonyms_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.medication_catalog (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  generic_name text,
  normalized_brand_name text not null unique,
  dosage_form text,
  strength_text text,
  manufacturer_name text,
  source_name text not null default 'manual',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.medication_catalog_ingredients (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medication_catalog(id) on delete cascade,
  ingredient_id uuid not null references public.active_ingredients(id) on delete restrict,
  strength_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint medication_catalog_ingredients_unique unique (medication_id, ingredient_id)
);

create table if not exists public.medication_interaction_rules (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.active_ingredients(id) on delete cascade,
  interacting_name text not null,
  interacting_type text not null default 'ingredient',
  severity text not null default 'medium',
  effect_text text not null,
  guidance_text text,
  source_name text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint medication_interaction_rules_severity_check
    check (severity in ('low', 'medium', 'high', 'severe')),
  constraint medication_interaction_rules_type_check
    check (interacting_type in ('ingredient', 'drug', 'condition', 'population'))
);

create table if not exists public.medication_contraindication_rules (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.active_ingredients(id) on delete cascade,
  contraindication_name text not null,
  contraindication_type text not null default 'condition',
  severity text not null default 'high',
  guidance_text text,
  source_name text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint medication_contraindication_rules_severity_check
    check (severity in ('low', 'medium', 'high', 'severe')),
  constraint medication_contraindication_rules_type_check
    check (contraindication_type in ('condition', 'allergy', 'age', 'pregnancy', 'lactation', 'organ_function'))
);

create index if not exists active_ingredients_normalized_name_idx
  on public.active_ingredients (normalized_name);

create index if not exists medication_catalog_normalized_brand_name_idx
  on public.medication_catalog (normalized_brand_name);

create index if not exists medication_catalog_generic_name_idx
  on public.medication_catalog (generic_name);

create index if not exists medication_catalog_ingredients_medication_id_idx
  on public.medication_catalog_ingredients (medication_id);

create index if not exists medication_catalog_ingredients_ingredient_id_idx
  on public.medication_catalog_ingredients (ingredient_id);

create index if not exists medication_interaction_rules_ingredient_id_idx
  on public.medication_interaction_rules (ingredient_id);

create index if not exists medication_contraindication_rules_ingredient_id_idx
  on public.medication_contraindication_rules (ingredient_id);

drop trigger if exists active_ingredients_set_updated_at on public.active_ingredients;
create trigger active_ingredients_set_updated_at
before update on public.active_ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists medication_catalog_set_updated_at on public.medication_catalog;
create trigger medication_catalog_set_updated_at
before update on public.medication_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists medication_catalog_ingredients_set_updated_at on public.medication_catalog_ingredients;
create trigger medication_catalog_ingredients_set_updated_at
before update on public.medication_catalog_ingredients
for each row
execute function public.set_updated_at();

drop trigger if exists medication_interaction_rules_set_updated_at on public.medication_interaction_rules;
create trigger medication_interaction_rules_set_updated_at
before update on public.medication_interaction_rules
for each row
execute function public.set_updated_at();

drop trigger if exists medication_contraindication_rules_set_updated_at on public.medication_contraindication_rules;
create trigger medication_contraindication_rules_set_updated_at
before update on public.medication_contraindication_rules
for each row
execute function public.set_updated_at();

alter table public.active_ingredients enable row level security;
alter table public.medication_catalog enable row level security;
alter table public.medication_catalog_ingredients enable row level security;
alter table public.medication_interaction_rules enable row level security;
alter table public.medication_contraindication_rules enable row level security;

create policy "active_ingredients_authenticated_read"
on public.active_ingredients
for select
to authenticated
using (true);

create policy "medication_catalog_authenticated_read"
on public.medication_catalog
for select
to authenticated
using (true);

create policy "medication_catalog_ingredients_authenticated_read"
on public.medication_catalog_ingredients
for select
to authenticated
using (true);

create policy "medication_interaction_rules_authenticated_read"
on public.medication_interaction_rules
for select
to authenticated
using (true);

create policy "medication_contraindication_rules_authenticated_read"
on public.medication_contraindication_rules
for select
to authenticated
using (true);

create policy "active_ingredients_admin_write"
on public.active_ingredients
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "medication_catalog_admin_write"
on public.medication_catalog
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "medication_catalog_ingredients_admin_write"
on public.medication_catalog_ingredients
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "medication_interaction_rules_admin_write"
on public.medication_interaction_rules
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);

create policy "medication_contraindication_rules_admin_write"
on public.medication_contraindication_rules
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);
