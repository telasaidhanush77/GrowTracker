#!/usr/bin/env node
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gzsnktmtisgvrprplqfy.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwMjAzMSwiZXhwIjoyMDk3Mzc4MDMxfQ.' +
  'X18bnXdhgDllbpV6dcKET0OMEBWrumE6rJZafSrIc5k';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  // Fetch all manager/employee profiles (which have the new gmail addresses)
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, username, role, email, first_name, last_name')
    .in('role', ['manager', 'employee']);

  if (error) { console.error('Failed to fetch profiles:', error.message); process.exit(1); }

  console.log(`\nSyncing auth email for ${profiles.length} profile(s)...\n`);

  let ok = 0, fail = 0;
  for (const p of profiles) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(p.id, {
      email: p.email,
      email_confirm: true,
    });
    if (updateErr) {
      console.error(`  ✗ ${p.username} → ${p.email} : ${updateErr.message}`);
      fail++;
    } else {
      console.log(`  ✓ ${p.username} → ${p.email}`);
      ok++;
    }
  }

  console.log(`\nDone. ${ok} updated${fail ? `, ${fail} failed` : ''}.\n`);
  console.log('Password for all accounts: GrowTracker@123\n');
})();
