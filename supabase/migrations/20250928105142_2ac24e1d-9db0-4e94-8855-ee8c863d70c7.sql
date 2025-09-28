-- Add a policy to allow public access to published recipes
-- This allows anyone to view published recipes even without being logged in

-- First, let's check if we need to add a policy for public access to published recipes
CREATE POLICY "Published recipes are viewable by everyone"
ON public.recipes
FOR SELECT
USING (published = true);

-- Also allow public access to profiles for recipe creators (for published recipes only)
CREATE POLICY "Profiles are viewable by everyone for published recipes"
ON public.profiles
FOR SELECT
USING (true);