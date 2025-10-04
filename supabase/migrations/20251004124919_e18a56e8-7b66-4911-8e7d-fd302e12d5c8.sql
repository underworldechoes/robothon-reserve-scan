-- Add 'reserved' to allowed statuses
ALTER TABLE inventory_tracking DROP CONSTRAINT IF EXISTS inventory_tracking_status_check;
ALTER TABLE inventory_tracking ADD CONSTRAINT inventory_tracking_status_check 
  CHECK (status IN ('reserved', 'issued', 'returned', 'lost', 'damaged'));

-- Add admin_remarks column
ALTER TABLE inventory_tracking ADD COLUMN IF NOT EXISTS admin_remarks TEXT;

-- Update the transaction function to use 'reserved' status
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

  -- Insert tracking record with 'reserved' status
  INSERT INTO inventory_tracking (part_id, team_user_id, status, scanned_at)
  VALUES (p_part_id, p_team_profile_id, 'reserved', now());
END;
$function$