-- Allow admins to view all profiles
CREATE POLICY "Allow admin to view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');