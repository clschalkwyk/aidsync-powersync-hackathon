create table if not exists public.leaflet_preparation_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft',
  source_name text,
  brand_name text,
  generic_name text,
  dosage_form text,
  manufacturer_name text,
  notes text,
  confidence numeric,
  warnings_json jsonb not null default '[]'::jsonb,
  draft_json jsonb not null default '{}'::jsonb,
  published_medication_id uuid references public.medication_catalog(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leaflet_preparation_sessions_status_check
    check (status in ('draft', 'processing', 'ready_for_review', 'published', 'failed'))
);

create table if not exists public.leaflet_preparation_pages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.leaflet_preparation_sessions(id) on delete cascade,
  page_index integer not null,
  storage_path text not null,
  status text not null default 'uploaded',
  ocr_text text,
  extraction_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  error_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leaflet_preparation_pages_unique unique (session_id, page_index),
  constraint leaflet_preparation_pages_status_check
    check (status in ('uploaded', 'processing', 'extracted', 'failed'))
);

create index if not exists leaflet_preparation_sessions_created_by_idx
  on public.leaflet_preparation_sessions (created_by);
create index if not exists leaflet_preparation_sessions_status_idx
  on public.leaflet_preparation_sessions (status);
create index if not exists leaflet_preparation_sessions_created_at_idx
  on public.leaflet_preparation_sessions (created_at desc);

create index if not exists leaflet_preparation_pages_session_id_idx
  on public.leaflet_preparation_pages (session_id);
create index if not exists leaflet_preparation_pages_session_page_idx
  on public.leaflet_preparation_pages (session_id, page_index);
create index if not exists leaflet_preparation_pages_status_idx
  on public.leaflet_preparation_pages (status);

drop trigger if exists leaflet_preparation_sessions_set_updated_at on public.leaflet_preparation_sessions;
create trigger leaflet_preparation_sessions_set_updated_at
before update on public.leaflet_preparation_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists leaflet_preparation_pages_set_updated_at on public.leaflet_preparation_pages;
create trigger leaflet_preparation_pages_set_updated_at
before update on public.leaflet_preparation_pages
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leaflet-preparation',
  'leaflet-preparation',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.leaflet_preparation_sessions enable row level security;
alter table public.leaflet_preparation_pages enable row level security;

create policy "leaflet_preparation_sessions_admin_read_write"
on public.leaflet_preparation_sessions
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

create policy "leaflet_preparation_pages_admin_read_write"
on public.leaflet_preparation_pages
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

create policy "leaflet_preparation_storage_admin_read_write"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'leaflet-preparation'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
)
with check (
  bucket_id = 'leaflet-preparation'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('supervisor', 'admin')
  )
);
