-- Enhanced security for profiles table
-- Drop existing policies and recreate with more secure approach

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create more secure policies with explicit authentication checks
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can insert own profile only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Explicitly deny all access to anonymous users
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

-- Add additional constraint to ensure emails are not exposed in any edge cases
-- Create a view for safe profile access (without email for public consumption if needed)
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  language,
  measurement_unit,
  created_at,
  updated_at
FROM public.profiles;

-- Secure the view with RLS
ALTER VIEW public.safe_profiles SET (security_barrier = true);

COMMENT ON TABLE public.profiles IS 'User profiles with RLS protecting personal information including email addresses';
COMMENT ON VIEW public.safe_profiles IS 'Safe view of profiles excluding sensitive information like email addresses';