create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  full_name text not null,
  dob date,
  sex text,
  pregnancy_status text,
  location_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen_name text not null,
  allergen_type text,
  severity text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint patient_allergies_severity_check
    check (severity is null or severity in ('low', 'medium', 'high', 'severe'))
);

create table if not exists public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  condition_name text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.current_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  med_name text not null,
  active_ingredients_json jsonb not null default '[]'::jsonb,
  dose_text text,
  route_text text,
  started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinician_id uuid,
  encounter_type text,
  notes_text text,
  ai_summary text,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint encounters_status_check
    check (status in ('draft', 'in_progress', 'completed', 'cancelled', 'synced'))
);

create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  temperature_c numeric(4, 1),
  pulse_bpm integer,
  blood_pressure_sys integer,
  blood_pressure_dia integer,
  spo2 integer,
  respiration_rate integer,
  weight_kg numeric(5, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scanned_inserts (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  image_path text,
  raw_ocr_text text,
  extracted_json jsonb not null default '{}'::jsonb,
  extraction_confidence numeric(4, 3),
  extraction_status text not null default 'pending',
  reviewed_by_clinician boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scanned_inserts_extraction_status_check
    check (extraction_status in ('pending', 'processing', 'completed', 'failed', 'reviewed')),
  constraint scanned_inserts_extraction_confidence_check
    check (
      extraction_confidence is null
      or (extraction_confidence >= 0 and extraction_confidence <= 1)
    )
);

create table if not exists public.interaction_checks (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  scanned_insert_id uuid references public.scanned_inserts(id) on delete set null,
  result_status text not null default 'manual_review_required',
  severity text not null default 'yellow',
  warnings_json jsonb not null default '[]'::jsonb,
  clinician_action text,
  clinician_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint interaction_checks_result_status_check
    check (result_status in ('no_match', 'warning_found', 'manual_review_required', 'dismissed')),
  constraint interaction_checks_severity_check
    check (severity in ('green', 'yellow', 'red')),
  constraint interaction_checks_clinician_action_check
    check (clinician_action is null or clinician_action in ('accept', 'dismiss', 'note'))
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists patients_external_id_idx
  on public.patients (external_id);

create index if not exists patients_full_name_idx
  on public.patients (full_name);

create index if not exists patient_allergies_patient_id_idx
  on public.patient_allergies (patient_id);

create index if not exists patient_conditions_patient_id_idx
  on public.patient_conditions (patient_id);

create index if not exists current_medications_patient_id_idx
  on public.current_medications (patient_id);

create index if not exists encounters_patient_id_idx
  on public.encounters (patient_id);

create index if not exists encounters_clinician_id_idx
  on public.encounters (clinician_id);

create index if not exists encounters_created_at_idx
  on public.encounters (created_at desc);

create index if not exists vitals_encounter_id_idx
  on public.vitals (encounter_id);

create index if not exists scanned_inserts_encounter_id_idx
  on public.scanned_inserts (encounter_id);

create index if not exists interaction_checks_encounter_id_idx
  on public.interaction_checks (encounter_id);

create index if not exists interaction_checks_scanned_insert_id_idx
  on public.interaction_checks (scanned_insert_id);

create index if not exists attachments_encounter_id_idx
  on public.attachments (encounter_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
before update on public.patients
for each row
execute function public.set_updated_at();

drop trigger if exists patient_allergies_set_updated_at on public.patient_allergies;
create trigger patient_allergies_set_updated_at
before update on public.patient_allergies
for each row
execute function public.set_updated_at();

drop trigger if exists patient_conditions_set_updated_at on public.patient_conditions;
create trigger patient_conditions_set_updated_at
before update on public.patient_conditions
for each row
execute function public.set_updated_at();

drop trigger if exists current_medications_set_updated_at on public.current_medications;
create trigger current_medications_set_updated_at
before update on public.current_medications
for each row
execute function public.set_updated_at();

drop trigger if exists encounters_set_updated_at on public.encounters;
create trigger encounters_set_updated_at
before update on public.encounters
for each row
execute function public.set_updated_at();

drop trigger if exists vitals_set_updated_at on public.vitals;
create trigger vitals_set_updated_at
before update on public.vitals
for each row
execute function public.set_updated_at();

drop trigger if exists scanned_inserts_set_updated_at on public.scanned_inserts;
create trigger scanned_inserts_set_updated_at
before update on public.scanned_inserts
for each row
execute function public.set_updated_at();

drop trigger if exists interaction_checks_set_updated_at on public.interaction_checks;
create trigger interaction_checks_set_updated_at
before update on public.interaction_checks
for each row
execute function public.set_updated_at();

drop trigger if exists attachments_set_updated_at on public.attachments;
create trigger attachments_set_updated_at
before update on public.attachments
for each row
execute function public.set_updated_at();
