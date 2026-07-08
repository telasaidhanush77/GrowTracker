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
-- ============================================================
-- GrowTracker — Row Level Security policies
-- Run AFTER schema.sql in Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.goals         enable row level security;
alter table public.evidence      enable row level security;
alter table public.attachments   enable row level security;
alter table public.notifications enable row level security;
alter table public.daily_logs    enable row level security;

-- ── helpers ──────────────────────────────────────────────────
-- Returns the role of the currently authenticated user.
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Returns the manager_id of the currently authenticated user.
create or replace function public.my_manager_id()
returns uuid language sql stable security definer as $$
  select manager_id from public.profiles where id = auth.uid();
$$;

-- ── profiles ─────────────────────────────────────────────────
-- Anyone can read their own profile; managers see their reports; admins see all.
create policy "profiles: read own or reports or admin" on public.profiles
  for select using (
    id = auth.uid()
    or manager_id = auth.uid()
    or public.my_role() = 'admin'
  );

-- Only the trigger (security definer) inserts profiles; direct inserts blocked.
create policy "profiles: insert via trigger only" on public.profiles
  for insert with check (false);

-- Users can update their own profile; admins can update anyone.
create policy "profiles: update own or admin" on public.profiles
  for update using (
    id = auth.uid()
    or public.my_role() = 'admin'
  );

-- Only admins can delete profiles.
create policy "profiles: delete admin only" on public.profiles
  for delete using (public.my_role() = 'admin');

-- ── goals ─────────────────────────────────────────────────────
-- Employees see their own; managers see their direct reports'; admins see all.
create policy "goals: read" on public.goals
  for select using (
    employee_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = goals.employee_id and p.manager_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

-- Only managers and admins can create goals (for their reports).
create policy "goals: insert manager or admin" on public.goals
  for insert with check (
    public.my_role() in ('manager','admin')
    and (
      exists (
        select 1 from public.profiles p
        where p.id = goals.employee_id and p.manager_id = auth.uid()
      )
      or public.my_role() = 'admin'
    )
  );

-- Same rule for updates and deletes.
create policy "goals: update manager or admin" on public.goals
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = goals.employee_id and p.manager_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

create policy "goals: delete manager or admin" on public.goals
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = goals.employee_id and p.manager_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

-- ── evidence ──────────────────────────────────────────────────
create policy "evidence: read via goal access" on public.evidence
  for select using (
    exists (
      select 1 from public.goals g
      where g.id = evidence.goal_id
      and (
        g.employee_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = g.employee_id and p.manager_id = auth.uid())
        or public.my_role() = 'admin'
      )
    )
  );

-- Employees submit evidence for their own goals.
create policy "evidence: insert own goals" on public.evidence
  for insert with check (
    exists (
      select 1 from public.goals g
      where g.id = evidence.goal_id and g.employee_id = auth.uid()
    )
  );

-- Employees can resubmit (update) their own; managers can update (review) their reports'.
create policy "evidence: update" on public.evidence
  for update using (
    exists (
      select 1 from public.goals g
      where g.id = evidence.goal_id
      and (
        g.employee_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = g.employee_id and p.manager_id = auth.uid())
        or public.my_role() = 'admin'
      )
    )
  );

-- ── attachments ───────────────────────────────────────────────
create policy "attachments: read via goal access" on public.attachments
  for select using (
    exists (
      select 1 from public.goals g
      where g.id = attachments.goal_id
      and (
        g.employee_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = g.employee_id and p.manager_id = auth.uid())
        or public.my_role() = 'admin'
      )
    )
  );

create policy "attachments: insert own goals" on public.attachments
  for insert with check (
    exists (
      select 1 from public.goals g
      where g.id = attachments.goal_id and g.employee_id = auth.uid()
    )
  );

-- ── notifications ─────────────────────────────────────────────
create policy "notifications: own only" on public.notifications
  for select using (recipient_id = auth.uid());

-- Notifications are created server-side (trigger / service role); clients only mark read.
create policy "notifications: update own" on public.notifications
  for update using (recipient_id = auth.uid());

-- Allow insert for now so app code can create notifications directly.
-- Lock this down to a Supabase Edge Function / service role in production.
create policy "notifications: insert authenticated" on public.notifications
  for insert with check (auth.uid() is not null);

-- ── daily_logs ────────────────────────────────────────────────
create policy "daily_logs: employee own; manager read reports; admin all" on public.daily_logs
  for select using (
    employee_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = daily_logs.employee_id and p.manager_id = auth.uid()
    )
    or public.my_role() = 'admin'
  );

create policy "daily_logs: insert own" on public.daily_logs
  for insert with check (employee_id = auth.uid());

create policy "daily_logs: update own" on public.daily_logs
  for update using (employee_id = auth.uid());
