-- ── Automatic Notification Triggers ─────────────────────────────────────────
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → Paste → Run).
-- These triggers fire on the database side, so notifications are created even
-- when no specific client is actively watching.

-- Enable Realtime for notifications so the push relay in AppContext works.
-- If this fails with "already a member", it's already enabled — ignore the error.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ─── 1. Goal Assigned ─────────────────────────────────────────────────────────
-- Fires when a new row is inserted into goals.
-- Idempotent: skips if a notification for this goal already exists.

CREATE OR REPLACE FUNCTION public.handle_goal_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE recipient_id = NEW.employee_id
      AND type = 'goal_assigned'
      AND related_goal_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, related_goal_id, related_employee_id)
  VALUES (
    NEW.employee_id,
    'goal_assigned',
    'New Goal Assigned',
    'A new ' || NEW.quarter || ' goal has been assigned: "' || NEW.title || '".',
    false,
    now(),
    NEW.id,
    NEW.employee_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_goal_assigned ON goals;
CREATE TRIGGER on_goal_assigned
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_goal_inserted();


-- ─── 2. Employee Onboarded ────────────────────────────────────────────────────
-- Fires when a profile's manager_id transitions from NULL to a value (first assignment).
-- Creates notifications for the manager and for the new employee.

CREATE OR REPLACE FUNCTION public.handle_manager_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  full_name text;
BEGIN
  IF NEW.manager_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.manager_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.role != 'employee' THEN RETURN NEW; END IF;

  full_name := NEW.first_name || ' ' || NEW.last_name;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE recipient_id = NEW.manager_id
      AND type = 'onboarding_complete'
      AND related_employee_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, related_employee_id)
  VALUES (
    NEW.manager_id,
    'onboarding_complete',
    'New Employee Onboarded',
    full_name || ' has been added to your team. Please set their goals within the first two weeks.',
    false,
    now(),
    NEW.id
  );

  INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, related_employee_id)
  VALUES (
    NEW.id,
    'onboarding_complete',
    'Welcome to GrowTracker!',
    'You have been onboarded and your reporting manager has been assigned. Your manager will set your goals soon.',
    false,
    now(),
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_manager_assigned ON profiles;
CREATE TRIGGER on_manager_assigned
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manager_assigned();


-- ─── 3. Fiscal Year Complete ──────────────────────────────────────────────────
-- Fires when a goal's status changes to 'approved' or 'rejected'.
-- Checks if ALL goals are finalized, computes the FY performance score
-- (average of Q1 and Q2 weighted scores), then notifies employee, manager,
-- and all admins with role-specific messages.

CREATE OR REPLACE FUNCTION public.handle_fy_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_goals INTEGER;
  final_goals INTEGER;
  emp         RECORD;
  admin_rec   RECORD;
  q1_score    NUMERIC;
  q2_score    NUMERIC;
  fy_score    NUMERIC;
  score_pct   text;
  emp_msg     text;
  mgr_msg     text;
  admin_msg   text;
  fy_title    text;
BEGIN
  IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO total_goals FROM goals WHERE employee_id = NEW.employee_id;
  SELECT COUNT(*) INTO final_goals FROM goals
    WHERE employee_id = NEW.employee_id AND status IN ('approved', 'rejected');

  IF total_goals = 0 OR total_goals != final_goals THEN RETURN NEW; END IF;

  SELECT * INTO emp FROM profiles WHERE id = NEW.employee_id;

  IF emp.status = 'completed_fiscal_year' THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE recipient_id = NEW.employee_id AND type = 'fiscal_year_complete'
  ) THEN
    RETURN NEW;
  END IF;

  -- ── Compute FY performance score ─────────────────────────────────
  -- Formula: Σ(weight × manager_rating/5) / Σ(weight) per quarter, then average.
  -- manager_rating is 1–5; result is expressed as a whole-number percentage.

  SELECT
    CASE WHEN SUM(weight) > 0 THEN
      ROUND(SUM(weight::numeric * COALESCE(manager_rating, 0) / 5.0) / SUM(weight) * 100)
    ELSE NULL END
  INTO q1_score
  FROM goals
  WHERE employee_id = NEW.employee_id
    AND quarter = 'Q1'
    AND status IN ('approved', 'rejected');

  SELECT
    CASE WHEN SUM(weight) > 0 THEN
      ROUND(SUM(weight::numeric * COALESCE(manager_rating, 0) / 5.0) / SUM(weight) * 100)
    ELSE NULL END
  INTO q2_score
  FROM goals
  WHERE employee_id = NEW.employee_id
    AND quarter = 'Q2'
    AND status IN ('approved', 'rejected');

  IF q1_score IS NOT NULL AND q2_score IS NOT NULL THEN
    fy_score := ROUND((q1_score + q2_score) / 2.0);
  ELSIF q1_score IS NOT NULL THEN
    fy_score := q1_score;
  ELSIF q2_score IS NOT NULL THEN
    fy_score := q2_score;
  ELSE
    fy_score := 0;
  END IF;

  score_pct  := fy_score::text || '%';
  fy_title   := emp.first_name || '''s FY Complete';
  emp_msg    := 'Your Fiscal Year 2026 is complete! Your average performance score is '
                || score_pct || '.';
  mgr_msg    := emp.first_name || ' ' || emp.last_name
                || ' has completed their Fiscal Year 2026 and scored ' || score_pct || '.';
  admin_msg  := emp.first_name || ' ' || emp.last_name
                || ' has finished their Fiscal Year 2026.';

  -- Notify the employee
  INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at)
  VALUES (NEW.employee_id, 'fiscal_year_complete', 'FY 2026 Complete', emp_msg, false, now());

  -- Notify the manager
  IF emp.manager_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, related_employee_id)
    VALUES (emp.manager_id, 'fiscal_year_complete', fy_title, mgr_msg, false, now(), NEW.employee_id);
  END IF;

  -- Notify every admin (skip if already the manager to avoid duplicate)
  FOR admin_rec IN
    SELECT id FROM profiles
    WHERE role = 'admin' AND id IS DISTINCT FROM emp.manager_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE recipient_id = admin_rec.id
        AND type = 'fiscal_year_complete'
        AND related_employee_id = NEW.employee_id
    ) THEN
      INSERT INTO notifications (recipient_id, type, title, message, is_read, created_at, related_employee_id)
      VALUES (admin_rec.id, 'fiscal_year_complete', fy_title, admin_msg, false, now(), NEW.employee_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_fy_complete ON goals;
CREATE TRIGGER on_fy_complete
  AFTER UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fy_complete();
