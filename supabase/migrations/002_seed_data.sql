-- Insert sample admin user (you'll need to update the auth.users table first)
-- This assumes you'll create an admin user through authentication first
-- Then update their role to admin

-- Insert sample movies (for testing)
INSERT INTO movies (
  title, 
  description, 
  thumbnail, 
  video_url, 
  duration, 
  price, 
  genre, 
  release_date, 
  rating
) VALUES 
(
  'The Matrix',
  'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop',
  'https://example.com/matrix.mp4',
  136,
  12.99,
  ARRAY['Action', 'Sci-Fi'],
  '1999-03-31',
  8.7
),
(
  'Inception',
  'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
  'https://images.unsplash.com/photo-1489599807961-c7960cb51e93?w=300&h=450&fit=crop',
  'https://example.com/inception.mp4',
  148,
  14.99,
  ARRAY['Action', 'Sci-Fi', 'Thriller'],
  '2010-07-16',
  8.8
),
(
  'The Dark Knight',
  'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
  'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop',
  'https://example.com/dark-knight.mp4',
  152,
  13.99,
  ARRAY['Action', 'Crime', 'Drama'],
  '2008-07-18',
  9.0
),
(
  'Interstellar',
  'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
  'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=300&h=450&fit=crop',
  'https://example.com/interstellar.mp4',
  169,
  15.99,
  ARRAY['Adventure', 'Drama', 'Sci-Fi'],
  '2014-11-07',
  8.6
),
(
  'Pulp Fiction',
  'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
  'https://images.unsplash.com/photo-1489599807961-c7960cb51e93?w=300&h=450&fit=crop',
  'https://example.com/pulp-fiction.mp4',
  154,
  11.99,
  ARRAY['Crime', 'Drama'],
  '1994-10-14',
  8.9
);

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into our users table
  INSERT INTO users (id, email, name, image, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown User'),
    NEW.raw_user_meta_data->>'image',
    'user' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_movies', (SELECT COUNT(*) FROM movies),
    'purchased_movies', (SELECT COUNT(*) FROM purchases WHERE user_id = user_uuid),
    'watched_movies', (SELECT COUNT(*) FROM watch_history WHERE user_id = user_uuid),
    'favorite_movies', (SELECT COUNT(*) FROM favorites WHERE user_id = user_uuid),
    'total_spent', COALESCE((SELECT SUM(amount) FROM purchases WHERE user_id = user_uuid), 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get movie statistics
CREATE OR REPLACE FUNCTION get_movie_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_movies', (SELECT COUNT(*) FROM movies),
    'total_purchases', (SELECT COUNT(*) FROM purchases),
    'total_revenue', COALESCE((SELECT SUM(amount) FROM purchases), 0),
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM users WHERE role = 'user')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
