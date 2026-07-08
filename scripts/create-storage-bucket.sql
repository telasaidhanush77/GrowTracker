-- Run this in Supabase SQL Editor to enable file uploads for evidence attachments.

-- Create the attachments storage bucket (public read, auth write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  5242880,  -- 5 MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/xml',
    'text/xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Authenticated users can view attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Users can delete their own attachments
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
