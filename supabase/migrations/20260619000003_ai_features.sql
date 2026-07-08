-- ── AI Reports ────────────────────────────────────────────────────────────────
-- Stores Claude-generated performance reports (per goal, quarterly, fiscal year)
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type     text          NOT NULL CHECK (report_type IN ('goal', 'quarterly', 'fiscal_year')),
  goal_id         uuid          REFERENCES public.goals(id) ON DELETE SET NULL,
  quarter         text,
  content         text          NOT NULL,
  summary         text,
  strengths       text[]        NOT NULL DEFAULT '{}',
  improvements    text[]        NOT NULL DEFAULT '{}',
  recommendations text[]        NOT NULL DEFAULT '{}',
  overall_score   numeric(4,1),
  model_used      text          NOT NULL,
  generated_at    timestamptz   NOT NULL DEFAULT now(),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- Employees see their own reports
CREATE POLICY "ai_reports_employee_select"
  ON public.ai_reports FOR SELECT
  USING (employee_id = auth.uid());

-- Managers and admins see all reports
CREATE POLICY "ai_reports_manager_select"
  ON public.ai_reports FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('manager', 'admin')
  );

-- ── AI Coaching Logs ──────────────────────────────────────────────────────────
-- Deduplication tracker so employees receive at most one coaching message per type per day
CREATE TABLE IF NOT EXISTS public.ai_coaching_logs (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coaching_type   text        NOT NULL,
  notification_id uuid        REFERENCES public.notifications(id) ON DELETE SET NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  log_date        date        NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(employee_id, coaching_type, log_date)
);

ALTER TABLE public.ai_coaching_logs ENABLE ROW LEVEL SECURITY;
-- No user-facing policies needed — Edge Functions use service role which bypasses RLS
