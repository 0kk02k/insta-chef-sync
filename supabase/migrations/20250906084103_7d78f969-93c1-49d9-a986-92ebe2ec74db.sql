-- Add rating column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);