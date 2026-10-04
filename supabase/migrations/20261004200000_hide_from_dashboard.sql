-- "Delete" on the dashboard hides a submission instead of removing it from the database.
alter table public.candidate_assessments
  add column if not exists hidden_at timestamptz;

comment on column public.candidate_assessments.hidden_at is
  'Set when an admin removes the submission from the dashboard. The row itself is kept.';
