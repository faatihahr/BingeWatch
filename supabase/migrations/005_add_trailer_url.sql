-- Add trailer_url field to movies table
ALTER TABLE movies 
ADD COLUMN trailer_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN movies.trailer_url IS 'URL for movie trailer video (YouTube, Vimeo, etc.)';
