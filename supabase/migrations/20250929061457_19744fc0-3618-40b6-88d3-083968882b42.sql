-- Security Fix: Protect user email addresses from public access
-- Remove the overly permissive policy that exposes email addresses

-- First, drop the problematic policy that allows public access to profiles
DROP POLICY "Public can view profiles of published or shareable recipe creat" ON public.profiles;

-- Create a secure function that returns only public profile data (no email)
-- This function excludes sensitive information like email addresses
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_user_id
    AND EXISTS (
      SELECT 1 
      FROM public.recipes r 
      WHERE r.user_id = p.id 
        AND (r.published = true OR r.shareable = true)
    );
$$;

-- Create a new, more restrictive policy for public profile access
-- This policy only allows users to see their own complete profile data
CREATE POLICY "Users can view their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Grant execute permission on the public profile function
GRANT EXECUTE ON FUNCTION public.get_public_profile TO authenticated, anon;

-- Add helpful comment explaining the security design
COMMENT ON FUNCTION public.get_public_profile IS 'Returns non-sensitive profile data for users with published/shareable recipes. Email addresses and other PII are excluded for security.';

-- For existing code that needs to display recipe creator info, 
-- use: SELECT * FROM public.get_public_profile(user_id)
-- instead of directly querying the profiles table