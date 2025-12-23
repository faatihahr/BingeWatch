'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { formatIDR } from '@/lib/currency'

interface Movie {
  id: string
  title: string
  description: string
  thumbnail: string
  video_url: string
  trailer_url?: string
  duration: number
  price: number
  genre: string[]
  release_date: string
  rating: number
  created_by?: string
  created_at: string
  updated_at: string
}

export default function PurchasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const movieId = searchParams.get('movieId')

  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!movieId) {
      setError('Movie ID is required')
      setLoading(false)
      return
    }

    const fetchMovie = async () => {
      try {
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieId)
          .single()

        if (movieError) throw movieError
        if (!movieData) throw new Error('Movie not found')

        setMovie(movieData)
      } catch (err) {
        console.error('Error fetching movie:', err)
        setError('Failed to load movie details')
      } finally {
        setLoading(false)
      }
    }

    fetchMovie()
  }, [movieId])

  const handlePayment = async () => {
    if (!session?.user || !movie) {
      setError('You must be signed in to make a purchase')
      return
    }

    setProcessingPayment(true)
    try {
      // Check if already purchased
      const { data: existingPurchase } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('movie_id', movie.id)
        .single()

      if (existingPurchase) {
        setError('You have already purchased this movie')
        return
      }

      // Create purchase record
      const { error } = await supabase
        .from('purchases')
        .insert([{
          user_id: session.user.id,
          movie_id: movie.id,
          amount: movie.price
        }])

      if (error) throw error

      // Redirect to movie page after successful purchase
      router.push(`/movies/${movie.id}?purchased=true`)
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to process payment. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading purchase details...</div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Movie not found'}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Purchase Confirmation</h1>
          <p className="text-gray-400 mt-2">Review your purchase details before payment</p>
        </div>

        <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Payment Summary - Shows first on mobile */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold mb-6">Payment Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Movie:</span>
                  <span className="font-medium">{movie.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span>Digital Purchase</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality:</span>
                  <span>HD</span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Price:</span>
                    <span className="text-green-400">{formatIDR(movie.price)}</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {session ? (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-semibold mb-2">Purchasing as:</h4>
                  <p className="text-sm text-gray-300">{session.user.name}</p>
                  <p className="text-sm text-gray-400">{session.user.email}</p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-900 bg-opacity-50 rounded-lg">
                  <p className="text-sm text-yellow-300 mb-2">You need to sign in to complete this purchase</p>
                  <a
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(`/purchase?movieId=${movieId}`)}`}
                    className="block w-full py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-center transition-colors cursor-pointer"
                  >
                    Sign In
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={!session || processingPayment}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {processingPayment ? 'Processing Payment...' : 'Pay Now'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={processingPayment}
                  className="w-full py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Payment Info */}
              <div className="mt-6 p-4 bg-gray-700 rounded-lg text-xs text-gray-400">
                <p className="mb-2">• This is a one-time digital purchase</p>
                <p className="mb-2">• You'll get instant access after payment</p>
                <p className="mb-2">• No refunds for digital content</p>
                <p>• Secure payment processing</p>
              </div>
            </div>
          </div>

          {/* Movie Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Movie Details</h2>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full sm:w-32 h-48 sm:h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{movie.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Rating:</span>
                      <span className="ml-2 font-semibold">{movie.rating}/10</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="ml-2">{movie.duration} min</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Release:</span>
                      <span className="ml-2">{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Genres:</span>
                      <span className="ml-2 break-words">{movie.genre.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Synopsis</h4>
                <p className="text-gray-300 leading-relaxed">{movie.description}</p>
              </div>

              {/* Genres */}
              <div>
                <h4 className="font-semibold mb-2">Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
