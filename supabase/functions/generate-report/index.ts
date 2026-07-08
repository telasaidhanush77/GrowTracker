import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ────────────────────────────────────────────────────────────────────
const APP_ORIGIN = Deno.env.get('APP_ORIGIN')
if (!APP_ORIGIN) {
  console.warn('[generate-report] APP_ORIGIN not configured — web CORS calls will be blocked by browsers.')
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

// ── Rate limiting ────────────────────────────────────────────────────────────
const DAILY_LIMIT = 10

// ── UUID validation ─────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_REPORT_TYPES = ['goal', 'quarterly', 'fiscal_year'] as const
type ReportType = typeof VALID_REPORT_TYPES[number]

interface ReportData {
  summary: string
  content: string
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  score: number
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
    // ── Auth ──────────────────────────────────────────────────────────────
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

    // ── Rate limit ────────────────────────────────────────────────────────
    const { data: allowed, error: rateError } = await serviceClient.rpc('check_and_log_call', {
      p_user_id: user.id,
      p_endpoint: 'generate-report',
      p_limit: DAILY_LIMIT,
    })
    if (rateError || !allowed) {
      return json({ error: `Rate limit exceeded. Maximum ${DAILY_LIMIT} reports per day.` }, 429)
    }

    // ── Input validation ──────────────────────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { employeeId, reportType, goalId, quarter } = body

    if (typeof employeeId !== 'string' || !UUID_RE.test(employeeId)) {
      return json({ error: 'Invalid or missing employeeId' }, 400)
    }
    if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
      return json({ error: `Invalid reportType. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` }, 400)
    }
    if (goalId !== undefined && (typeof goalId !== 'string' || !UUID_RE.test(goalId))) {
      return json({ error: 'Invalid goalId' }, 400)
    }
    if (quarter !== undefined && typeof quarter !== 'string') {
      return json({ error: 'Invalid quarter' }, 400)
    }

    const validatedReportType = reportType as ReportType
    const validatedGoalId = goalId as string | undefined
    const validatedQuarter = quarter as string | undefined

    // ── Authorization ──────────────────────────────────────────────────────
    const { data: callerProfile } = await serviceClient
      .from('profiles').select('role, id').eq('id', user.id).single()

    const { data: targetProfile } = await serviceClient
      .from('profiles').select('*').eq('id', employeeId).single()

    if (!callerProfile || !targetProfile) return json({ error: 'Profile not found' }, 404)

    const isOwn     = callerProfile.id === employeeId
    const isManager = callerProfile.role === 'manager' && targetProfile.manager_id === callerProfile.id
    const isAdmin   = callerProfile.role === 'admin'

    if (!isOwn && !isManager && !isAdmin) return json({ error: 'Forbidden' }, 403)

    // ── Fetch goals + evidence ─────────────────────────────────────────────
    let goalsQuery = serviceClient
      .from('goals')
      .select('*, evidence(*)')
      .eq('employee_id', employeeId)

    if (validatedReportType === 'goal' && validatedGoalId) {
      goalsQuery = goalsQuery.eq('id', validatedGoalId)
    } else if (validatedReportType === 'quarterly' && validatedQuarter) {
      goalsQuery = goalsQuery.eq('quarter', validatedQuarter)
    }

    const { data: goals } = await goalsQuery
    if (!goals || goals.length === 0) return json({ error: 'No goals found for this employee' }, 404)

    // ── Build prompt ───────────────────────────────────────────────────────
    const employeeName = `${targetProfile.first_name} ${targetProfile.last_name}`
    const reportLabel =
      validatedReportType === 'goal'      ? 'Individual Goal' :
      validatedReportType === 'quarterly' ? `${validatedQuarter} Quarterly` :
                                            'Fiscal Year'

    const goalsText = goals.map((g: Record<string, unknown>) => {
      const evArr = Array.isArray(g.evidence) ? g.evidence : (g.evidence ? [g.evidence] : [])
      const ev = evArr[0] as Record<string, unknown> | undefined
      return [
        `Goal: ${g.title}`,
        `Quarter: ${g.quarter} | Category: ${g.category} | Priority: ${g.priority} | Weight: ${g.weight} credits`,
        `Status: ${g.status} | Target Date: ${g.target_date}`,
        `Description: ${g.description}`,
        ev
          ? [
              `Evidence Description: ${ev.description || 'None'}`,
              `Self Rating: ${ev.self_rating ? ev.self_rating + '/5' : 'Not rated'}`,
              `Manager Rating: ${g.manager_rating ? g.manager_rating + '/5' : 'Not rated'}`,
              `Manager Feedback: ${ev.manager_feedback || 'None'}`,
              `Evidence Status: ${ev.status}`,
            ].join('\n')
          : 'No evidence submitted',
      ].join('\n')
    }).join('\n\n---\n\n')

    const prompt = `You are an expert HR performance analyst generating a ${reportLabel} performance report.

Employee: ${employeeName}
Designation: ${targetProfile.designation}
Department: ${targetProfile.department}

Performance Data:
${goalsText}

Generate a comprehensive, professional performance report. Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "summary": "2-3 sentence executive summary highlighting key performance outcomes",
  "content": "Full detailed narrative (4-5 paragraphs covering: performance highlights, goal achievement analysis, collaboration and work quality, growth trajectory, and forward-looking outlook)",
  "strengths": ["Specific strength with evidence from the data", "Second strength", "Third strength"],
  "improvements": ["Specific area with actionable context", "Second area"],
  "recommendations": ["Concrete coaching recommendation", "Second recommendation", "Third recommendation"],
  "score": 78
}

Score guidelines: 90-100=exceptional, 75-89=strong, 60-74=meeting expectations, 45-59=needs improvement, below 45=at risk. Base it on goal completion rate, manager ratings, evidence quality, and submission timeliness. Use ${employeeName}'s actual name throughout the content.`

    // ── Call AI model via OpenRouter ───────────────────────────────────────
    const raw = await callGroq(prompt, 2048, 'llama-3.3-70b-versatile')

    let reportData: ReportData
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      reportData = JSON.parse(match ? match[0] : raw) as ReportData
    } catch {
      console.error('AI response parse error:', raw.substring(0, 200))
      return json({ error: 'Failed to parse AI response. Please try again.' }, 500)
    }

    // ── Persist ────────────────────────────────────────────────────────────
    const { data: saved, error: saveError } = await serviceClient
      .from('ai_reports')
      .insert({
        employee_id:     employeeId,
        report_type:     validatedReportType,
        goal_id:         validatedGoalId ?? null,
        quarter:         validatedQuarter ?? null,
        content:         reportData.content,
        summary:         reportData.summary,
        strengths:       reportData.strengths ?? [],
        improvements:    reportData.improvements ?? [],
        recommendations: reportData.recommendations ?? [],
        overall_score:   reportData.score ?? null,
        model_used:      'llama-3.3-70b-versatile',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save report:', saveError.message)
      return json({ error: 'Failed to save report' }, 500)
    }

    return json({ ok: true, report: saved })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Unhandled error in generate-report:', msg)
    return json({ error: msg }, 500)
  }
})
