-- Fix infinite recursion in RLS policies by creating security definer function

-- First, create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new non-recursive policies for profiles
CREATE POLICY "Allow authenticated users to view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert their own profile"  
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own profile"
ON public.profiles  
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policies for other tables using the security definer function

-- Drop and recreate policies for categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;

CREATE POLICY "Allow admin to manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow everyone to view categories"  
ON public.categories
FOR SELECT
TO authenticated
USING (true);

-- Drop and recreate policies for parts  
DROP POLICY IF EXISTS "Admins can manage parts" ON public.parts;
DROP POLICY IF EXISTS "Everyone can view parts" ON public.parts;

CREATE POLICY "Allow admin to manage parts"
ON public.parts  
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow everyone to view parts"
ON public.parts
FOR SELECT  
TO authenticated
USING (true);

-- Drop and recreate policies for inventory_tracking
DROP POLICY IF EXISTS "Admins can manage inventory tracking" ON public.inventory_tracking;
DROP POLICY IF EXISTS "Admins can view all inventory tracking" ON public.inventory_tracking;  
DROP POLICY IF EXISTS "Teams can view their own inventory" ON public.inventory_tracking;

CREATE POLICY "Allow admin to manage inventory tracking"
ON public.inventory_tracking
FOR ALL
TO authenticated  
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow admin to view all inventory tracking"
ON public.inventory_tracking
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow teams to view their own inventory"  
ON public.inventory_tracking
FOR SELECT
TO authenticated
USING (team_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));