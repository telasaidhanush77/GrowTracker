#!/usr/bin/env node
/**
 * Fetches all seeded managers & employees, assigns random realistic names/emails/phones,
 * patches Supabase, and prints a table of all updates.
 */
'use strict';

const SUPABASE_URL     = 'https://gzsnktmtisgvrprplqfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwMjAzMSwiZXhwIjoyMDk3Mzc4MDMxfQ.X18bnXdhgDllbpV6dcKET0OMEBWrumE6rJZafSrIc5k';

const FIRST_NAMES = [
  'Arjun','Priya','Rahul','Sneha','Vikram','Ananya','Karthik','Divya',
  'Rohan','Meera','Aditya','Pooja','Nikhil','Kavya','Siddharth','Isha',
  'Rajesh','Deepa','Suresh','Lakshmi','Amit','Nisha','Vijay','Swati',
  'Ganesh','Rekha','Harish','Preeti','Naveen','Sunita',
];
const LAST_NAMES = [
  'Sharma','Patel','Iyer','Reddy','Kumar','Nair','Mehta','Joshi',
  'Singh','Verma','Gupta','Pillai','Rao','Bhat','Menon','Shah',
  'Agarwal','Choudhary','Bose','Mishra','Naidu','Krishnan','Dubey','Saxena',
  'Tiwari','Chauhan','Pandey','Sinha','Kaur','Malhotra',
];
const DOMAINS = ['gmail.com','outlook.com','yahoo.com','protonmail.com','icloud.com'];

const used = { firstLast: new Set(), email: new Set(), phone: new Set() };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function uniqueName() {
  for (let i = 0; i < 100; i++) {
    const f = pick(FIRST_NAMES), l = pick(LAST_NAMES);
    const key = f + l;
    if (!used.firstLast.has(key)) { used.firstLast.add(key); return { f, l }; }
  }
  // fallback with number suffix
  const f = pick(FIRST_NAMES), l = pick(LAST_NAMES) + Math.floor(Math.random()*99+1);
  return { f, l };
}

function uniqueEmail(f, l) {
  const styles = [
    `${f.toLowerCase()}.${l.toLowerCase()}`,
    `${f.toLowerCase()}${l.toLowerCase()}`,
    `${f.toLowerCase()}_${l.toLowerCase()}`,
    `${f[0].toLowerCase()}${l.toLowerCase()}`,
  ];
  for (const s of styles) {
    for (const d of DOMAINS) {
      const e = `${s}@${d}`;
      if (!used.email.has(e)) { used.email.add(e); return e; }
    }
  }
  const e = `${f.toLowerCase()}.${l.toLowerCase()}${Math.floor(Math.random()*999)}@gmail.com`;
  used.email.add(e); return e;
}

function uniquePhone() {
  for (let i = 0; i < 200; i++) {
    const n = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    if (!used.phone.has(n)) { used.phone.add(n); return n; }
  }
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'PATCH' ? 'return=representation' : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${t}`);
  }
  return res.json().catch(() => null);
}

(async () => {
  // Fetch all managers and employees
  const profiles = await api('profiles?role=in.(manager,employee)&select=id,role,first_name,last_name,email,mobile,username,department,designation');
  if (!profiles.length) { console.log('No manager/employee profiles found.'); return; }

  console.log(`\nFound ${profiles.length} profile(s). Generating data…\n`);

  const updates = [];

  for (const p of profiles) {
    const { f, l } = uniqueName();
    const email    = uniqueEmail(f, l);
    const mobile   = uniquePhone();

    updates.push({
      id:         p.id,
      role:       p.role,
      username:   p.username,
      department: p.department,
      designation: p.designation,
      old: { first: p.first_name, last: p.last_name, email: p.email, mobile: p.mobile },
      new: { first: f, last: l, email, mobile },
    });
  }

  // Apply updates one by one
  let ok = 0, fail = 0;
  for (const u of updates) {
    try {
      await api(`profiles?id=eq.${u.id}`, 'PATCH', {
        first_name: u.new.first,
        last_name:  u.new.last,
        email:      u.new.email,
        mobile:     u.new.mobile,
      });
      ok++;
    } catch (e) {
      console.error(`  ✗ ${u.id}: ${e.message}`);
      fail++;
    }
  }

  // Print summary table
  console.log('─'.repeat(110));
  console.log(
    'ROLE'.padEnd(10) +
    'USERNAME'.padEnd(22) +
    'FIRST NAME'.padEnd(14) +
    'LAST NAME'.padEnd(16) +
    'EMAIL'.padEnd(36) +
    'PHONE'
  );
  console.log('─'.repeat(110));
  for (const u of updates) {
    console.log(
      u.role.padEnd(10) +
      (u.username || '').padEnd(22) +
      u.new.first.padEnd(14) +
      u.new.last.padEnd(16) +
      u.new.email.padEnd(36) +
      u.new.mobile
    );
  }
  console.log('─'.repeat(110));
  console.log(`\n✓ Updated ${ok} profile(s)${fail ? `, ${fail} failed` : ''}.\n`);
})();
