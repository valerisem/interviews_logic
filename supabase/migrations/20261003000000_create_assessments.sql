-- Candidate assessments: one row per assessment link.
create table if not exists public.assessments (
  id                      uuid primary key default gen_random_uuid(),
  token                   text not null unique,

  -- Candidate
  candidate_name          text not null,
  candidate_email         text not null,
  role                    text not null,
  recruiter_email         text,

  -- Assessment set-up
  assessment_version      text not null,
  time_limit_seconds      integer not null check (time_limit_seconds between 60 and 14400),
  status                  text not null default 'invited'
                          check (status in ('invited', 'in_progress', 'completed')),
  seed                    bigint,

  -- Questions received (with correct answers), answers submitted, correct answers
  questions               jsonb,
  answers                 jsonb not null default '[]'::jsonb,
  correct_answers         jsonb,
  current_index           integer not null default 0,

  -- Results (accuracy only; completion time is kept separately)
  overall_score           integer check (overall_score between 0 and 100),
  correct_count           integer,
  category_scores         jsonb,

  -- Timing and behaviour
  started_at              timestamptz,
  completed_at            timestamptz,
  completion_time_seconds integer,
  timed_out               boolean not null default false,
  tab_leave_count         integer not null default 0,

  created_at              timestamptz not null default now()
);

create index if not exists assessments_created_at_idx on public.assessments (created_at desc);

-- The app talks to this table only from the server with the service role key.
-- RLS is enabled with no policies, so the anon/public key cannot read or write it.
alter table public.assessments enable row level security;

-- Atomic counter for the number of times a candidate left the assessment tab.
create or replace function public.increment_tab_leave(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.assessments
     set tab_leave_count = tab_leave_count + 1
   where token = p_token
     and status = 'in_progress';
$$;

revoke all on function public.increment_tab_leave(text) from public, anon, authenticated;
grant execute on function public.increment_tab_leave(text) to service_role;
