'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Movie, Membership } from '@/types'
import { supabase } from '@/lib/supabase'
import { formatIDR } from '@/lib/currency'
import { useFilters } from '@/contexts/FilterContext'
import TopMovies from '@/components/TopMovies'
import { createClient } from '@supabase/supabase-js'

export default function MoviesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState<Membership | null>(null)
  const { filters } = useFilters()

  // Service role client to bypass RLS for user lookup
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nrsklnfxhvfuqixfvzol.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc2tsbmZ4aHZmdXFpeGZ2em9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM5NzEyOCwiZXhwIjoyMDgxOTczMTI4fQ.y6zcM47UFxhguzBo2EHorHckeWgOrLHnyT4sYllZFaQ',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchMovies()
    fetchMembership()
  }, [])

  const fetchMembership = async () => {
    if (!session?.user) return

    try {
      // Find user by email using service client
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single()

      if (!existingUser) return

      // Fetch membership
      const { data: membershipData } = await supabaseAdmin
        .from('memberships')
        .select(`
          *,
          membership_type:membership_types(*)
        `)
        .eq('user_id', existingUser.id)
        .eq('is_active', true)
        .maybeSingle()

      setMembership(membershipData)
    } catch (error) {
      console.error('Error fetching membership:', error)
    }
  }

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      if (filters.genre && !movie.genre.includes(filters.genre)) {
        return false
      }
      
      if (filters.year) {
        const movieYear = new Date(movie.release_date).getFullYear().toString()
        if (movieYear !== filters.year) {
          return false
        }
      }
      
      return true
    })
  }, [movies, filters])

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching movies:', error)
        // Fallback to mock data if error
        setMovies([
          {
            id: '1',
            title: 'Sample Movie 1',
            description: 'An exciting movie about adventure and discovery.',
            thumbnail: 'https://via.placeholder.com/300x450',
            video_url: '',
            duration: 120,
            price: 15000,
            genre: ['Action', 'Adventure'],
            release_date: '2024-01-01',
            rating: 4.5,
            created_at: new Date().toISOString()
          }
        ])
      } else {
        setMovies(data || [])
      }
    } catch (error) {
      console.error('Error fetching movies:', error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* TOP Movies Section */}
      <TopMovies />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold mb-2 sm:text-3xl">Browse Movies</h1>
          <p className="text-gray-400 text-sm sm:text-base">Discover and purchase your favorite movies</p>
          {filteredMovies.length !== movies.length && (
            <p className="text-blue-400 text-sm mt-2">
              Showing {filteredMovies.length} of {movies.length} movies
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-6">
          {filteredMovies.map((movie) => (
            <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
              <a href={`/movies/${movie.id}`} className="block">
                <div className="aspect-w-2 aspect-h-3 bg-gray-700">
                  {movie.thumbnail ? (
                    <img 
                      src={movie.thumbnail} 
                      alt={movie.title}
                      className="w-full h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x450/374151/6B7280?text=No+Poster'
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-700 flex items-center justify-center text-gray-500">
                      <span className="text-sm">No Poster</span>
                    </div>
                  )}
                </div>
              </a>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-2 truncate">
                  <a href={`/movies/${movie.id}`} className="hover:text-blue-400 transition-colors">
                    {movie.title}
                  </a>
                </h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{movie.description}</p>
                <div className="flex items-center justify-between mb-3">
                  {membership?.membership_type?.name !== 'Akut' && (
                    <span className="text-blue-400 font-bold">{formatIDR(movie.price)}</span>
                  )}
                  <div className={`flex items-center ${membership?.membership_type?.name === 'Akut' ? 'ml-auto' : ''}`}>
                    <span className="text-yellow-400 text-sm mr-1">★</span>
                    <span className="text-sm text-gray-400">{movie.rating}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {movie.genre.map((g, index) => (
                    <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {g}
                    </span>
                  ))}
                </div>
                <a 
                  href={`/movies/${movie.id}`} 
                  className="block w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md transition-colors text-sm text-center"
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {movies.length === 0 ? "No movies available at the moment." : "No movies match your filters."}
            </p>
            {movies.length > 0 && (filters.genre || filters.year) ? (
              <button 
                onClick={() => {/* Clear filters functionality will be handled by FilterControls */}}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear filters to see all movies
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
