import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function useUserSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Sync user data to Supabase when authenticated
      syncUserToSupabase()
    }
  }, [status, session])

  const syncUserToSupabase = async () => {
    try {
      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Failed to sync user to Supabase')
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    }
  }
}
