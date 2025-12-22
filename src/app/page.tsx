'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OMDBMovie {
  imdbID: string
  Title: string
  Year: string
  Poster: string
  Type: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [movies, setMovies] = useState<OMDBMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Role-based redirect for authenticated users
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [status, session, router])

  useEffect(() => {
    fetchRandomMovies()
  }, [])

  const fetchRandomMovies = async () => {
    try {
      // Popular movie keywords for variety
      const keywords = ['avengers', 'batman', 'spider', 'star', 'harry', 'lord', 'jurassic', 'matrix', 'iron', 'thor']
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)]
      
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY}&s=${randomKeyword}&type=movie`
      )
      
      const data = await response.json()
      console.log('OMDB API Response:', data)

      if (data.Response === 'True' && data.Search) {
        // Filter movies with posters and limit to 4
        const moviesWithPosters = data.Search
          .filter((movie: OMDBMovie) => movie.Poster && movie.Poster !== 'N/A')
          .slice(0, 4)
        
        setMovies(moviesWithPosters)
        console.log('Movies with posters:', moviesWithPosters.length)
      } else {
        throw new Error(data.Error || 'Failed to fetch movies')
      }
    } catch (err) {
      console.error('Error fetching movies:', err)
      setError('Failed to load movies')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Free Trial */}
      <div className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Unlimited movies, TV shows, and more
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Watch anywhere. Cancel anytime.
          </p>
          <p className="text-lg mb-8 text-gray-400">
            Ready to watch? Enter your email to create or restart your membership.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 px-4 py-3 bg-gray-800 rounded-md text-white placeholder-gray-400 border border-gray-600 focus:border-red-600 focus:outline-none"
            />
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Trending Now</h2>
        
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg h-[300px] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {movies.map((movie, index) => (
              <div
                key={`${movie.imdbID}-${index}`}
                className="group block cursor-pointer"
                onClick={() => window.open(`https://www.imdb.com/title/${movie.imdbID}`, '_blank')}
              >
                <div className="relative overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={movie.Poster}
                    alt={movie.Title}
                    className="w-full h-[300px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-sm font-semibold">View on IMDB</p>
                    </div>
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-medium truncate">{movie.Title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{movie.Year}</span>
                  <span>•</span>
                  <span className="capitalize">{movie.Type}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-red-500 text-xl mb-4">{error}</div>
            <button
              onClick={fetchRandomMovies}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {movies.length === 0 && !loading && !error && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold mb-4">No movies available</h3>
            <p className="text-gray-400 mb-8">Check back later for new releases</p>
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors"
              >
                Add Movies
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">Enjoy on your TV</h2>
              <p className="text-lg text-gray-300">
                Watch on smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players and more.
              </p>
            </div>
            <div className="relative">
              <img src="/images/tv.png" alt="TV" className="w-full rounded-lg" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
            <div className="order-2 md:order-1">
              <img src="/images/mobile.png" alt="Mobile" className="w-full rounded-lg" />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-bold mb-4">Download your shows to watch offline</h2>
              <p className="text-lg text-gray-300">
                Save your favorites easily and always have something to watch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to watch? Enter your email to create or restart your membership.</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mt-8">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 px-4 py-3 bg-gray-800 rounded-md text-white placeholder-gray-400 border border-gray-600 focus:border-red-600 focus:outline-none"
            />
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
