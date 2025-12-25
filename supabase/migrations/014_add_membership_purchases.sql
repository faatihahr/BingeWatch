-- Create membership_purchases table to track membership purchase transactions
CREATE TABLE IF NOT EXISTS membership_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type_id UUID NOT NULL REFERENCES membership_types(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired')),
  payment_method VARCHAR(50),
  external_id VARCHAR(255),
  invoice_url TEXT,
  va_number VARCHAR(50),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_membership_purchases_user_id ON membership_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_status ON membership_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_external_id ON membership_purchases(external_id);

-- Enable RLS
ALTER TABLE membership_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for membership_purchases
CREATE POLICY "Users can view own membership purchases" ON membership_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all membership purchases" ON membership_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert membership purchases" ON membership_purchases
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update membership purchases" ON membership_purchases
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create trigger for updated_at on membership_purchases
CREATE TRIGGER update_membership_purchases_updated_at BEFORE UPDATE ON membership_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle membership purchase completion
CREATE OR REPLACE FUNCTION complete_membership_purchase()
RETURNS TRIGGER AS $$
DECLARE
  user_membership RECORD;
BEGIN
  -- Only proceed if payment status changed to 'paid'
  IF OLD.payment_status = 'pending' AND NEW.payment_status = 'paid' THEN
    -- Get user's current active membership
    SELECT * INTO user_membership 
    FROM get_user_membership(NEW.user_id);
    
    -- Deactivate old membership if exists
    IF user_membership.membership_id IS NOT NULL THEN
      UPDATE memberships 
      SET is_active = false 
      WHERE id = user_membership.membership_id;
    END IF;
    
    -- Create new membership record
    INSERT INTO memberships (user_id, membership_type_id, end_date)
    SELECT 
      NEW.user_id,
      NEW.membership_type_id,
      NOW() + (mt.duration_days || ' days')::INTERVAL
    FROM membership_types mt 
    WHERE mt.id = NEW.membership_type_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle membership purchase completion
CREATE TRIGGER complete_membership_purchase_trigger
  AFTER UPDATE ON membership_purchases
  FOR EACH ROW EXECUTE FUNCTION complete_membership_purchase();
