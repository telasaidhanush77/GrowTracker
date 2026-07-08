#!/usr/bin/env node
'use strict';

const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6' +
  'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwMjAzMSwiZXhwIjoyMDk3Mzc4MDMxfQ.' +
  'X18bnXdhgDllbpV6dcKET0OMEBWrumE6rJZafSrIc5k';
const SUPABASE_URL = 'https://gzsnktmtisgvrprplqfy.supabase.co';

// Original emails keyed by username
const ORIGINAL_EMAILS = {
  'ramesh.kumar':    'ramesh.kumar@growtracker.app',
  'siddharth.sharma':'siddharth.sharma@growtracker.app',
  'daksh.mehta':     'daksh.mehta@growtracker.app',
  'ram.singh':       'ram.singh@growtracker.app',
  'kiran.patel':     'kiran.patel@growtracker.app',
  'josh.martin':     'josh.martin@growtracker.app',
  'jivan.mehta':     'jivan.mehta@growtracker.app',
  'jay.shah':        'jay.shah@growtracker.app',
  'kimmy.lee':       'kimmy.lee@growtracker.app',
  'rajesh.verma':    'rajesh.verma@growtracker.app',
};

async function api(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'PATCH' ? 'return=representation' : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json().catch(() => null);
}

(async () => {
  const profiles = await api('profiles?role=in.(manager,employee)&select=id,username,first_name,last_name,mobile');

  console.log(`\nRestoring original emails for ${profiles.length} profile(s)...\n`);

  for (const p of profiles) {
    const email = ORIGINAL_EMAILS[p.username];
    if (!email) { console.log(`  ? skipping unknown username: ${p.username}`); continue; }

    await api(`profiles?id=eq.${p.id}`, 'PATCH', { email });
    console.log(`  ✓ ${p.username.padEnd(20)} → ${email}  (${p.first_name} ${p.last_name}, ${p.mobile})`);
  }

  console.log('\n─'.repeat(80));
  console.log('\nLogin credentials (password same for all: GrowTracker@123)\n');
  console.log('USERNAME'.padEnd(22) + 'EMAIL'.padEnd(38) + 'NAME');
  console.log('─'.repeat(80));

  const profiles2 = await api('profiles?role=in.(manager,employee)&select=username,email,first_name,last_name,role&order=role');
  for (const p of profiles2) {
    console.log(
      p.username.padEnd(22) +
      p.email.padEnd(38) +
      `${p.first_name} ${p.last_name}`
    );
  }
  console.log('─'.repeat(80));
  console.log('\nPassword: GrowTracker@123\n');
})();
