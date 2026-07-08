-- Allows unauthenticated lookup of email by username or employee_code.
-- SECURITY DEFINER so it bypasses RLS (needed before the user is logged in).
create or replace function public.get_email_by_identifier(p_identifier text)
returns text
language sql
security definer
stable
as $$
  select email
  from public.profiles
  where lower(username) = lower(p_identifier)
     or lower(employee_code) = lower(p_identifier)
  limit 1;
$$;
