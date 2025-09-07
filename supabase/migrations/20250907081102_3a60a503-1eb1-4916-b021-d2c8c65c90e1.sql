-- Add structured_ingredients column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN structured_ingredients JSONB DEFAULT NULL;

-- Add index for better performance on structured_ingredients queries
CREATE INDEX idx_recipes_structured_ingredients ON public.recipes USING GIN(structured_ingredients);

-- Add comment to document the structure
COMMENT ON COLUMN public.recipes.structured_ingredients IS 'Structured ingredient data with amount, unit, and ingredient name for portion scaling. Format: [{"amount": number, "unit": string, "ingredient": string}]';