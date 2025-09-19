-- Update existing 'Sonstiges' items to use proper categorization
UPDATE public.shopping_list_items 
SET category = public.categorize_ingredient(ingredient_name)
WHERE category = 'Sonstiges' AND ingredient_name IS NOT NULL;