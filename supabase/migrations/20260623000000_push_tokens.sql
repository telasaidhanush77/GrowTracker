-- Add push token column so Expo push notifications can be delivered to real devices
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token text;
