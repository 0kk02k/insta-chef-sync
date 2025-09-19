-- Fix the auto categorization trigger to handle default values
CREATE OR REPLACE FUNCTION public.auto_categorize_shopping_item()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set category if it's NULL, empty, or the default 'Sonstiges'
  IF NEW.category IS NULL OR NEW.category = '' OR NEW.category = 'Sonstiges' THEN
    NEW.category = public.categorize_ingredient(NEW.ingredient_name);
  END IF;
  RETURN NEW;
END;
$function$