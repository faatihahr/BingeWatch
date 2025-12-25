-- Fix RLS policies for purchases table
-- Drop existing policies and recreate with proper authentication checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON purchases;

-- Recreate policies with better authentication handling
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.role() = 'authenticated'
  );

-- Also allow service role to insert purchases (for payment processing)
CREATE POLICY "Service role can insert purchases" ON purchases
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
