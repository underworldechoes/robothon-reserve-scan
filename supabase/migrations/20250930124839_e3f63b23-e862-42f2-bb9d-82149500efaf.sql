-- Create RPC function for atomic decrement and tracking
CREATE OR REPLACE FUNCTION public.transaction_decrement_and_track(
  p_part_id INTEGER,
  p_team_profile_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement part quantity
  UPDATE parts
  SET quantity = quantity - 1
  WHERE id = p_part_id AND quantity > 0;

  -- Insert tracking record
  INSERT INTO inventory_tracking (part_id, team_user_id, status, scanned_at)
  VALUES (p_part_id, p_team_profile_id, 'checked_out', now());
END;
$$;