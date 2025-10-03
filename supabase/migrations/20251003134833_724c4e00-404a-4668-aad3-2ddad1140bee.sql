-- Update the database function to use 'issued' instead of 'checked_out'
-- Also drop and recreate the status constraint
-- Add barcode column to parts table

-- First drop the existing constraint
ALTER TABLE inventory_tracking DROP CONSTRAINT IF EXISTS inventory_tracking_status_check;

-- Update database function to use correct status
CREATE OR REPLACE FUNCTION public.transaction_decrement_and_track(p_part_id integer, p_team_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Decrement part quantity
  UPDATE parts
  SET quantity = quantity - 1
  WHERE id = p_part_id AND quantity > 0;

  -- Insert tracking record with 'issued' status
  INSERT INTO inventory_tracking (part_id, team_user_id, status, scanned_at)
  VALUES (p_part_id, p_team_profile_id, 'issued', now());
END;
$function$;

-- Add new constraint with correct values
ALTER TABLE inventory_tracking 
ADD CONSTRAINT inventory_tracking_status_check 
CHECK (status IN ('issued', 'returned', 'lost', 'damaged'));

-- Add barcode column to parts table
ALTER TABLE parts 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;