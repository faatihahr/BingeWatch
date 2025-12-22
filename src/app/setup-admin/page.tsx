'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SetupAdmin() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [message, setMessage] = useState('')

  const setupAsAdmin = async () => {
    if (!session?.user) return

    setIsSettingUp(true)
    setMessage('Setting up admin account...')

    try {
      // First sync user to Supabase
      const syncResponse = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!syncResponse.ok) {
        throw new Error('Failed to sync user')
      }

      // Then update role to admin
      const updateResponse = await fetch('/api/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin' }),
      })

      if (updateResponse.ok) {
        setMessage('Admin setup successful! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        throw new Error('Failed to update role')
      }
    } catch (error) {
      console.error('Setup error:', error)
      setMessage('Setup failed. Please try again.')
    } finally {
      setIsSettingUp(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">Setup Admin Account</h1>
          <p className="text-center text-gray-400">
            Configure your account as admin for BingeWatch
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">
                {session.user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-semibold">{session.user?.name}</h2>
            <p className="text-gray-400 text-sm">{session.user?.email}</p>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-md text-center ${
              message.includes('successful') 
                ? 'bg-green-900 text-green-200' 
                : 'bg-red-900 text-red-200'
            }`}>
              {message}
            </div>
          )}

          <button
            onClick={setupAsAdmin}
            disabled={isSettingUp}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSettingUp ? 'Setting up...' : 'Setup as Admin'}
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Continue as regular user
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
