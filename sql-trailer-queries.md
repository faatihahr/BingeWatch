# SQL Queries for Manual Trailer Input

## Update Single Movie Trailer
```sql
UPDATE movies 
SET trailer_url = 'YOUR_TRAILER_URL_HERE' 
WHERE title = 'MOVIE_TITLE_HERE';
```

## Update Multiple Movies at Once
```sql
UPDATE movies 
SET trailer_url = CASE 
    WHEN title = 'Movie Title 1' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_1'
    WHEN title = 'Movie Title 2' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_2'
    WHEN title = 'Movie Title 3' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_3'
    ELSE trailer_url
END
WHERE title IN ('Movie Title 1', 'Movie Title 2', 'Movie Title 3');
```

## View All Movies Without Trailers
```sql
SELECT id, title, thumbnail, trailer_url 
FROM movies 
WHERE trailer_url IS NULL OR trailer_url = '';
```

## View All Movies with Current Trailer URLs
```sql
SELECT id, title, thumbnail, trailer_url 
FROM movies 
ORDER BY created_at DESC;
```

## Add Trailer URL by Movie ID
```sql
UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=VIDEO_ID' 
WHERE id = 'YOUR_MOVIE_UUID_HERE';
```

## Common YouTube Trailer URL Examples
```sql
-- Example 1: Update Inception
UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=YoHD9XEInc0' 
WHERE title LIKE '%Inception%';

-- Example 2: Update The Dark Knight
UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=EXeTwQWrcwY' 
WHERE title LIKE '%Dark Knight%';

-- Example 3: Update Interstellar
UPDATE movies 
SET trailer_url = 'https://www.youtube.com/watch?v=zSWdZVtXT7E' 
WHERE title LIKE '%Interstellar%';
```

## Batch Update Template (Copy and modify)
```sql
UPDATE movies 
SET trailer_url = CASE 
    WHEN title = 'Movie 1' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_1'
    WHEN title = 'Movie 2' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_2'
    WHEN title = 'Movie 3' THEN 'https://www.youtube.com/watch?v=VIDEO_ID_3'
    -- Add more movies here
    ELSE trailer_url
END
WHERE title IN ('Movie 1', 'Movie 2', 'Movie 3');
```

## Reset All Trailer URLs (Use with caution!)
```sql
UPDATE movies 
SET trailer_url = NULL;
```

## Find Movies by Genre to Update Trailers
```sql
SELECT id, title, genre, trailer_url 
FROM movies 
WHERE genre @> ARRAY['Action'] 
AND (trailer_url IS NULL OR trailer_url = '');
```

## Tips:
1. Always backup your data before running updates
2. Use `LIKE` for partial title matches: `WHERE title LIKE '%Avengers%'`
3. YouTube URLs work best with the full `https://www.youtube.com/watch?v=VIDEO_ID` format
4. You can also use Vimeo URLs or other video platforms
5. Test with `SELECT` first before running `UPDATE` statements
