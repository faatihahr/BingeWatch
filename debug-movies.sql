-- Debug: Check all movies in database
SELECT id, title, thumbnail, created_at 
FROM movies 
ORDER BY created_at DESC;

-- Debug: Check specific movie ID from URL
SELECT * FROM movies WHERE id = '9e0479d5-a819-4503-a774-301d22f0abc2';

-- Debug: Count total movies
SELECT COUNT(*) as total_movies FROM movies;
