-- Fix RLS policies for memberships table to work with NextAuth

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;

-- Create new policies that work with NextAuth session
CREATE POLICY "Users can view own memberships" ON memberships
  FOR SELECT USING (
    auth.uid() = user_id OR 
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Admins can view all memberships" ON memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage memberships" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
      AND users.role = 'admin'
    )
  );

-- Also fix membership_types RLS if needed
DROP POLICY IF EXISTS "Everyone can view membership types" ON membership_types;
DROP POLICY IF EXISTS "Admins can manage membership types" ON membership_types;

CREATE POLICY "Everyone can view membership types" ON membership_types
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage membership types" ON membership_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
      AND users.role = 'admin'
    )
  );
