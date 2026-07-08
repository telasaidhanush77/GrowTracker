-- ============================================================
-- GrowTracker — Security hardening 2
-- Fixes:
--   1. goals UPDATE missing WITH CHECK (employee_id reassignment)
--   2. notifications UPDATE missing WITH CHECK (recipient spoofing)
--   3. Atomic rate-limiting via pg_advisory_xact_lock
--   4. Attachments: size constraint + MIME type INSERT policy
--   5. get_email_by_identifier: minimum identifier length
-- ============================================================

-- ── Fix 1: goals UPDATE — lock employee_id with WITH CHECK ──────────────────
-- Without WITH CHECK a manager can change any field, including employee_id,
-- injecting a goal into another employee's performance record or erasing it
-- from the original employee's record.
DROP POLICY IF EXISTS "goals: update manager or admin" ON public.goals;

CREATE POLICY "goals: update manager or admin" ON public.goals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = goals.employee_id AND p.manager_id = auth.uid()
    )
    OR public.my_role() = 'admin'
  )
  WITH CHECK (
    -- Prevent employee_id reassignment by comparing new value to the stored value.
    -- goals.employee_id here is the NEW value; the subquery reads the CURRENT value.
    employee_id = (SELECT employee_id FROM public.goals WHERE id = goals.id)
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = goals.employee_id AND p.manager_id = auth.uid()
      )
      OR public.my_role() = 'admin'
    )
  );

-- ── Fix 2: notifications UPDATE — lock recipient_id with WITH CHECK ──────────
-- Without WITH CHECK an authenticated user can create a self-notification
-- (allowed by the restricted insert policy) then UPDATE its recipient_id to any
-- other user's UUID, spoofing system-level notifications.
-- After this fix, the only permitted update is marking a notification as read.
DROP POLICY IF EXISTS "notifications: update own" ON public.notifications;

CREATE POLICY "notifications: update own" ON public.notifications
  FOR UPDATE
  USING  (recipient_id = auth.uid())
  WITH CHECK (
    recipient_id = auth.uid()   -- recipient cannot be changed
    AND is_read  = true         -- the only valid write is marking as read
  );

-- ── Fix 3: atomic rate-limiting function ────────────────────────────────────
-- The previous two-step check-then-log pattern in the Edge Functions has a
-- TOCTOU race condition: two concurrent requests from the same user can both
-- pass checkRateLimit() before either logCall() commits, allowing quota bypass.
--
-- This function uses pg_advisory_xact_lock to serialize concurrent calls that
-- share the same user+endpoint+date key, making the count-then-insert atomic.
CREATE OR REPLACE FUNCTION public.check_and_log_call(
  p_user_id  uuid,
  p_endpoint text,
  p_limit    int
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count    int;
  v_lock_key bigint;
BEGIN
  -- Build a deterministic lock key for this user+endpoint+date.
  -- hashtext() returns an int4; cast to bigint to match pg_advisory_xact_lock signature.
  v_lock_key := hashtext(
    p_user_id::text || '|' || p_endpoint || '|' || CURRENT_DATE::text
  )::bigint;

  -- Acquire a transaction-level exclusive advisory lock.
  -- Concurrent calls with the same key block here until the first one finishes,
  -- ensuring the count-then-insert is serialized, not raced.
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COUNT(*) INTO v_count
  FROM public.api_call_log
  WHERE user_id  = p_user_id
    AND endpoint = p_endpoint
    AND call_date = CURRENT_DATE;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.api_call_log (user_id, endpoint, call_date)
  VALUES (p_user_id, p_endpoint, CURRENT_DATE);

  RETURN true;
END;
$$;

-- ── Fix 4a: attachments — enforce 5 MB size limit at the database level ──────
ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_size_limit
  CHECK (size IS NULL OR size <= 5242880);

-- ── Fix 4b: attachments INSERT — add MIME type allowlist ─────────────────────
-- Client-side file type filtering (the <input accept> attribute) is not a
-- security control — it can be bypassed by any script or API call.
-- This policy enforces the same allowlist server-side via RLS WITH CHECK.
DROP POLICY IF EXISTS "attachments: insert own goals" ON public.attachments;

CREATE POLICY "attachments: insert own goals" ON public.attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = attachments.goal_id AND g.employee_id = auth.uid()
    )
    AND mime_type IN (
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

-- ── Fix 5: get_email_by_identifier — minimum identifier length ───────────────
-- The function is callable by the anon role (needed for pre-auth username
-- lookup). A minimum length check raises the cost of sequential enumeration
-- of employee codes and usernames without breaking legitimate login flows.
CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF length(trim(p_identifier)) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(username)      = lower(trim(p_identifier))
     OR lower(employee_code) = lower(trim(p_identifier))
  LIMIT 1;

  RETURN v_email;
END;
$$;
