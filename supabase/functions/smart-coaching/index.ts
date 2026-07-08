import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ─────────────────────────────────────────────────────────────────────
const APP_ORIGIN = Deno.env.get('APP_ORIGIN')
if (!APP_ORIGIN) {
  console.warn('[smart-coaching] APP_ORIGIN not configured — web CORS calls will be blocked by browsers.')
}

const ALLOWED_ORIGINS = new Set<string>([
  ...(APP_ORIGIN ? [APP_ORIGIN] : []),
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
])

function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    base['Access-Control-Allow-Origin'] = requestOrigin
  }
  return base
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const DAILY_LIMIT = 5

// ── UUID validation ──────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type CoachingType = 'overdue_alert' | 'deadline_warning' | 'daily_log_reminder' | 'streak_milestone'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function calculateStreak(logs: Array<{ date: string }>): number {
  const dates = new Set(logs.map(l => l.date))
  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (dates.has(d.toISOString().split('T')[0])) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ── Groq chat call ──────────────────────────────────────────────────────────
async function callGroq(prompt: string, maxTokens: number, model: string): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_API_KEY secret not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '(no body)')
    throw new Error(`Groq API error ${res.status}: ${errText.substring(0, 200)}`)
  }

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = json.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('Empty response from AI model')
  return text
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: allowed, error: rateError } = await serviceClient.rpc('check_and_log_call', {
      p_user_id: user.id,
      p_endpoint: 'smart-coaching',
      p_limit: DAILY_LIMIT,
    })
    if (rateError || !allowed) {
      return json({ error: `Rate limit exceeded. Maximum ${DAILY_LIMIT} coaching runs per day.` }, 429)
    }

    const { data: callerProfile } = await serviceClient
      .from('profiles').select('role').eq('id', user.id).single()

    if (!callerProfile || !['admin', 'manager'].includes(callerProfile.role)) {
      return json({ error: 'Forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({})) as { employeeId?: string }

    if (body.employeeId !== undefined && !UUID_RE.test(String(body.employeeId))) {
      return json({ error: 'Invalid employeeId' }, 400)
    }

    let empQuery = serviceClient
      .from('profiles')
      .select('*')
      .eq('status', 'active')
      .eq('role', 'employee')

    if (body.employeeId) {
      empQuery = empQuery.eq('id', body.employeeId)
      if (callerProfile.role === 'manager') {
        empQuery = empQuery.eq('manager_id', user.id)
      }
    } else if (callerProfile.role === 'manager') {
      empQuery = empQuery.eq('manager_id', user.id)
    }

    const { data: employees } = await empQuery
    if (!employees || employees.length === 0) return json({ ok: true, sent: 0, message: 'No employees found' })

    const today = todayStr()
    const threeDays = daysFromNow(3)
    let sent = 0

    for (const emp of employees) {
      try {
        const { data: sentToday } = await serviceClient
          .from('ai_coaching_logs')
          .select('coaching_type')
          .eq('employee_id', emp.id)
          .eq('log_date', today)

        const alreadySentTypes = new Set((sentToday ?? []).map((r: { coaching_type: string }) => r.coaching_type))

        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        const { data: recentLogs } = await serviceClient
          .from('daily_logs')
          .select('date')
          .eq('employee_id', emp.id)
          .gte('date', sixtyDaysAgo.toISOString().split('T')[0])

        const streak = calculateStreak(recentLogs ?? [])
        const hasTodayLog = (recentLogs ?? []).some((l: { date: string }) => l.date === today)

        const { data: goals } = await serviceClient
          .from('goals')
          .select('title, target_date, status, quarter')
          .eq('employee_id', emp.id)
          .in('status', ['in_progress', 'not_started'])

        const overdueGoals = (goals ?? []).filter((g: { target_date: string }) => g.target_date < today)
        const upcomingDeadlines = (goals ?? []).filter(
          (g: { target_date: string }) => g.target_date >= today && g.target_date <= threeDays
        )

        let coachingType: CoachingType | null = null
        if (overdueGoals.length > 0 && !alreadySentTypes.has('overdue_alert')) {
          coachingType = 'overdue_alert'
        } else if (upcomingDeadlines.length > 0 && !alreadySentTypes.has('deadline_warning')) {
          coachingType = 'deadline_warning'
        } else if (!hasTodayLog && !alreadySentTypes.has('daily_log_reminder')) {
          coachingType = 'daily_log_reminder'
        } else if ([7, 14, 30].includes(streak) && !alreadySentTypes.has('streak_milestone')) {
          coachingType = 'streak_milestone'
        }

        if (!coachingType) continue

        const contextLines: string[] = [
          `Employee: ${emp.first_name} ${emp.last_name} (${emp.designation})`,
          `Today: ${today}`,
          `Daily log streak: ${streak} consecutive days`,
          `Filed today's log: ${hasTodayLog ? 'Yes' : 'No'}`,
          `Overdue goals: ${overdueGoals.length} (${overdueGoals.map((g: { title: string }) => g.title).join(', ') || 'none'})`,
          `Goals due in 3 days: ${upcomingDeadlines.length} (${upcomingDeadlines.map((g: { title: string }) => g.title).join(', ') || 'none'})`,
          `Coaching trigger: ${coachingType}`,
        ]

        const typeInstructions: Record<CoachingType, string> = {
          overdue_alert: 'Their goal(s) are OVERDUE. Gently but firmly acknowledge this and encourage immediate action. Mention the specific goal(s) by name.',
          deadline_warning: 'A goal deadline is approaching in the next 3 days. Create a sense of productive urgency without pressure. Name the goal(s).',
          daily_log_reminder: "They haven't logged today's activity yet. Encourage them warmly — the log helps track progress and celebrate wins.",
          streak_milestone: `They have maintained a ${streak}-day streak of daily logs. Celebrate this consistency and encourage them to keep going.`,
        }

        const coachingMsg = await callGroq(
          `You are a supportive performance coach in an employee development app.\n\n${contextLines.join('\n')}\n\nInstructions: ${typeInstructions[coachingType]}\n\nWrite a SHORT, warm, personalized coaching message (2-3 sentences max). Use the employee's first name. Be encouraging and specific — not generic. Do not use bullet points. Return ONLY the message text.`,
          200,
          'llama-3.1-8b-instant',
        ).catch(() => 'Keep up the great work!')


        const notifTitleMap: Record<CoachingType, string> = {
          overdue_alert: 'Action Required: Overdue Goal',
          deadline_warning: 'Heads Up: Deadline Approaching',
          daily_log_reminder: 'Daily Log Reminder',
          streak_milestone: `${streak}-Day Streak! 🔥`,
        }

        const { data: notif } = await serviceClient
          .from('notifications')
          .insert({
            recipient_id: emp.id,
            type: `ai_${coachingType}`,
            title: notifTitleMap[coachingType],
            message: coachingMsg,
            is_read: false,
          })
          .select('id')
          .single()

        await serviceClient.from('ai_coaching_logs').insert({
          employee_id: emp.id,
          coaching_type: coachingType,
          notification_id: notif?.id ?? null,
          log_date: today,
        })

        sent++
      } catch (empErr: unknown) {
        const msg = empErr instanceof Error ? empErr.message : 'unknown'
        console.error(`Error processing coaching for ${emp.id}:`, msg)
      }
    }

    return json({ ok: true, sent, employees_processed: employees.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Unhandled error in smart-coaching:', msg)
    return json({ error: msg }, 500)
  }
})
