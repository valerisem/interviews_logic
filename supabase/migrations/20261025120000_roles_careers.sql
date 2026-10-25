-- Careers page: link each role to its job page and keep its open / closed state on the existing roles table.
alter table public.roles add column if not exists job_slug text unique;
alter table public.roles add column if not exists careers_open boolean not null default true;

comment on column public.roles.job_slug is 'The role''s job page on apply.houseofmarketer.com (/jobs/<job_slug>). Roles with a slug are listed on /careers.';
comment on column public.roles.careers_open is 'Open / closed on the careers page, set by admins on /careers.';
