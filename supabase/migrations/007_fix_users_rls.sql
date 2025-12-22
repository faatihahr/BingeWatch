-- Fix RLS policies for users table to allow user creation

-- First, enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies that allow user creation and management

-- Allow anyone to view users (for comments display)
CREATE POLICY "Users can view profiles" ON users
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid() = id OR 
    id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (
    auth.uid() = id OR 
    id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Also fix comments RLS to work with UUID conversion
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Allow anyone to view comments
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (true);

-- Allow authenticated users to insert comments
CREATE POLICY "Users can insert own comments" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow users to update own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Allow users to delete own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (
    auth.uid() = user_id OR 
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );
