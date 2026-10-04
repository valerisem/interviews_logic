-- Clean-up: objects no longer used by the app.
-- assessment_admins / is_assessment_admin were created for an admin list that is now the
-- ADMIN_TEAM_IDS setting (checked against public.team), and the four columns were
-- superseded in CM-2026.2. Applied to the Team project on 4 October 2026.
drop function if exists public.is_assessment_admin(text);
drop table if exists public.assessment_admins;

alter table public.candidate_assessments
  drop column if exists time_limit_seconds,
  drop column if exists timed_out,
  drop column if exists recruiter_email,
  drop column if exists correct_count;
