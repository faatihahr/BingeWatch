'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { Movie, Purchase, Membership } from '@/types'
import MembershipOffer from '@/components/MembershipOffer'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth('user')
  const { data: session } = useSession()
  const [purchasedMovies, setPurchasedMovies] = useState<Purchase[]>([])
  const [watchHistory, setWatchHistory] = useState<Movie[]>([])
  const [favorites, setFavorites] = useState<Movie[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [showMembershipOffer, setShowMembershipOffer] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showAllContinue, setShowAllContinue] = useState(false)

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
    if (isAuthenticated && user && session) {
      fetchUserData()
    }
  }, [isAuthenticated, user, session])

  const fetchUserData = async () => {
    if (!session?.user || !user) return

    try {
      // Find user by email using service client
      const { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single()

      if (userError || !existingUser) {
        console.error('User not found:', userError)
        return
      }

      // Fetch watch history with movie details
      const { data: watchHistoryData, error: watchHistoryError } = await supabaseAdmin
        .from('watch_history')
        .select(`
          *,
          movies (*)
        `)
        .eq('user_id', existingUser.id)
        .order('watched_at', { ascending: false })

      if (watchHistoryError) {
        console.error('Watch history error:', watchHistoryError)
      } else {
        // Transform watch history data to Movie objects
        const movies = watchHistoryData?.map(item => item.movies).filter(Boolean) || []
        setWatchHistory(movies)
      }

      // Fetch purchases
      const { data: purchaseData, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .select(`
          *,
          movies (*)
        `)
        .eq('user_id', existingUser.id)
        .eq('is_expired', false)
        .order('purchase_date', { ascending: false })

      if (purchaseError) {
        console.error('Purchase error:', purchaseError)
      } else {
        setPurchasedMovies(purchaseData || [])
      }

      // Fetch membership
      const { data: membershipData, error: membershipError } = await supabaseAdmin
        .from('memberships')
        .select(`
          *,
          membership_type:membership_types(*)
        `)
        .eq('user_id', existingUser.id)
        .eq('is_active', true)
        .maybeSingle()

      if (membershipError) {
        console.error('Membership error:', membershipError)
      } else {
        setMembership(membershipData)
        
        // Check if user has membership and show offer if not
        if (user.role !== 'admin' && (!membershipData || membershipData.membership_type?.name !== 'Akut')) {
          setShowMembershipOffer(true)
        }
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
          <p className="text-gray-400">Manage your movie library and viewing history</p>
        </div>

        <div className={`grid gap-6 mb-8 ${membership?.membership_type?.name === 'Akut' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {/* My Movies Section - Hide for Akut members */}
          {(!membership || membership.membership_type?.name !== 'Akut') && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">My Movies</h3>
              <p className="text-3xl font-bold mb-2">{purchasedMovies.length}</p>
              <p className="text-gray-400">Movies in your library</p>
              <button 
                onClick={() => window.location.href = '/movies'}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-md transition-colors"
              >
                Browse Movies
              </button>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-green-400">Watch History</h3>
            {watchHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No movies watched yet</p>
                <p className="text-sm mt-2">Start watching to see your progress here</p>
              </div>
            ) : (
              <div className="relative">
                <div className={`flex overflow-x-auto space-x-4 pb-4 scrollbar-hide`}>
                  {(showAllHistory ? watchHistory : watchHistory.slice(0, 5)).map((movie) => (
                    <div key={movie.id} className={`cursor-pointer hover:opacity-80 transition-opacity ${membership?.membership_type?.name === 'Akut' ? 'flex-none w-40' : 'flex-none w-32'}`}>
                      <img 
                        src={movie.thumbnail || '/placeholder-movie.jpg'} 
                        alt={movie.title} 
                        className="rounded-md object-cover w-full h-48"
                      />
                      <p className="text-sm mt-2 truncate text-white">{movie.title}</p>
                    </div>
                  ))}
                </div>
                {watchHistory.length > 5 && (
                  <div className="flex justify-center mt-4">
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors text-sm"
                    >
                      {showAllHistory ? 'Show Less' : `View All (${watchHistory.length})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`grid gap-8 ${membership?.membership_type?.name === 'Akut' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Recent Purchases Section - Hide for Akut members */}
          {(!membership || membership.membership_type?.name !== 'Akut') && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4">Recent Purchases</h3>
              {purchasedMovies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No movies purchased yet</p>
                  <p className="text-sm mt-2">Browse movies and start building your collection</p>
                  <button 
                    onClick={() => window.location.href = '/movies'}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm"
                  >
                    Browse Movies
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchasedMovies.slice(0, 3).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{purchase.movie?.title}</p>
                        <p className="text-sm text-gray-400">${purchase.amount}</p>
                      </div>
                      <button className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
                        Watch
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Continue Watching</h3>
            {watchHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No movies watched yet</p>
                <p className="text-sm mt-2">Start watching to see your progress here</p>
              </div>
            ) : (
              <div className="relative">
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
                  {(showAllContinue ? watchHistory : watchHistory.slice(0, 5)).map((movie) => (
                    <div key={movie.id} className={`cursor-pointer hover:opacity-80 transition-opacity ${membership?.membership_type?.name === 'Akut' ? 'flex-none w-40' : 'flex-none w-32'}`}>
                      <img 
                        src={movie.thumbnail || '/placeholder-movie.jpg'} 
                        alt={movie.title} 
                        className="rounded-md object-cover w-full h-48"
                      />
                      <p className="text-sm mt-2 truncate text-white">{movie.title}</p>
                    </div>
                  ))}
                </div>
                {watchHistory.length > 5 && (
                  <div className="flex justify-center mt-4">
                    <button 
                      onClick={() => setShowAllContinue(!showAllContinue)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm"
                    >
                      {showAllContinue ? 'Show Less' : `View All (${watchHistory.length})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Account Type</p>
              <p className="font-medium capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="font-medium">December 2024</p>
            </div>
          </div>
        </div>

        {/* Membership Offer Section */}
        {showMembershipOffer && user.role !== 'admin' && (
          <div className="mt-8">
            <MembershipOffer 
              onUpgrade={(membershipType) => {
                // Handle membership upgrade logic here
                console.log('Upgrading to:', membershipType.name)
                // You would typically call an API here to process the payment
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}