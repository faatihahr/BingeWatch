-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if user doesn't already exist in our users table
  INSERT INTO users (id, email, name, image, role)
  SELECT 
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    NEW.raw_user_meta_data->>'image',
    'user' -- Default role
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to manually sync existing users
CREATE OR REPLACE FUNCTION sync_existing_user(user_uuid UUID, user_email TEXT, user_name TEXT, user_image TEXT)
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

-- Create function to update user role
CREATE OR REPLACE FUNCTION update_user_role(user_uuid UUID, new_role TEXT)
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
