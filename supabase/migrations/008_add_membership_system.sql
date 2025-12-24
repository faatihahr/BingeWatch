-- Create membership types table
CREATE TABLE IF NOT EXISTS membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'Gabut', 'Akut'
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL, -- price for membership
  duration_days INTEGER NOT NULL, -- membership duration in days
  movie_access_days INTEGER DEFAULT NULL, -- days user can keep movies (null for unlimited)
  can_purchase_movies BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memberships table to track user memberships
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type_id UUID NOT NULL REFERENCES membership_types(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, is_active) -- Only one active membership per user
);

-- Update purchases table to add expiration for Gabut members
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_types_name ON membership_types(name);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_purchases_expires_at ON purchases(expires_at);

-- Enable RLS
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Policies for membership_types (read-only for everyone, admin can manage)
CREATE POLICY "Everyone can view membership types" ON membership_types
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage membership types" ON membership_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for memberships
CREATE POLICY "Users can view own memberships" ON memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all memberships" ON memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage memberships" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Insert membership types
INSERT INTO membership_types (name, description, price, duration_days, movie_access_days, can_purchase_movies) VALUES
('Gabut', 'Basic membership with 7-day movie access', 0.00, 365, 7, true),
('Akut', 'Premium membership with unlimited movie access', 49.99, 30, null, false)
ON CONFLICT (name) DO NOTHING;

-- Create trigger for updated_at on membership_types
CREATE TRIGGER update_membership_types_updated_at BEFORE UPDATE ON membership_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on memberships
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to assign Gabut membership to new users
CREATE OR REPLACE FUNCTION assign_default_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign Gabut membership to new users (except admins)
  IF NEW.role != 'admin' THEN
    INSERT INTO memberships (user_id, membership_type_id, end_date)
    SELECT 
      NEW.id,
      mt.id,
      NOW() + (mt.duration_days || ' days')::INTERVAL
    FROM membership_types mt 
    WHERE mt.name = 'Gabut';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to assign default membership on user creation
CREATE TRIGGER assign_default_membership_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION assign_default_membership();

-- Function to check if user has active membership
CREATE OR REPLACE FUNCTION get_user_membership(p_user_id UUID)
RETURNS TABLE(
  membership_id UUID,
  membership_name VARCHAR,
  is_active BOOLEAN,
  end_date TIMESTAMP WITH TIME ZONE,
  can_purchase_movies BOOLEAN,
  movie_access_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    mt.name,
    m.is_active AND m.end_date > NOW() as is_active,
    m.end_date,
    mt.can_purchase_movies,
    mt.movie_access_days
  FROM memberships m
  JOIN membership_types mt ON m.membership_type_id = mt.id
  WHERE m.user_id = p_user_id
  AND m.is_active = true
  ORDER BY m.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old purchases for Gabut members
CREATE OR REPLACE FUNCTION expire_old_purchases()
RETURNS void AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update purchases that are older than 7 days for Gabut members
  UPDATE purchases 
  SET is_expired = true 
  WHERE is_expired = false 
  AND expires_at < NOW()
  AND expires_at IS NOT NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration (you could create a log table if needed)
  RAISE NOTICE 'Expired % purchases', expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to set expiration date for new purchases
CREATE OR REPLACE FUNCTION set_purchase_expiration()
RETURNS TRIGGER AS $$
DECLARE
  user_membership RECORD;
BEGIN
  -- Get user's membership info
  SELECT * INTO user_membership 
  FROM get_user_membership(NEW.user_id);
  
  -- Set expiration for Gabut members (7 days)
  IF user_membership.membership_name = 'Gabut' AND user_membership.movie_access_days IS NOT NULL THEN
    NEW.expires_at = NEW.purchase_date + (user_membership.movie_access_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase expiration
CREATE TRIGGER set_purchase_expiration_trigger
  AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_purchase_expiration();
