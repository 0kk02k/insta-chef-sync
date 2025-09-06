-- Add tags column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add index for faster tag searches
CREATE INDEX idx_recipes_tags ON public.recipes USING GIN(tags);