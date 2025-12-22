import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(requiredRole?: 'admin' | 'user') {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && requiredRole && session?.user?.role !== requiredRole) {
      router.push(session.user.role === 'admin' ? '/admin' : '/dashboard')
      return
    }
  }, [status, session, requiredRole, router])

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    role: session?.user?.role
  }
}
