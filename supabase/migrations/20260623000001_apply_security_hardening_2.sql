-- ============================================================
-- GrowTracker — Apply security hardening 2 (previously failed)
-- The 20260619000020 migration rolled back because one attachment
-- exceeded the 5MB limit. This migration deletes that row first
-- then re-applies all statements from that migration.
-- ============================================================

-- Remove the single attachment that violated the 5MB constraint
DELETE FROM public.attachments WHERE size > 5242880;

-- ── Fix 1: goals UPDATE — lock employee_id with WITH CHECK ──────────────────
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
DROP POLICY IF EXISTS "notifications: update own" ON public.notifications;

CREATE POLICY "notifications: update own" ON public.notifications
  FOR UPDATE
  USING  (recipient_id = auth.uid())
  WITH CHECK (
    recipient_id = auth.uid()
    AND is_read  = true
  );

-- ── Fix 3: atomic rate-limiting function ────────────────────────────────────
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
  v_lock_key := hashtext(
    p_user_id::text || '|' || p_endpoint || '|' || CURRENT_DATE::text
  )::bigint;

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

-- ── Fix 4a: attachments — enforce 5 MB size limit ────────────────────────────
ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_size_limit
  CHECK (size IS NULL OR size <= 5242880);

-- ── Fix 4b: attachments INSERT — add MIME type allowlist ─────────────────────
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
