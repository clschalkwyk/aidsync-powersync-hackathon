alter table public.interaction_checks
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create index if not exists interaction_checks_reviewed_at_idx
  on public.interaction_checks (reviewed_at);

create index if not exists interaction_checks_reviewed_by_idx
  on public.interaction_checks (reviewed_by);
