-- Add payment tracking fields to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS va_number VARCHAR(50);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_external_id ON purchases(external_id);

-- Update existing purchases to have default payment status
UPDATE purchases 
SET payment_status = 'paid' 
WHERE payment_status IS NULL;

-- Update RLS policies to handle new fields
DROP POLICY IF EXISTS "Users can insert own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;

-- Recreate policies with better handling
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.role() = 'authenticated'
  );

-- Service role policy already exists from previous migration, so skip if exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchases' 
        AND policyname = 'Service role can insert purchases'
    ) THEN
        CREATE POLICY "Service role can insert purchases" ON purchases
          FOR INSERT WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
