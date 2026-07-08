-- ============================================================
-- GrowTracker — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
-- Extends auth.users. One row per user, created on signup.
create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  employee_code   text unique not null,
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  username        text unique not null,
  mobile          text,
  role            text not null check (role in ('admin','manager','employee')),
  department      text not null default '',
  designation     text not null default '',
  manager_id      uuid references public.profiles(id) on delete set null,
  join_date       text not null default '',
  status          text not null default 'onboarding'
                    check (status in ('onboarding','active','completed_fiscal_year')),
  avatar_initials text not null default '',
  created_at      timestamptz not null default now()
);

-- ── goals ────────────────────────────────────────────────────
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text not null default '',
  quarter     text not null check (quarter in ('Q1','Q2')),
  priority    text not null default 'medium'
                check (priority in ('high','medium','low')),
  category    text not null
                check (category in ('technical','project_delivery','soft_skills','learning','leadership')),
  target_date text not null,
  weight      integer not null default 0,
  status      text not null default 'not_started'
                check (status in ('not_started','in_progress','submitted','approved','rejected')),
  manager_rating integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── evidence ─────────────────────────────────────────────────
-- One row per goal (upserted on resubmit).
create table public.evidence (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null unique references public.goals(id) on delete cascade,
  description      text not null default '',
  links            text[] not null default '{}',
  self_rating      integer,
  submitted_at     timestamptz not null default now(),
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  manager_feedback text,
  reviewed_at      timestamptz
);

-- ── attachments ──────────────────────────────────────────────
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references public.goals(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete cascade,
  name        text not null,
  uri         text not null,
  mime_type   text not null,
  size        integer,
  created_at  timestamptz not null default now()
);

-- ── notifications ─────────────────────────────────────────────
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  recipient_id        uuid not null references public.profiles(id) on delete cascade,
  type                text not null,
  title               text not null,
  message             text not null,
  is_read             boolean not null default false,
  related_goal_id     uuid references public.goals(id) on delete set null,
  related_employee_id uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ── daily_logs ────────────────────────────────────────────────
create table public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  date        text not null,
  tasks       jsonb not null default '[]',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, date)
);

-- ── updated_at trigger ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger daily_logs_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ── auto-create profile on signup ─────────────────────────────
-- Fires after a new auth.users row is inserted.
-- Reads role / name etc from raw_user_meta_data set during signUp().
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  meta        jsonb := new.raw_user_meta_data;
  role_val    text  := coalesce(meta->>'role', 'employee');
  seq         integer;
  prefix      text;
  emp_code    text;
begin
  -- generate sequential employee code per role
  select count(*) + 1 into seq from public.profiles where role = role_val;
  prefix := case role_val
    when 'admin'    then 'ADM'
    when 'manager'  then 'MGR'
    else                 'EMP'
  end;
  emp_code := prefix || '-' || lpad(seq::text, 4, '0');

  insert into public.profiles (
    id, employee_code, first_name, last_name, email, username,
    mobile, role, department, designation, manager_id,
    join_date, status, avatar_initials
  ) values (
    new.id,
    emp_code,
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    new.email,
    coalesce(meta->>'username', split_part(new.email, '@', 1)),
    meta->>'mobile',
    role_val,
    coalesce(meta->>'department', ''),
    coalesce(meta->>'designation', ''),
    case when meta->>'manager_id' is not null
         then (meta->>'manager_id')::uuid else null end,
    to_char(now(), 'YYYY-MM-DD'),
    'onboarding',
    upper(
      substr(coalesce(meta->>'first_name','?'),1,1) ||
      substr(coalesce(meta->>'last_name','?'),1,1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
