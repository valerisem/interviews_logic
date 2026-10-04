-- Which assessment the candidate took. The role they choose on the landing page decides it.
alter table public.candidate_assessments
  add column if not exists assessment_type text not null default 'campaign_manager'
    check (assessment_type in ('campaign_manager', 'account_manager'));
