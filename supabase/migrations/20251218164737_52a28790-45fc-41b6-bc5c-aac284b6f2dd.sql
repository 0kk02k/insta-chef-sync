-- Fix function search_path for auto_categorize_shopping_item
CREATE OR REPLACE FUNCTION public.auto_categorize_shopping_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category IS NULL OR NEW.category = '' OR NEW.category = 'Sonstiges' THEN
    NEW.category = public.categorize_ingredient(NEW.ingredient_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix the profile INSERT policy with corrected logic
DROP POLICY IF EXISTS "Users can insert own profile or trigger" ON public.profiles;

CREATE POLICY "Users can insert own profile or trigger" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id
);