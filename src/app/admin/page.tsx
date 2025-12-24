'use client'

import { useAuth } from '@/hooks/useAuth'
import MovieUploadForm from '@/components/admin/MovieUploadForm'
import MovieManager from '@/components/admin/MovieManager'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { formatIDR } from '@/lib/currency'

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth('admin')
  const [activeTab, setActiveTab] = useState<'upload' | 'movies' | 'analytics'>('upload')
  const [analytics, setAnalytics] = useState({
    totalMovies: 0,
    totalRevenue: 0,
    activeUsers: 0
  })

  // Service role client to bypass RLS for analytics
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
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab])

  const fetchAnalytics = async () => {
    try {
      console.log('Starting analytics fetch...')
      
      // Fetch total movies
      const { count: movieCount, error: movieError } = await supabaseAdmin
        .from('movies')
        .select('*', { count: 'exact', head: true })
      
      console.log('Movies count:', movieCount, 'Error:', movieError)

      // Fetch total revenue from purchases - try simpler query first
      const { data: purchases, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .limit(1)
      
      console.log('Purchases data:', purchases, 'Error:', purchaseError)

      // Fetch total registered users
      const { count: userCount, error: userError } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })

      console.log('User Count:', userCount)
      console.log('User Count Error:', userError)

      setAnalytics({
        totalMovies: movieCount || 0,
        totalRevenue: 0, // Set to 0 temporarily
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
