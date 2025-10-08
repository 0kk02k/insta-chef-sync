-- Fix the profiles INSERT policy to allow the trigger to create profiles
-- The issue is that the current policy checks auth.uid() which may not be properly
-- set during the trigger execution, even though the function is SECURITY DEFINER

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;

-- Create a new INSERT policy that allows both user self-insert AND trigger inserts
-- The trigger runs as SECURITY DEFINER so we need to allow it through
CREATE POLICY "Users can insert own profile or trigger" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Allow if auth.uid matches (normal user signup flow)
  (auth.uid() = id)
  OR
  -- Allow if this is being called from the trigger (id exists but no auth.uid yet)
  (id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profiles.id
  ))
);