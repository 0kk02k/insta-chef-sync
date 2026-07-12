-- Harden recipe image storage ownership.
-- Images remain publicly readable, but writes are constrained to {auth.uid()}/...
DROP POLICY IF EXISTS "Users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recipe images" ON storage.objects;

CREATE POLICY "Users can upload recipe images to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update recipe images in own folder"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'recipe-images'
  AND (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete recipe images in own folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'recipe-images'
  AND (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Harden one-time invitation code redemption against arbitrary UUID writes.
CREATE OR REPLACE FUNCTION public.use_invitation_code(input_code text, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid := user_id;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  UPDATE public.invitation_codes
  SET used_by = target_user_id,
      used_at = now(),
      is_active = false
  WHERE code = input_code
    AND is_active = true
    AND used_by IS NULL
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;
