-- Six individually timed questions, recruiter-set extra time, and privacy-notice confirmation.

-- Extra time is a multiplier on every question's timer (1 = standard, 1.5 = +50%).
-- The reason for an adjustment is deliberately not stored anywhere.
alter table public.candidate_assessments
  add column if not exists time_multiplier numeric(4,2) not null default 1
    check (time_multiplier between 1 and 3),
  add column if not exists question_started_at timestamptz,
  add column if not exists question_scores jsonb,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_ack_at timestamptz;

-- Superseded by per-question timers, time_multiplier and question_scores. Left in place
-- (unused, optional) so the change needs no table rewrite; they can be dropped later.
alter table public.candidate_assessments alter column time_limit_seconds drop not null;
comment on column public.candidate_assessments.time_limit_seconds is 'Unused since CM-2026.2 (per-question timers).';
comment on column public.candidate_assessments.timed_out is 'Unused since CM-2026.2 (recorded per answer).';
comment on column public.candidate_assessments.recruiter_email is 'Unused since CM-2026.2 (RECRUITER_EMAIL env var).';
comment on column public.candidate_assessments.correct_count is 'Unused since CM-2026.2 (see question_scores).';
