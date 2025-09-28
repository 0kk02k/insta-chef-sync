-- Fix security definer view issue
-- Remove the problematic view and stick with enhanced RLS policies

DROP VIEW IF EXISTS public.safe_profiles;

-- Verify our enhanced RLS policies are working correctly
-- The enhanced policies should be sufficient to protect email addresses