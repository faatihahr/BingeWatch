'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { Movie, Purchase } from '@/types'

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth('user')
  const [purchasedMovies, setPurchasedMovies] = useState<Purchase[]>([])
  const [watchHistory, setWatchHistory] = useState<Movie[]>([])
  const [favorites, setFavorites] = useState<Movie[]>([])

  useEffect(() => {
    if (isAuthenticated && user) {
      // Mock data - replace with Supabase fetch later
      const mockPurchases: Purchase[] = []
      const mockWatchHistory: Movie[] = []
      const mockFavorites: Movie[] = []

      setPurchasedMovies(mockPurchases)
      setWatchHistory(mockWatchHistory)
      setFavorites(mockFavorites)
    }
  }, [isAuthenticated, user])

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-green-400">Watch History</h3>
            <p className="text-3xl font-bold mb-2">{watchHistory.length}</p>
            <p className="text-gray-400">Movies watched</p>
            <button className="mt-4 w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md transition-colors">
              View History
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-purple-400">Favorites</h3>
            <p className="text-3xl font-bold mb-2">{favorites.length}</p>
            <p className="text-gray-400">Favorite movies</p>
            <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-md transition-colors">
              Manage Favorites
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Continue Watching</h3>
            {watchHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No movies watched yet</p>
                <p className="text-sm mt-2">Start watching to see your progress here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {watchHistory.slice(0, 3).map((movie) => (
                  <div key={movie.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{movie.title}</p>
                      <p className="text-sm text-gray-400">Last watched: 2 days ago</p>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                      Resume
                    </button>
                  </div>
                ))}
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
      </div>
    </div>
  )
}
