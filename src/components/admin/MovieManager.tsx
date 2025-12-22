'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Movie } from '@/types'
import { formatIDR } from '@/lib/currency'

export default function MovieManager() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingMovie, setSyncingMovie] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMovies(data || [])
    } catch (error) {
      console.error('Error fetching movies:', error)
      setMessage('Error fetching movies')
    } finally {
      setLoading(false)
    }
  }

  const syncMovieRating = async (movieId: string) => {
    setSyncingMovie(movieId)
    setMessage('')

    try {
      const response = await fetch('/api/sync-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ movieId }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Successfully synced "${result.omdbData.title}"`)
        // Update the movie in the list
        setMovies(prev => 
          prev.map(movie => 
            movie.id === movieId ? result.movie : movie
          )
        )
      } else {
        setMessage(result.error || 'Failed to sync rating')
      }
    } catch (error) {
      console.error('Error syncing rating:', error)
      setMessage('Error syncing rating')
    } finally {
      setSyncingMovie(null)
    }
  }

  const deleteMovie = async (movieId: string) => {
    if (!confirm('Are you sure you want to delete this movie?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieId)

      if (error) throw error

      setMovies(prev => prev.filter(movie => movie.id !== movieId))
      setMessage('Movie deleted successfully')
    } catch (error) {
      console.error('Error deleting movie:', error)
      setMessage('Error deleting movie')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('success') || message.includes('Successfully') 
            ? 'bg-green-900 text-green-200' 
            : 'bg-red-900 text-red-200'
        }`}>
          {message}
        </div>
      )}

      {movies.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No movies uploaded yet</p>
          <p className="text-sm mt-2">Upload your first movie to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {movies.map((movie) => (
            <div key={movie.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{movie.title}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Rating:</span>
                      <span className="ml-2 font-medium">{movie.rating}/10</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="ml-2 font-medium">{movie.duration} min</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <span className="ml-2 font-medium">{formatIDR(movie.price)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Release:</span>
                      <span className="ml-2 font-medium">{movie.release_date}</span>
                    </div>
                  </div>
                  
                  {movie.genre.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {movie.genre.map((genre, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-600 px-2 py-1 rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-gray-300 text-sm line-clamp-2">
                    {movie.description}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => syncMovieRating(movie.id)}
                    disabled={syncingMovie === movie.id}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncingMovie === movie.id ? 'Syncing...' : 'Sync OMDB'}
                  </button>
                  <button
                    onClick={() => deleteMovie(movie.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
