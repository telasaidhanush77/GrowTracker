-- ============================================================
-- Fix manager_id links and set status = 'active' for seeded users
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Ramesh Kumar (MGR) → reports-to manager for Ram, Kiran, Josh
UPDATE public.profiles
SET manager_id = '7be94921-4924-4e54-ab7a-f2e702e077c2'
WHERE id IN (
  '8dbf4484-f01e-44ac-840d-15e7fb136f7f',  -- Ram Singh
  '12428fd0-130f-4682-a96a-aa6ee64ad696',  -- Kiran Patel
  '9e54da81-20d3-4bff-81d6-fb288df78f3b'   -- Josh Martin
);

-- Siddharth Sharma (MGR) → reports-to manager for Jivan, Jay
UPDATE public.profiles
SET manager_id = '211ad184-6fde-4076-b5f6-a16ddf1a2d4d'
WHERE id IN (
  '1dfa3cb8-ee31-4ef6-ab5f-1d4f819fbf8c',  -- Jivan Mehta
  'abaf03f1-205c-492c-8875-ef8d497bd884'   -- Jay Shah
);

-- Daksh Mehta (MGR) → reports-to manager for Kimmy, Rajesh
UPDATE public.profiles
SET manager_id = '15762416-52c6-4d7d-8200-5aab6f7254b0'
WHERE id IN (
  '0984efac-481e-4956-8ab8-9c350ed6dc69',  -- Kimmy Lee
  '2c43849f-47a9-4b58-ae6c-75b0b5de2817'   -- Rajesh Verma
);

-- Set all 10 seeded users to 'active'
UPDATE public.profiles
SET status = 'active'
WHERE id IN (
  '7be94921-4924-4e54-ab7a-f2e702e077c2',  -- Ramesh Kumar
  '211ad184-6fde-4076-b5f6-a16ddf1a2d4d',  -- Siddharth Sharma
  '15762416-52c6-4d7d-8200-5aab6f7254b0',  -- Daksh Mehta
  '8dbf4484-f01e-44ac-840d-15e7fb136f7f',  -- Ram Singh
  '12428fd0-130f-4682-a96a-aa6ee64ad696',  -- Kiran Patel
  '9e54da81-20d3-4bff-81d6-fb288df78f3b',  -- Josh Martin
  '1dfa3cb8-ee31-4ef6-ab5f-1d4f819fbf8c',  -- Jivan Mehta
  'abaf03f1-205c-492c-8875-ef8d497bd884',  -- Jay Shah
  '0984efac-481e-4956-8ab8-9c350ed6dc69',  -- Kimmy Lee
  '2c43849f-47a9-4b58-ae6c-75b0b5de2817'   -- Rajesh Verma
);

-- Verify: confirm roles and links are correct
SELECT
  first_name || ' ' || last_name  AS name,
  role,
  employee_code,
  department,
  status,
  (SELECT first_name || ' ' || last_name FROM public.profiles p2 WHERE p2.id = p.manager_id) AS reports_to
FROM public.profiles p
WHERE id IN (
  '7be94921-4924-4e54-ab7a-f2e702e077c2',
  '211ad184-6fde-4076-b5f6-a16ddf1a2d4d',
  '15762416-52c6-4d7d-8200-5aab6f7254b0',
  '8dbf4484-f01e-44ac-840d-15e7fb136f7f',
  '12428fd0-130f-4682-a96a-aa6ee64ad696',
  '9e54da81-20d3-4bff-81d6-fb288df78f3b',
  '1dfa3cb8-ee31-4ef6-ab5f-1d4f819fbf8c',
  'abaf03f1-205c-492c-8875-ef8d497bd884',
  '0984efac-481e-4956-8ab8-9c350ed6dc69',
  '2c43849f-47a9-4b58-ae6c-75b0b5de2817'
)
ORDER BY role DESC, first_name;
