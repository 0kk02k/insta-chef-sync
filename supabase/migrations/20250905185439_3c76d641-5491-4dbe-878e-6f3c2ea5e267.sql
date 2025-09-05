-- Add new columns to profiles table for user preferences
ALTER TABLE public.profiles 
ADD COLUMN display_name TEXT,
ADD COLUMN language TEXT DEFAULT 'de',
ADD COLUMN measurement_unit TEXT DEFAULT 'metric';

-- Update the handle_new_user function to include display_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, language, measurement_unit)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'language', 'de'),
    COALESCE(NEW.raw_user_meta_data->>'measurement_unit', 'metric')
  );
  RETURN NEW;
END;
$function$;