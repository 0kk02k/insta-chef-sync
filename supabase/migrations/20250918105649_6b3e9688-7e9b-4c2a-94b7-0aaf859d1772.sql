-- Clean up orphaned recipes that reference non-existent users
DELETE FROM recipes 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up orphaned comments that reference non-existent users  
DELETE FROM comments 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Clean up orphaned ignored_recipes that reference non-existent users
DELETE FROM ignored_recipes 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Add function to clean up orphaned data periodically
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete orphaned recipes
  DELETE FROM recipes 
  WHERE user_id NOT IN (SELECT id FROM profiles);
  
  -- Delete orphaned comments
  DELETE FROM comments 
  WHERE user_id NOT IN (SELECT id FROM profiles);
  
  -- Delete orphaned ignored_recipes
  DELETE FROM ignored_recipes 
  WHERE user_id NOT IN (SELECT id FROM profiles);
  
  RAISE NOTICE 'Orphaned data cleanup completed';
END;
$$;