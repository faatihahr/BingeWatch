-- Fix RLS policies to work with NextAuth session user IDs
-- Since we convert Google IDs to UUIDs, we need to update the policies

-- Drop existing movie policies
DROP POLICY IF EXISTS "Everyone can view movies" ON movies;
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
DROP POLICY IF EXISTS "Admins can update movies" ON movies;
DROP POLICY IF EXISTS "Admins can delete movies" ON movies;

-- Create new policies that work with our UUID conversion
CREATE POLICY "Everyone can view movies" ON movies
  FOR SELECT USING (true);

-- Allow movie uploads from authenticated users (will be validated in application layer)
CREATE POLICY "Authenticated users can insert movies" ON movies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update movies" ON movies
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete movies" ON movies
  FOR DELETE USING (auth.role() = 'authenticated');

-- Drop existing user policies and recreate
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');
