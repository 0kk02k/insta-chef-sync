-- Add shareable field to recipes table
ALTER TABLE public.recipes 
ADD COLUMN shareable boolean NOT NULL DEFAULT false;

-- Update RLS policies to allow access to shareable recipes via direct link
-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Everyone can view published recipes" ON public.recipes;
DROP POLICY IF EXISTS "Published recipes are viewable by everyone" ON public.recipes;

-- Create new policy that allows viewing both published and shareable recipes
CREATE POLICY "Public can view published or shareable recipes"
ON public.recipes
FOR SELECT
USING (published = true OR shareable = true);

-- Update profiles policy to also allow viewing creators of shareable recipes
DROP POLICY IF EXISTS "Public can view profiles of published recipe creators" ON public.profiles;

CREATE POLICY "Public can view profiles of published or shareable recipe creators"
ON public.profiles
FOR SELECT
USING (
  -- Allow if user is logged in and viewing their own profile
  (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR
  -- Allow public access to profile info when the profile owner has published or shareable recipes
  (EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.user_id = profiles.id 
    AND (recipes.published = true OR recipes.shareable = true)
  ))
);

-- Update comments policies to work with shareable recipes too
DROP POLICY IF EXISTS "Everyone can view comments on published recipes" ON public.comments;

CREATE POLICY "Everyone can view comments on published or shareable recipes"
ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = comments.recipe_id 
    AND (recipes.published = true OR recipes.shareable = true)
  )
);

DROP POLICY IF EXISTS "Authenticated users can create comments on published recipes" ON public.comments;

CREATE POLICY "Authenticated users can create comments on published or shareable recipes"
ON public.comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = comments.recipe_id 
    AND (recipes.published = true OR recipes.shareable = true)
  )
);