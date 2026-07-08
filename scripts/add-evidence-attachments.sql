-- Add attachments column to evidence table.
-- Run in Supabase SQL Editor, then run `npm run db:types` to regenerate TypeScript types.

ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
