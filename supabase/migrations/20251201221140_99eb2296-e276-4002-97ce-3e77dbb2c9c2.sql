-- Remove redundant role column from profiles (roles should only be in user_roles table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Ensure user_roles RLS policies are correct
-- Users can view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update handle_new_user function to NOT assign any role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create profile only, no role assignment
  -- Admin must manually assign role for user to access app
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );

  RETURN NEW;
END;
$function$;