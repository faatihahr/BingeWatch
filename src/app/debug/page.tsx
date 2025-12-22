'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchDebugData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug-user')
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('Debug fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const manualSync = async () => {
    try {
      const response = await fetch('/api/sync-user', { method: 'POST' })
      const data = await response.json()
      alert(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Sync error:', error)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">User Sync Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p>Status: {status}</p>
            <p>User ID: {session?.user?.id}</p>
            <p>Email: {session?.user?.email}</p>
            <p>Name: {session?.user?.name}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={fetchDebugData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Debug Data'}
          </button>
          
          <button
            onClick={manualSync}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            Manual Sync
          </button>
        </div>

        {debugData && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            <pre className="text-xs bg-gray-900 p-4 rounded overflow-x-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
