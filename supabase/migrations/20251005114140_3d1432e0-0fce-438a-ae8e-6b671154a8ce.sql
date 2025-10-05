-- Fix: Restrict parts table access to authenticated users only
-- Drop the public access policy
DROP POLICY IF EXISTS "Allow everyone to view parts" ON parts;

-- Create new policy that only allows authenticated users to view parts
CREATE POLICY "Allow authenticated users to view parts"
ON parts
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) IS NOT NULL);