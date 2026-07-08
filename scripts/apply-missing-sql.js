#!/usr/bin/env node
'use strict';

// Applies the SQL from security_hardening_2 migration that failed due to
// existing attachments violating the 5MB constraint. Applies everything EXCEPT
// that constraint, which we'll handle separately.

const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwMjAzMSwiZXhwIjoyMDk3Mzc4MDMxfQ.' +
  'X18bnXdhgDllbpV6dcKET0OMEBWrumE6rJZafSrIc5k';
const SUPABASE_URL = 'https://gzsnktmtisgvrprplqfy.supabase.co';

const { createClient } = require('@supabase/supabase-js');
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// SQL statements to execute individually
const statements = [
  // Fix 1: goals UPDATE policy
  `DROP POLICY IF EXISTS "goals: update manager or admin" ON public.goals`,
  `CREATE POLICY "goals: update manager or admin" ON public.goals
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
    )`,

  // Fix 2: notifications UPDATE policy
  `DROP POLICY IF EXISTS "notifications: update own" ON public.notifications`,
  `CREATE POLICY "notifications: update own" ON public.notifications
    FOR UPDATE
    USING  (recipient_id = auth.uid())
    WITH CHECK (
      recipient_id = auth.uid()
      AND is_read  = true
    )`,

  // Fix 3: check_and_log_call function (the one that was missing)
  `CREATE OR REPLACE FUNCTION public.check_and_log_call(
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
  $$`,

  // Fix 4b: attachments INSERT policy (MIME type allowlist) - skip the size constraint
  `DROP POLICY IF EXISTS "attachments: insert own goals" ON public.attachments`,
  `CREATE POLICY "attachments: insert own goals" ON public.attachments
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
    )`,

  // Fix 5: get_email_by_identifier with minimum length
  `CREATE OR REPLACE FUNCTION public.get_email_by_identifier(p_identifier text)
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
  $$`,
];

(async () => {
  console.log('Applying missing SQL statements...\n');
  let ok = 0, fail = 0;

  for (const sql of statements) {
    const label = sql.trim().split('\n')[0].substring(0, 70);
    const { error } = await db.rpc('exec_sql', { query: sql }).throwOnError()
      .catch(async () => {
        // exec_sql may not exist — use pg REST directly via sql endpoint
        return { error: { message: 'exec_sql not available' } };
      });

    if (error) {
      // Fall back: use the pg connection directly
      // Since we can't run raw SQL via REST without a custom function,
      // we'll use the supabase management API
      console.log(`  SKIP (no direct SQL): ${label.substring(0, 60)}`);
      fail++;
    } else {
      console.log(`  ✓ ${label.substring(0, 60)}`);
      ok++;
    }
  }

  console.log(`\nDone. ${ok} applied, ${fail} skipped.`);
  console.log('\nIf skipped, run via Supabase SQL Editor in the dashboard.');
})();
