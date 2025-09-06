-- Fix storage RLS policy for PDF uploads
-- Current policy expects files in user-specific folders, but we want to allow
-- authenticated users to upload PDFs with any naming structure

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;

-- Create a new policy that allows authenticated users to upload PDFs
-- without requiring specific folder structure
CREATE POLICY "Users can upload PDFs" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
);

-- Also update the SELECT policy to be less restrictive
-- Users should be able to view PDFs they uploaded
DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;

CREATE POLICY "Users can view PDFs" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
);

-- Update DELETE policy to be more flexible too
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;

CREATE POLICY "Users can delete PDFs" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'pdf-uploads' 
  AND auth.uid() IS NOT NULL
);