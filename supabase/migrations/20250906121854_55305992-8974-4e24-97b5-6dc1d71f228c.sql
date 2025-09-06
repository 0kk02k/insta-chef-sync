-- Add published column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN published BOOLEAN NOT NULL DEFAULT false;

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for recipes to allow public viewing of published recipes
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.recipes;
CREATE POLICY "Users can view their own recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view published recipes" 
ON public.recipes 
FOR SELECT 
USING (published = true);

-- Create RLS policies for comments
CREATE POLICY "Everyone can view comments on published recipes" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = comments.recipe_id 
    AND recipes.published = true
  )
);

CREATE POLICY "Authenticated users can create comments on published recipes" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.recipes 
    WHERE recipes.id = comments.recipe_id 
    AND recipes.published = true
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for comments updated_at
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_comments_recipe_id ON public.comments(recipe_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);
CREATE INDEX idx_recipes_published ON public.recipes(published);