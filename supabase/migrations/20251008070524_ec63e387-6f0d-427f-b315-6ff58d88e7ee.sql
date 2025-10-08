-- Fix CASCADE DELETE to prevent reservation data loss
-- When a user is deleted, set their reservations to NULL instead of deleting them
ALTER TABLE public.inventory_tracking
DROP CONSTRAINT inventory_tracking_team_user_id_fkey,
ADD CONSTRAINT inventory_tracking_team_user_id_fkey 
  FOREIGN KEY (team_user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- When a part is deleted, set the reference to NULL instead of deleting the reservation
ALTER TABLE public.inventory_tracking
DROP CONSTRAINT inventory_tracking_part_id_fkey,
ADD CONSTRAINT inventory_tracking_part_id_fkey 
  FOREIGN KEY (part_id) 
  REFERENCES public.parts(id) 
  ON DELETE SET NULL;

-- When a category is deleted, prevent deletion if it has parts (safer approach)
ALTER TABLE public.parts
DROP CONSTRAINT parts_category_id_fkey,
ADD CONSTRAINT parts_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.categories(id) 
  ON DELETE RESTRICT;

-- Make team_user_id and part_id nullable to support SET NULL
ALTER TABLE public.inventory_tracking
ALTER COLUMN team_user_id DROP NOT NULL,
ALTER COLUMN part_id DROP NOT NULL;