-- Fix: Allow categories to be viewable by authenticated users
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to view parts" ON parts;

-- Create a simpler policy that works for all authenticated users
CREATE POLICY "Allow authenticated users to view parts"
ON parts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Also fix categories table to use the same approach
DROP POLICY IF EXISTS "Allow everyone to view categories" ON categories;

CREATE POLICY "Allow authenticated users to view categories"
ON categories  
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);