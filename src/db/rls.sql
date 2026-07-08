-- ============================================================
-- GrowTracker — Row Level Security policies
-- Reference copy — authoritative source is the migrations in
-- supabase/migrations/. This file is kept in sync for local
-- reference and Supabase Dashboard SQL Editor use.
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.goals         enable row level security;
alter table public.evidence      enable row level security;
alter table public.attachments   enable row level security;
alter table public.notifications enable row level security;
alter table public.daily_logs    enable row level security;

-- ── helpers ──────────────────────────────────────────────────
-- SET search_path guards against search_path injection on SECURITY DEFINER functions.
create or replace function public.my_role()
returns text language sql stable security definer
set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_manager_id()
returns uuid language sql stable security definer
set search_path = public as $$
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
-- WITH CHECK prevents regular users from elevating their own role or changing status.
create policy "profiles: update own or admin" on public.profiles
  for update
  using (
    id = auth.uid()
    or public.my_role() = 'admin'
  )
  with check (
    public.my_role() = 'admin'
    or (
      id = auth.uid()
      and role   = (select role   from public.profiles where id = auth.uid())
      and status = (select status from public.profiles where id = auth.uid())
    )
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

-- Managers and admins can update goals (approve, reject, set manager_rating).
-- WITH CHECK prevents employee_id reassignment (goal injection/removal attack).
create policy "goals: update manager or admin" on public.goals
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = goals.employee_id and p.manager_id = auth.uid()
    )
    or public.my_role() = 'admin'
  )
  with check (
    employee_id = (select employee_id from public.goals where id = goals.id)
    and (
      exists (
        select 1 from public.profiles p
        where p.id = goals.employee_id and p.manager_id = auth.uid()
      )
      or public.my_role() = 'admin'
    )
  );

-- Employees can update their own goal status (e.g. to 'submitted') but cannot
-- approve/reject or modify manager_rating.
create policy "goals: employee status update" on public.goals
  for update
  using (employee_id = auth.uid())
  with check (
    employee_id = auth.uid()
    and status not in ('approved', 'rejected')
    and manager_rating is not distinct from (
      select manager_rating from public.goals where id = goals.id
    )
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

-- Employees can resubmit their own evidence but MUST reset to pending state
-- (cannot set status='approved' or forge manager fields).
create policy "evidence: employee resubmit" on public.evidence
  for update
  using (
    exists (
      select 1 from public.goals g
      where g.id = evidence.goal_id and g.employee_id = auth.uid()
    )
  )
  with check (
    status = 'pending'
    and manager_feedback is null
    and reviewed_at is null
  );

-- Managers and admins can update all evidence fields (approve, reject, leave feedback).
create policy "evidence: manager review" on public.evidence
  for update
  using (
    exists (
      select 1 from public.goals g
      join public.profiles p on p.id = g.employee_id
      where g.id = evidence.goal_id
        and (p.manager_id = auth.uid() or public.my_role() = 'admin')
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
    and mime_type in (
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/xml', 'text/xml'
    )
  );

-- ── notifications ─────────────────────────────────────────────
create policy "notifications: own only" on public.notifications
  for select using (recipient_id = auth.uid());

-- Clients can mark their own notifications as read.
-- WITH CHECK locks recipient_id and restricts writes to is_read=true only,
-- preventing a user from updating recipient_id to spoof a notification.
create policy "notifications: update own" on public.notifications
  for update
  using  (recipient_id = auth.uid())
  with check (
    recipient_id = auth.uid()
    and is_read  = true
  );

-- Admins can notify anyone; managers can notify their direct reports;
-- users can send self-notifications. Edge Functions (service role) bypass RLS.
create policy "notifications: restricted insert" on public.notifications
  for insert with check (
    public.my_role() = 'admin'
    or (
      public.my_role() = 'manager'
      and exists (
        select 1 from public.profiles p
        where p.id = recipient_id and p.manager_id = auth.uid()
      )
    )
    or recipient_id = auth.uid()
  );

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
