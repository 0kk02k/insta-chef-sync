-- Fix PDF storage bucket RLS policies to prevent cross-user access
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete PDFs" ON storage.objects;

-- Create new folder-based ownership policies
-- Files must be uploaded to user's own folder: {user_id}/filename.pdf

CREATE POLICY "Users can upload PDFs to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view PDFs in own folder"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete PDFs in own folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);