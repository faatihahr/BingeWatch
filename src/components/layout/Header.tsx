'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-400">
            BingeWatch
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            {session?.user?.role === 'admin' ? (
              <>
                <Link href="/admin" className="hover:text-blue-400 transition-colors">
                  Admin Dashboard
                </Link>
                <Link href="/movies" className="hover:text-blue-400 transition-colors">
                  Manage Movies
                </Link>
              </>
            ) : null}
          </nav>

          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  {session.user?.name}
                  <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded-full capitalize">
                    {session.user?.role}
                  </span>
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
