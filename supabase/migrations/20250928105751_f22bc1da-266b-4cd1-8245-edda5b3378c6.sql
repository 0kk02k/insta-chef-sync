-- Fix RLS policies to allow public access to published recipes and creator profiles

-- First, drop the conflicting "Deny anonymous access to profiles" policy
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Make sure we have the correct policy for viewing profiles when viewing published recipes
-- The "Profiles are viewable by everyone for published recipes" policy should be sufficient
-- but let's ensure it's properly configured

-- Also ensure we have proper policies for comments on published recipes
-- (these should already exist based on the schema, but let's verify they work for anonymous users)

-- Create a more specific policy for profiles that allows viewing creator info for published recipes
DROP POLICY IF EXISTS "Profiles are viewable by everyone for published recipes" ON public.profiles;

CREATE POLICY "Public can view profiles of published recipe creators"
ON public.profiles
FOR SELECT
USING (
  -- Allow if user is logged in and viewing their own profile
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  -- Allow public access to profile info when the profile owner has published recipes
  (EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.user_id = profiles.id 
    AND recipes.published = true
  ))
);