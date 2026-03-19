alter table public.encounters
  add column if not exists supervisor_review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create index if not exists encounters_reviewed_at_idx
  on public.encounters (reviewed_at);

create index if not exists encounters_reviewed_by_idx
  on public.encounters (reviewed_by);
