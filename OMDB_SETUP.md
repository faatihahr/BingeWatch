# OMDB API Setup Guide

## 1. Get OMDB API Key

1. Visit [OMDB API website](https://www.omdbapi.com/)
2. Click "API Key" in the navigation
3. Fill out the form to get your FREE API key
4. You'll receive an email with your API key

## 2. Configure Environment Variables

Add your OMDB API key to `.env.local`:

```env
# OMDB API
NEXT_PUBLIC_OMDB_API_KEY=your_actual_omdb_api_key_here
```

Replace `your_actual_omdb_api_key_here` with the key you received.

## 3. Features Available

### Automatic Rating Fetch
- **Upload Form**: Click "Fetch OMDB" button when adding new movies
- **Existing Movies**: Use "Sync OMDB" button in admin dashboard
- **Auto-fill**: Automatically fetches rating, genre, duration, description, and poster

### What OMDB Provides
- IMDB rating (0-10 scale)
- Movie genres
- Runtime in minutes  
- Plot description
- Poster URL
- Release year

## 4. Usage Instructions

### For New Movies
1. Enter movie title and release date
2. Click "Fetch OMDB" button
3. Form auto-fills with OMDB data
4. Review and adjust as needed
5. Submit movie

### For Existing Movies
1. Go to Admin Dashboard → "Manage Movies" tab
2. Click "Sync OMDB" for any movie
3. Rating and metadata updates automatically

## 5. API Rate Limits

- **Free Plan**: 1,000 requests per day
- **Usage**: Each fetch/sync uses 1-2 API calls
- **Recommendation**: Use sparingly, only when needed

## 6. Error Handling

Common issues and solutions:

### "Movie not found in OMDB"
- Check spelling of movie title
- Ensure release year is correct
- Try alternative title variations

### "API Key invalid"
- Verify API key is correct
- Check for extra spaces or characters
- Ensure key is activated

### "Rate limit exceeded"
- Wait until next day for free plan reset
- Consider upgrading to paid plan for higher limits

## 7. Best Practices

1. **Always verify** fetched data before submitting
2. **Use specific titles** - "The Matrix" works better than "Matrix"
3. **Include release year** for better accuracy
4. **Monitor API usage** to avoid hitting limits
5. **Manual override** - you can always edit fields after fetching

## 8. Testing

Test the integration with well-known movies:
- The Matrix (1999)
- Inception (2010)
- The Dark Knight (2008)

These have reliable OMDB data for testing.
