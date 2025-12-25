-- Fix purchase expiration trigger for Gabut members
-- Update the set_purchase_expiration function to work correctly

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_purchase_expiration_trigger ON purchases;
DROP FUNCTION IF EXISTS set_purchase_expiration();

-- Recreate function with better logic
CREATE OR REPLACE FUNCTION set_purchase_expiration()
RETURNS TRIGGER AS $$
DECLARE
  user_membership RECORD;
BEGIN
  -- Get user's membership information
  SELECT 
    m.membership_type_id,
    mt.name as membership_name,
    mt.movie_access_days
  INTO user_membership
  FROM memberships m
  JOIN membership_types mt ON m.membership_type_id = mt.id
  WHERE m.user_id = NEW.user_id 
  AND m.is_active = true
  AND m.end_date > NOW()
  LIMIT 1;
  
  -- Set expiration for Gabut members (7 days)
  IF user_membership.membership_name = 'Gabut' AND user_membership.movie_access_days IS NOT NULL THEN
    NEW.expires_at = NEW.purchase_date + (user_membership.movie_access_days || ' days')::INTERVAL;
  ELSE
    -- For Akut members, no expiration (set to far future)
    NEW.expires_at = NEW.purchase_date + INTERVAL '10 years';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER set_purchase_expiration_trigger
BEFORE INSERT ON purchases
FOR EACH ROW EXECUTE FUNCTION set_purchase_expiration();

-- Update existing purchases without expiration
UPDATE purchases 
SET expires_at = purchase_date + 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM memberships m 
      JOIN membership_types mt ON m.membership_type_id = mt.id
      WHERE m.user_id = purchases.user_id 
      AND m.is_active = true 
      AND m.end_date > NOW()
      AND mt.name = 'Gabut'
      AND mt.movie_access_days IS NOT NULL
    ) THEN 
      (SELECT (mt.movie_access_days::text || ' days')::INTERVAL
       FROM memberships m 
       JOIN membership_types mt ON m.membership_type_id = mt.id
       WHERE m.user_id = purchases.user_id 
       AND m.is_active = true 
       AND m.end_date > NOW()
       AND mt.name = 'Gabut'
       AND mt.movie_access_days IS NOT NULL
       LIMIT 1)
    ELSE INTERVAL '10 years'
  END
WHERE expires_at IS NULL;
