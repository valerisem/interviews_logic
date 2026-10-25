-- Careers page: which published job descriptions are open. A job with no row here is open.
create table if not exists public.job_openings (
  slug text primary key,
  is_open boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Only the server (service role) reads and writes this table.
alter table public.job_openings enable row level security;

comment on table public.job_openings is
  'Open / closed state of the roles listed on /careers, set from /admin/careers. Missing row = open.';
