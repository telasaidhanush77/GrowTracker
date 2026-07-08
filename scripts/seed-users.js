// Seed script — creates 3 managers and 7 employees in Supabase
// Run with: node scripts/seed-users.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gzsnktmtisgvrprplqfy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c25rdG10aXNndnJwcnBscWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDIwMzEsImV4cCI6MjA5NzM3ODAzMX0.VOHz4dW_SQq0wIClXcEZNhkE1WZuT8rf3oEE_adpRis';

const DEFAULT_PASSWORD = 'GrowTracker@123';

// ── User definitions ──────────────────────────────────────────────────────────

const MANAGERS = [
  {
    firstName: 'Ramesh',
    lastName: 'Kumar',
    email: 'ramesh.kumar@growtracker.app',
    username: 'ramesh.kumar',
    role: 'manager',
    department: 'Engineering',
    designation: 'Engineering Manager',
    mobile: '+91 98100 11001',
  },
  {
    firstName: 'Siddharth',
    lastName: 'Sharma',
    email: 'siddharth.sharma@growtracker.app',
    username: 'siddharth.sharma',
    role: 'manager',
    department: 'Product',
    designation: 'Product Manager',
    mobile: '+91 98100 11002',
  },
  {
    firstName: 'Daksh',
    lastName: 'Mehta',
    email: 'daksh.mehta@growtracker.app',
    username: 'daksh.mehta',
    role: 'manager',
    department: 'Design',
    designation: 'Design Lead',
    mobile: '+91 98100 11003',
  },
];

const EMPLOYEES_RAW = [
  {
    firstName: 'Ram',
    lastName: 'Singh',
    email: 'ram.singh@growtracker.app',
    username: 'ram.singh',
    department: 'Engineering',
    designation: 'Software Engineer',
    mobile: '+91 98200 21001',
    managerKey: 0, // index into managers array (after they're created)
  },
  {
    firstName: 'Kiran',
    lastName: 'Patel',
    email: 'kiran.patel@growtracker.app',
    username: 'kiran.patel',
    department: 'Engineering',
    designation: 'Backend Developer',
    mobile: '+91 98200 21002',
    managerKey: 0,
  },
  {
    firstName: 'Josh',
    lastName: 'Martin',
    email: 'josh.martin@growtracker.app',
    username: 'josh.martin',
    department: 'Engineering',
    designation: 'Frontend Developer',
    mobile: '+91 98200 21003',
    managerKey: 0,
  },
  {
    firstName: 'Jivan',
    lastName: 'Mehta',
    email: 'jivan.mehta@growtracker.app',
    username: 'jivan.mehta',
    department: 'Product',
    designation: 'Product Analyst',
    mobile: '+91 98200 21004',
    managerKey: 1,
  },
  {
    firstName: 'Jay',
    lastName: 'Shah',
    email: 'jay.shah@growtracker.app',
    username: 'jay.shah',
    department: 'Product',
    designation: 'Business Analyst',
    mobile: '+91 98200 21005',
    managerKey: 1,
  },
  {
    firstName: 'Kimmy',
    lastName: 'Lee',
    email: 'kimmy.lee@growtracker.app',
    username: 'kimmy.lee',
    department: 'Design',
    designation: 'UI Designer',
    mobile: '+91 98200 21006',
    managerKey: 2,
  },
  {
    firstName: 'Rajesh',
    lastName: 'Verma',
    email: 'rajesh.verma@growtracker.app',
    username: 'rajesh.verma',
    department: 'Design',
    designation: 'UX Researcher',
    mobile: '+91 98200 21007',
    managerKey: 2,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createUser(supabase, userData) {
  const { firstName, lastName, email, username, role, department, designation, mobile, managerId } = userData;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: DEFAULT_PASSWORD,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        username,
        role: role ?? 'employee',
        mobile: mobile ?? null,
        department: department ?? '',
        designation: designation ?? '',
        manager_id: managerId ?? null,
      },
    },
  });

  // Always sign out after creation so the next signUp starts clean
  await supabase.auth.signOut();

  if (error) {
    // "User already registered" is not fatal — skip it
    if (error.message?.toLowerCase().includes('already registered')) {
      console.log(`  ⚠  ${firstName} ${lastName} already exists — skipped`);
      return null;
    }
    throw new Error(`Failed to create ${firstName} ${lastName}: ${error.message}`);
  }

  return data?.user?.id ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('=== GrowTracker User Seed ===\n');

  // ── Phase 1: create managers ──────────────────────────────────────────────
  console.log('Creating managers…');
  const managerIds = [];

  for (const mgr of MANAGERS) {
    process.stdout.write(`  Creating ${mgr.firstName} ${mgr.lastName} (${mgr.role})… `);
    try {
      const id = await createUser(supabase, mgr);
      if (id) {
        console.log(`✓  (id: ${id})`);
      }
      managerIds.push(id); // null if already existed
    } catch (err) {
      console.log(`✗  ${err.message}`);
      managerIds.push(null);
    }
    await sleep(1200); // respect Supabase rate limits
  }

  // ── Phase 1b: fetch manager profile IDs by email ─────────────────────────
  // (needed so we can assign manager_id to employees)
  console.log('\nLooking up manager profile IDs…');
  const resolvedManagerIds = [];

  for (const mgr of MANAGERS) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name')
      .eq('email', mgr.email)
      .single();

    if (error || !data) {
      console.log(`  ⚠  Could not find profile for ${mgr.email} — employees under this manager won't be linked`);
      resolvedManagerIds.push(null);
    } else {
      console.log(`  ${data.first_name}: ${data.id}`);
      resolvedManagerIds.push(data.id);
    }
  }

  // ── Phase 2: create employees ─────────────────────────────────────────────
  console.log('\nCreating employees…');

  for (const emp of EMPLOYEES_RAW) {
    const managerId = resolvedManagerIds[emp.managerKey] ?? null;
    const managerName = MANAGERS[emp.managerKey]?.firstName ?? '?';

    process.stdout.write(`  Creating ${emp.firstName} ${emp.lastName} → reports to ${managerName}… `);
    try {
      const id = await createUser(supabase, { ...emp, role: 'employee', managerId });
      if (id) {
        console.log(`✓  (id: ${id})`);
      }
    } catch (err) {
      console.log(`✗  ${err.message}`);
    }
    await sleep(1200);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=== Done ===');
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log('\nManager assignments:');
  EMPLOYEES_RAW.forEach(e => {
    console.log(`  ${e.firstName} → ${MANAGERS[e.managerKey].firstName}`);
  });
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
