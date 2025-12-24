'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import SignInForm from '@/components/auth/SignInForm'

export default function SignIn() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // Redirect based on role after login (but not on sign in page itself)
  useEffect(() => {
    if (status === 'authenticated' && session?.user && pathname === '/auth/signin') {
      if (session.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [status, session, router, pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">BingeWatch</h1>
          <p className="text-gray-400">Your ultimate movie streaming experience</p>
        </div>
        
        <SignInForm />
      </div>
    </div>
  )
}
