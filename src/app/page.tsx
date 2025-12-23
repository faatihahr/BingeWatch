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
      {/* Hero Section */}
      <div className="relative h-screen">
        <img 
          src="/images/hero.png" 
          alt="Hero Background" 
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
          </div>
        </div>
      </div>

      
      {/* Features Section */}
      <div className="border-t border-gray-800 bg-[#161763]">
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
      <div className="border-t border-gray-800 bg-[#161763]">
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
