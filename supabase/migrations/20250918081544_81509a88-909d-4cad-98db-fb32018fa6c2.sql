-- Add fields to support recipe forking
ALTER TABLE public.recipes 
ADD COLUMN original_recipe_id uuid,
ADD COLUMN is_forked boolean NOT NULL DEFAULT false,
ADD COLUMN original_creator_id uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.recipes.original_recipe_id IS 'References the original recipe if this is a fork';
COMMENT ON COLUMN public.recipes.is_forked IS 'Indicates if this recipe is a fork of another recipe';
COMMENT ON COLUMN public.recipes.original_creator_id IS 'ID of the original creator when recipe is forked';