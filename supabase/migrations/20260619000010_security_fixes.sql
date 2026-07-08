-- ============================================================
-- GrowTracker — Security hardening migration
-- Fixes: privilege escalation, evidence self-approval,
-- notification spoofing, rate limiting table,
-- and SECURITY DEFINER search_path hardening
-- ============================================================

-- ── Fix search_path on all SECURITY DEFINER helpers ─────────
-- Without SET search_path, a malicious user could create objects
-- in a schema that shadows public and intercept function calls.
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_manager_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT manager_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier text)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT email
  FROM public.profiles
  WHERE lower(username) = lower(p_identifier)
     OR lower(employee_code) = lower(p_identifier)
  LIMIT 1;
$$;

-- ── Fix 1: profiles UPDATE — add WITH CHECK to prevent role self-promotion ──
-- Without WITH CHECK, any authenticated user could update their own profile
-- row (USING passes for id = auth.uid()) and set role = 'admin', giving full
-- admin access. WITH CHECK locks the values they can write.
DROP POLICY IF EXISTS "profiles: update own or admin" ON public.profiles;

CREATE POLICY "profiles: update own or admin" ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR public.my_role() = 'admin'
  )
  WITH CHECK (
    -- Admins can change any field on any row
    public.my_role() = 'admin'
    -- Regular users can update their own row but cannot elevate role or change status
    OR (
      id = auth.uid()
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ── Fix 2: handle_new_user — never trust metadata for role ──────────────────
-- raw_user_meta_data is attacker-controlled: anyone with the anon key can call
-- supabase.auth.signUp({ options: { data: { role: 'admin' } } }) and the old
-- trigger would store that role directly. All self-registered accounts now
-- start as 'employee'. Admins assign roles explicitly after account creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  meta        jsonb := new.raw_user_meta_data;
  role_val    text  := 'employee';  -- always 'employee'; role set by admin after creation
  seq         integer;
  emp_code    text;
BEGIN
  SELECT count(*) + 1 INTO seq FROM public.profiles WHERE role = role_val;
  emp_code := 'EMP-' || lpad(seq::text, 4, '0');

  INSERT INTO public.profiles (
    id, employee_code, first_name, last_name, email, username,
    mobile, role, department, designation, manager_id,
    join_date, status, avatar_initials
  ) VALUES (
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
    NULL,  -- manager_id always set explicitly by admin after creation
    to_char(now(), 'YYYY-MM-DD'),
    'onboarding',
    upper(
      substr(coalesce(meta->>'first_name', '?'), 1, 1) ||
      substr(coalesce(meta->>'last_name', '?'), 1, 1)
    )
  );
  RETURN new;
END;
$$;

-- ── Fix 3: evidence UPDATE — split into employee resubmit + manager review ──
-- The old single policy had USING but no WITH CHECK. Without WITH CHECK,
-- an employee could update status='approved', manager_rating=5, and
-- manager_feedback='Excellent' on their own evidence, bypassing manager review.
DROP POLICY IF EXISTS "evidence: update" ON public.evidence;

-- Employees can resubmit their own evidence:
-- MUST set status='pending', MUST clear manager_feedback and reviewed_at.
-- This exactly matches what useSubmitEvidence() sends on resubmit.
CREATE POLICY "evidence: employee resubmit" ON public.evidence
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = evidence.goal_id AND g.employee_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'pending'
    AND manager_feedback IS NULL
    AND reviewed_at IS NULL
  );

-- Managers and admins can update all evidence fields (approve, reject, feedback).
-- No WITH CHECK needed: managers legitimately set any value.
CREATE POLICY "evidence: manager review" ON public.evidence
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.profiles p ON p.id = g.employee_id
      WHERE g.id = evidence.goal_id
        AND (p.manager_id = auth.uid() OR public.my_role() = 'admin')
    )
  );

-- ── Fix: employees updating their own goal status ────────────────────────────
-- The old schema had no policy for employees to update their own goals, which
-- caused useSubmitEvidence() goal status update to silently fail (0 rows, no error).
-- Employees may update their own goals but cannot approve or reject, and
-- cannot change their manager rating.
CREATE POLICY "goals: employee status update" ON public.goals
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (
    employee_id = auth.uid()
    AND status NOT IN ('approved', 'rejected')
    AND manager_rating IS NOT DISTINCT FROM (
      SELECT manager_rating FROM public.goals WHERE id = goals.id
    )
  );

-- ── Fix 5: notifications INSERT — restrict to authorized senders ─────────────
-- The old policy allowed ANY authenticated user to insert a notification for
-- ANY recipient (check was only auth.uid() is not null). This allowed employees
-- to spoof system-level notifications to managers or other employees.
DROP POLICY IF EXISTS "notifications: insert authenticated" ON public.notifications;

-- Admins can notify anyone.
-- Managers can only notify their direct reports.
-- Employees can send notifications to themselves (in-app self-alerts only).
-- Edge Functions (service role) bypass RLS entirely — no policy needed.
CREATE POLICY "notifications: restricted insert" ON public.notifications
  FOR INSERT WITH CHECK (
    public.my_role() = 'admin'
    OR (
      public.my_role() = 'manager'
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = recipient_id AND p.manager_id = auth.uid()
      )
    )
    OR recipient_id = auth.uid()
  );

-- ── Rate limiting: api_call_log table ────────────────────────────────────────
-- Used by Edge Functions to enforce per-user per-endpoint daily call limits
-- without requiring an external service (Redis/Upstash).
-- Only accessible via service role (Edge Functions); no user-facing policies.
CREATE TABLE IF NOT EXISTS public.api_call_log (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL,
  endpoint   text        NOT NULL,
  call_date  date        NOT NULL DEFAULT CURRENT_DATE,
  called_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_call_log_rate
  ON public.api_call_log (user_id, endpoint, call_date);

ALTER TABLE public.api_call_log ENABLE ROW LEVEL SECURITY;
-- No user-facing policies: only service role (Edge Functions) can read/write.
