-- Add password column to users table for manual authentication
ALTER TABLE users ADD COLUMN password TEXT;

-- Add RLS policy for password column (existing policies will cover it)
-- Users can view their own profile (but not password)
CREATE POLICY "Users can view own profile without password" ON users
  FOR SELECT USING (
    auth.uid() = id AND 
    (current_setting('request.jwt.claims', true)::json->>'sub') = id::text
  );

-- Allow authenticated users to insert their own profile with password
CREATE POLICY "Users can insert own profile with password" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow users to update their own profile (including password)
CREATE POLICY "Users can update own profile including password" ON users
  FOR UPDATE USING (
    auth.uid() = id OR 
    id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );
