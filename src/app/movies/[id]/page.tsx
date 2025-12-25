'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Movie, Membership } from '@/types'
import { formatIDR } from '@/lib/currency'
import { FiPlay, FiCalendar, FiClock, FiStar, FiThumbsUp, FiMessageCircle, FiShare2, FiChevronLeft } from 'react-icons/fi'
import { omdbService } from '@/lib/omdb'
import MoviePlayerModal from '@/components/MoviePlayerModal'

interface Comment {
  id: string
  movie_id: string
  user_id: string
  content: string
  rating?: number
  created_at: string
  updated_at: string
  user?: {
    name: string
    email: string
  }
}

interface OMDBDetailResponse {
  Actors: string
  Director: string
  Writer: string
  Language: string
  Country: string
  Awards: string
  BoxOffice: string
  Production: string
  Website: string
  [key: string]: any
}

export default function MovieDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const movieId = params.id as string

  const [movie, setMovie] = useState<Movie | null>(null)
  const [omdbData, setOmdbData] = useState<OMDBDetailResponse | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [isPurchased, setIsPurchased] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)

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

  console.log('Supabase Admin URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Service Key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  useEffect(() => {
    console.log('Movie Page: useEffect triggered with movieId:', movieId)
    console.log('Movie Page: Session available:', !!session)
    console.log('Movie Page: Session user:', session?.user?.email)
    
    const fetchMovieAndUser = async () => {
      try {
        console.log('Using NextAuth session:', !!session)
        
        // Fetch movie details
        console.log('Fetching movie with ID:', movieId)
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('*')
          .eq('id', movieId)
          .single()

        console.log('Movie query result:', { movieData, movieError })

        if (movieError) {
          console.error('Movie query error:', movieError)
          throw movieError
        }
        
        if (!movieData) {
          console.error('No movie found with ID:', movieId)
          
          // Try to get available movies for debugging
          const { data: allMovies } = await supabase
            .from('movies')
            .select('id, title, created_at')
            .limit(10)
          
          console.log('Available movies:', allMovies)
          setError(`Movie not found. Available movies: ${allMovies?.map(m => `${m.title} (${m.id})`).join(', ') || 'None'}`)
          return
        }

        setMovie(movieData)

        // Check if user has purchased this movie and get membership info
        if (session?.user) {
          console.log('Movie Page: Checking purchase for user:', session.user.email, 'User ID:', session.user.id)
          
          try {
            // First try to get user by email using service client
            console.log('Movie Page: Attempting user lookup with service client...')
            const { data: existingUser, error: userError } = await supabaseAdmin
              .from('users')
              .select('id, name, email')
              .eq('email', session.user.email)
              .single()

            console.log('Movie Page: User lookup result:', { 
            existingUser, 
            userError,
            userEmail: session.user.email,
            userId: session.user.id
          })

            if (userError) {
              console.error('Movie Page: User lookup error:', userError)
            }

            if (existingUser) {
              console.log('Movie Page: User found, fetching membership...')
              // Now get membership using the correct user ID
              const { data: membershipData, error: membershipError } = await supabaseAdmin
                .from('memberships')
                .select(`
                  *,
                  membership_type:membership_types(*)
                `)
                .eq('user_id', existingUser.id)
                .eq('is_active', true)
                .maybeSingle()

              console.log('Movie Page: Membership query result:', { membershipData, membershipError })
              
              if (membershipError) {
                console.error('Movie Page: Membership query error:', membershipError)
              }
              
              setMembership(membershipData)
              
              // Check purchase with correct user ID
              console.log('Movie Page: Check if user has purchased this movie (only successful payments)')
              const { data: purchaseData, error: purchaseError } = await supabaseAdmin
                .from('purchases')
                .select('*')
                .eq('user_id', existingUser.id)
                .eq('movie_id', movieId)
                .eq('is_expired', false)
                .in('payment_status', ['paid', 'completed', 'Completed'])
                .maybeSingle()

              console.log('Movie Page: Purchase query result:', { purchaseData, purchaseError })
              setIsPurchased(!!purchaseData)
            } else {
              console.error('Movie Page: User not found in database!')
            }
          } catch (error) {
            console.error('Movie Page: Error in user/membership lookup:', error)
          }
        }

        // Fetch comments for this movie
        const { data: commentsData } = await supabase
          .from('comments')
          .select(`
            *,
            user:users(name, email)
          `)
          .eq('movie_id', movieId)
          .order('created_at', { ascending: false })

        setComments(commentsData || [])

        // Fetch additional data from OMDB if needed
        try {
          const omdbDetails = await omdbService.findBestMatch(movieData.title)
          if (omdbDetails) {
            setOmdbData(omdbDetails)
          }
        } catch (omdbError) {
          console.log('OMDB data not available:', omdbError)
        }
      } catch (err) {
        console.error('Error fetching movie:', err)
        setError('Failed to load movie details')
      } finally {
        setLoading(false)
      }
    }

    fetchMovieAndUser()
  }, [movieId, session])

  const handlePurchase = () => {
    if (!session?.user || !movie) {
      console.error('No session or movie data for purchase')
      return
    }

    // Redirect to purchase confirmation page
    router.push(`/purchase?movieId=${movie.id}`)
  }

  const handleWatchMovie = () => {
    if (movie && (isPurchased || membership?.membership_type?.name === 'Akut')) {
      setIsPlayerOpen(true)
    }
  }

  const canWatchMovie = () => {
    return isPurchased || membership?.membership_type?.name === 'Akut'
  }

  const canPurchaseMovie = () => {
    // If no membership data, assume user can purchase (default behavior)
    if (!membership) return true
    
    // Gabut members can purchase movies
    if (membership.membership_type?.name === 'Gabut') return true
    
    // Check the can_purchase_movies flag
    return membership.membership_type?.can_purchase_movies === true
  }

  const getActionButtonText = () => {
    if (!session) return 'Sign In to Watch'
    if (membership?.membership_type?.name === 'Akut') return 'Watch Now'
    if (isPurchased) return 'Watch Full Movie'
    if (canPurchaseMovie()) return 'Purchase Movie'
    return 'Upgrade to Watch'
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user || !movie || !newComment.trim()) {
      console.log('Validation failed:', { session: !!session, movie: !!movie, comment: newComment.trim().length })
      return
    }

    setSubmittingComment(true)
    try {
      console.log('Submitting comment:', {
        movie_id: movie.id,
        user_id: session.user.id,
        content: newComment.trim(),
        rating: newRating
      })

      // Find existing user by email using service client (bypasses RLS)
      const { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      console.log('Existing user lookup:', { existingUser, userError })

      if (!existingUser) {
        throw new Error('User not found in database. Please contact support.')
      }

      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert([{
          movie_id: movie.id,
          user_id: existingUser.id, // Use existing user ID
          content: newComment.trim(),
          rating: newRating
        }])
        .select(`
          *,
          user:users(name, email)
        `)
        .single()

      console.log('Comment submission result:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      if (!data) {
        throw new Error('No data returned from comment insertion')
      }

      // Add new comment to the top of the list
      setComments(prev => [data, ...prev])
      setNewComment('')
      setNewRating(5)
    } catch (err) {
      console.error('Error submitting comment:', err)
      setError(`Failed to submit comment: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.user) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session.user.id)

      if (error) throw error

      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (err) {
      console.error('Error deleting comment:', err)
      setError('Failed to delete comment')
    }
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return null
    
    // Convert YouTube URL to embed format
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }
    
    return url
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading movie details...</div>
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const trailerEmbedUrl = movie.trailer_url ? getEmbedUrl(movie.trailer_url) : null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors cursor-pointer"
        >
          ← Back to Movies
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Movie Poster and Basic Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <img
                src={movie.thumbnail}
                alt={movie.title}
                className="w-full rounded-lg shadow-xl mb-6"
              />
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-4">{movie.title}</h1>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rating:</span>
                    <span className="font-semibold">{movie.rating}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span>{movie.duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Release:</span>
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                  </div>
                  {!(membership?.membership_type?.name === 'Akut') && !isPurchased && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price:</span>
                      <span className="font-semibold text-green-400">{formatIDR(movie.price)}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Genres</h3>
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

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!session ? (
                    <div className="text-center">
                      <p className="text-gray-400 mb-3">Sign in to access this movie</p>
                      <a 
                        href="/auth/signin" 
                        className="block w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors text-center cursor-pointer"
                      >
                        Sign In to Watch
                      </a>
                    </div>
                  ) : canWatchMovie() ? (
                    <button
                      onClick={handleWatchMovie}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors cursor-pointer"
                    >
                      {membership?.membership_type?.name === 'Akut' ? 'Watch Now' : 'Watch Full Movie'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchase}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors cursor-pointer"
                    >
                      Purchase Movie{!(membership?.membership_type?.name === 'Akut') && !isPurchased && ` - ${formatIDR(movie.price)}`}
                    </button>
                  )}

                  {/* Membership Status */}
                  {membership && (
                    <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          Membership: {membership.membership_type?.name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          membership.membership_type?.name === 'Akut' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-blue-600 text-white'
                        }`}>
                          {membership.membership_type?.name}
                        </span>
                      </div>
                      {membership.membership_type?.name === 'Gabut' && (
                        <p className="text-xs text-gray-400 mt-2">
                          Movies expire after 7 days from purchase
                        </p>
                      )}
                      {membership.membership_type?.name === 'Akut' && (
                        <p className="text-xs text-gray-400 mt-2">
                          Unlimited access until {new Date(membership.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-gray-700 rounded-lg text-xs">
                      <p className="text-gray-400">Debug Info:</p>
                      <p>User ID: {session?.user?.id || 'Not available'}</p>
                      <p>Membership: {membership?.membership_type?.name || 'Not loaded'}</p>
                      <p>Can Purchase: {canPurchaseMovie() ? 'Yes' : 'No'}</p>
                      <p>Can Watch: {canWatchMovie() ? 'Yes' : 'No'}</p>
                      <p>Is Purchased: {isPurchased ? 'Yes' : 'No'}</p>
                      {membership && (
                        <p>Membership ID: {membership.id}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Movie Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trailer Section */}
            {trailerEmbedUrl && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Trailer</h2>
                <div className="aspect-video">
                  <iframe
                    src={trailerEmbedUrl}
                    title={`${movie.title} Trailer`}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Synopsis */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Synopsis</h2>
              <p className="text-gray-300 leading-relaxed">{movie.description}</p>
            </div>

            {/* Cast and Crew - from OMDB */}
            {omdbData && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Cast & Crew</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {omdbData.Actors && omdbData.Actors !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Actors</h3>
                      <p className="text-gray-300">{omdbData.Actors}</p>
                    </div>
                  )}
                  {omdbData.Director && omdbData.Director !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Director</h3>
                      <p className="text-gray-300">{omdbData.Director}</p>
                    </div>
                  )}
                  {omdbData.Writer && omdbData.Writer !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Writer</h3>
                      <p className="text-gray-300">{omdbData.Writer}</p>
                    </div>
                  )}
                  {omdbData.Language && omdbData.Language !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Language</h3>
                      <p className="text-gray-300">{omdbData.Language}</p>
                    </div>
                  )}
                  {omdbData.Country && omdbData.Country !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Country</h3>
                      <p className="text-gray-300">{omdbData.Country}</p>
                    </div>
                  )}
                  {omdbData.Awards && omdbData.Awards !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Awards</h3>
                      <p className="text-gray-300">{omdbData.Awards}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional OMDB Info */}
            {omdbData && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Additional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {omdbData.BoxOffice && omdbData.BoxOffice !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Box Office</h3>
                      <p className="text-gray-300">{omdbData.BoxOffice}</p>
                    </div>
                  )}
                  {omdbData.Production && omdbData.Production !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Production</h3>
                      <p className="text-gray-300">{omdbData.Production}</p>
                    </div>
                  )}
                  {omdbData.Website && omdbData.Website !== 'N/A' && (
                    <div>
                      <h3 className="font-semibold text-gray-400 mb-2">Website</h3>
                      <a
                        href={omdbData.Website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {omdbData.Website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          {/* Comments Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">User Reviews & Comments</h2>
              
              {/* Comment Form */}
              {session ? (
                <form onSubmit={handleSubmitComment} className="mb-8 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Your Rating</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={newRating}
                        onChange={(e) => setNewRating(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold w-12 text-center">{newRating}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Your Comment</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts about this movie..."
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submittingComment ? 'Posting...' : 'Post Review'}
                  </button>
                </form>
              ) : (
                <div className="mb-8 p-4 bg-gray-700 rounded-lg text-center">
                  <p className="text-gray-400 mb-3">Sign in to write a review</p>
                  <a 
                    href="/auth/signin" 
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
                  >
                    Sign In
                  </a>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No reviews yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{comment.user?.name || 'Anonymous'}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Rating: {comment.rating}/10</span>
                            <span>•</span>
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {session?.user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-400 hover:text-red-300 text-sm cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Movie Player Modal */}
      {movie && (
        <MoviePlayerModal
          isOpen={isPlayerOpen}
          onClose={() => setIsPlayerOpen(false)}
          videoUrl={movie.video_url}
          movieTitle={movie.title}
          movieId={movie.id}
        />
      )}
    </div>
  )
}