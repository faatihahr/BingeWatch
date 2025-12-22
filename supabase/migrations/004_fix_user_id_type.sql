-- Update users table to use TEXT for id instead of UUID to support Google IDs
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Update foreign key references in other tables
ALTER TABLE movies ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE purchases ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE watch_history ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE favorites ALTER COLUMN user_id TYPE TEXT;

-- Update function parameters to use TEXT
DROP FUNCTION IF EXISTS sync_existing_user(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT);

-- Recreate functions with TEXT parameters
CREATE OR REPLACE FUNCTION sync_existing_user(user_uuid TEXT, user_email TEXT, user_name TEXT, user_image TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  existing_user RECORD;
BEGIN
  -- Check if user already exists
  SELECT * INTO existing_user FROM users WHERE id = user_uuid;
  
  IF existing_user IS NULL THEN
    -- Insert new user
    INSERT INTO users (id, email, name, image, role)
    VALUES (user_uuid, user_email, user_name, user_image, 'user')
    RETURNING id, email, name, role INTO existing_user;
    
    result := json_build_object(
      'success', true,
      'action', 'created',
      'user', existing_user
    );
  ELSE
    result := json_build_object(
      'success', true,
      'action', 'exists',
      'user', existing_user
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_role(user_uuid TEXT, new_role TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  updated_user RECORD;
BEGIN
  -- Validate role
  IF new_role NOT IN ('admin', 'user') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = new_role, updated_at = NOW()
  WHERE id = user_uuid
  RETURNING id, email, name, role INTO updated_user;
  
  IF updated_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  result := json_build_object(
    'success', true,
    'action', 'updated',
    'user', updated_user
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger function
DROP FUNCTION IF EXISTS handle_new_user();
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if user doesn't already exist in our users table
  INSERT INTO users (id, email, name, image, role)
  SELECT 
    NEW.id::TEXT,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    NEW.raw_user_meta_data->>'image',
    'user' -- Default role
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = NEW.id::TEXT
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
