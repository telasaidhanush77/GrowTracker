import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // Parse and validate the target user ID
  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 })
  }

  const { userId } = body
  if (!userId || !UUID_RE.test(userId)) {
    return new Response('Bad Request: valid userId UUID required', { status: 400 })
  }

  // Prevent admins from deleting their own account
  if (userId === user.id) {
    return new Response('Forbidden: cannot delete your own account', { status: 403 })
  }

  // Use service role key to hard-delete the auth.users row
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return new Response(
      JSON.stringify({ error: deleteError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
