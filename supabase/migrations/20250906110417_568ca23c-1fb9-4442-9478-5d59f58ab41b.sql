-- Update the French Apple Cake recipe with proper tags
UPDATE recipes 
SET tags = ARRAY['dessert', 'französisch', 'apfel', 'gebacken', 'festlich']
WHERE id = 'fdace9c0-cbb5-41c2-b0c7-6a122fd8c34d';