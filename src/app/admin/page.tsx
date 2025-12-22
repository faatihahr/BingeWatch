'use client'

import { useAuth } from '@/hooks/useAuth'
import MovieUploadForm from '@/components/admin/MovieUploadForm'
import MovieManager from '@/components/admin/MovieManager'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatIDR } from '@/lib/currency'

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth('admin')
  const [activeTab, setActiveTab] = useState<'upload' | 'movies' | 'analytics'>('upload')
  const [analytics, setAnalytics] = useState({
    totalMovies: 0,
    totalRevenue: 0,
    activeUsers: 0
  })

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab])

  const fetchAnalytics = async () => {
    try {
      // Fetch total movies
      const { count: movieCount } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })

      // Fetch total revenue from purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('price')

      const totalRevenue = purchases?.reduce((sum, purchase) => sum + purchase.price, 0) || 0

      // Fetch active users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      setAnalytics({
        totalMovies: movieCount || 0,
        totalRevenue,
        activeUsers: userCount || 0
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
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
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage movies and analytics</p>
        </div>

        <div className="flex space-x-1 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Upload Movie
          </button>
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'movies'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Manage Movies
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'upload' && <MovieUploadForm />}
        {activeTab === 'movies' && <MovieManager />}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-blue-400">Total Movies</h3>
              <p className="text-3xl font-bold">{analytics.totalMovies}</p>
              <p className="text-gray-400 text-sm">Movies uploaded</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-green-400">Total Revenue</h3>
              <p className="text-3xl font-bold">{formatIDR(analytics.totalRevenue)}</p>
              <p className="text-gray-400 text-sm">From all sales</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-purple-400">Active Users</h3>
              <p className="text-3xl font-bold">{analytics.activeUsers}</p>
              <p className="text-gray-400 text-sm">Registered users</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
