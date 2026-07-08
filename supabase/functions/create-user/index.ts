import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  // Verify caller is authenticated and is an admin using their JWT
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await callerClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response('Forbidden: admin only', { status: 403 })
  }

  let body: {
    email?: string
    tempPassword?: string
    firstName?: string
    lastName?: string
    username?: string
    role?: string
    department?: string
    designation?: string
    mobile?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 })
  }

  const { email, tempPassword, firstName, lastName, username, role = 'employee', department, designation, mobile } = body

  if (!email || !tempPassword || !firstName || !lastName || !username) {
    return new Response('Bad Request: required fields missing', { status: 400 })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name:  firstName,
      last_name:   lastName,
      username,
      mobile:      mobile ?? null,
      department:  department ?? '',
      designation: designation ?? '',
    },
  })

  if (error || !authData.user) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Could not create user' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (role !== 'employee') {
    const { error: roleErr } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', authData.user.id)
    if (roleErr) {
      return new Response(
        JSON.stringify({ error: `Account created but role assignment failed: ${roleErr.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (!profile) {
    return new Response(
      JSON.stringify({ error: 'Profile not created for new user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ profile }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
