-- Fix profiles table RLS policy to prevent data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restricted policy: users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Create admin policy: admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT 
USING (public.is_admin());