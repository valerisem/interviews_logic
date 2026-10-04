-- Who can sign in to the recruiter dashboard (with Google, houseofmarketers.com accounts only).
-- Admins are people in public.team, referenced by team id, so their work email and
-- leaving date come from the team record. Add someone with:
--   insert into public.assessment_admins (team_id) values (<team id>);
create table if not exists public.assessment_admins (
  team_id  smallint primary key references public.team (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.assessment_admins enable row level security;

-- Valeria Semibratnya (team id 3).
insert into public.assessment_admins (team_id) values (3) on conflict do nothing;

-- True when the email belongs to a current team member on the admin list.
create or replace function public.is_assessment_admin(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.assessment_admins a
      join public.team t on t.id = a.team_id
     where lower(t.work_email) = lower(p_email)
       and (t.left_date is null or t.left_date > current_date)
  );
$$;

revoke all on function public.is_assessment_admin(text) from public, anon, authenticated;
grant execute on function public.is_assessment_admin(text) to service_role;
