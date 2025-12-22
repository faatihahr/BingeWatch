-- Update Single Movie Trailer
-- Replace 'YOUR_MOVIE_TITLE' with the actual movie title
-- Replace 'YOUR_TRAILER_URL' with the YouTube trailer URL

UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=VIDEO_ID_HERE' 
WHERE title = 'MOVIE_TITLE_HERE';

-- Example:
UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=YoHD9XEInc0' 
WHERE title = 'Inception';
