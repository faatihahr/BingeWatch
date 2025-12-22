import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { omdbService } from '@/lib/omdb'

export async function POST(request: NextRequest) {
  try {
    const { movieId } = await request.json()

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    // Get movie from database
    const { data: movie, error: fetchError } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()

    if (fetchError || !movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }

    // Fetch rating from OMDB
    const year = new Date(movie.release_date).getFullYear().toString()
    const movieDetails = await omdbService.findBestMatch(movie.title, year)

    if (movieDetails) {
      // Update movie with OMDB data
      const { data: updatedMovie, error: updateError } = await supabase
        .from('movies')
        .update({
          rating: parseFloat(movieDetails.imdbRating) || movie.rating,
          genre: omdbService.extractGenres(movieDetails.Genre),
          duration: omdbService.extractRuntime(movieDetails.Runtime) || movie.duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', movieId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        movie: updatedMovie,
        omdbData: {
          title: movieDetails.Title,
          rating: movieDetails.imdbRating,
          genre: movieDetails.Genre,
          runtime: movieDetails.Runtime
        }
      })
    } else {
      return NextResponse.json({ error: 'Movie not found in OMDB' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error syncing rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get all movies
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, release_date')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
    }

    return NextResponse.json({ movies })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
