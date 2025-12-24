'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Membership } from '@/types'
import SearchBar from './SearchBar'
import FilterControls from './FilterControls'

export default function Header({ className = "" }: { className?: string }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)

  // Service role client to bypass RLS for membership lookup
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

  // Fetch user membership data
  useEffect(() => {
    const fetchMembership = async () => {
      if (session?.user) {
        console.log('Header: Fetching membership for user:', session.user.id, session.user.email)
        try {
          // First try to get user by email using service client
          const { data: existingUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('email', session.user.email)
            .single()

          console.log('Header: User lookup result:', { existingUser, userError })

          if (existingUser) {
            // Now get membership using the correct user ID
            const { data: membershipData, error: membershipError } = await supabaseAdmin
              .from('memberships')
              .select(`
                *,
                membership_type:membership_types(*)
              `)
              .eq('user_id', existingUser.id)
              .eq('is_active', true)
              .maybeSingle()

            console.log('Header: Membership query result:', { membershipData, membershipError })
            setMembership(membershipData)
          }
        } catch (error) {
          console.error('Header: Error fetching membership:', error)
        }
      }
    }

    fetchMembership()
  }, [session])

  const shouldShowSearchBar = () => {
    if (!session) return false
    if (session.user?.role === 'admin') return false
    return pathname === '/movies' || pathname === '/dashboard'
  }

  const shouldShowFilters = () => {
    if (!session) return false
    if (session.user?.role === 'admin') return false
    return pathname === '/movies'
  }

  return (
    <header 
      className={`header-component backdrop-blur-lg text-white shadow-lg shadow-blue-500/20 ${className}`}
      style={{ backgroundColor: 'rgba(22, 23, 99, 0.3)' }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-10">
            <Link href="/" className="text-2xl font-bold text-blue-400">
              <img src="/images/Binge.png" alt="BingeWatch" className="h-8 w-32 sm:h-10 sm:w-40" />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-4">
            {shouldShowSearchBar() && <SearchBar />}
            {shouldShowFilters() && <FilterControls />}
          </div>

          {/* Desktop Navigation */}
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

          {/* Desktop User Actions */}
          <div className="hidden sm:flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href={session.user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="text-sm hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {session.user?.name}
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${
                    session.user?.role === 'admin' 
                      ? 'bg-red-600 text-white' 
                      : membership?.membership_type?.name === 'Akut'
                      ? 'bg-purple-600 text-white'
                      : membership?.membership_type?.name === 'Gabut'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {session.user?.role === 'admin' 
                      ? 'Admin' 
                      : membership?.membership_type?.name || 'User'
                    }
                  </span>
                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({membership?.membership_type?.name || 'No membership'})
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
                  aria-label="Sign out"
                >
                  <FiLogOut className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 rounded-md hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <FiX className="w-6 h-6" />
            ) : (
              <FiMenu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden mt-4 pt-4 border-t border-gray-700">
            <div className="space-y-4">
              {/* Mobile Search and Filters */}
              <div className="space-y-3">
                {shouldShowSearchBar() && <SearchBar />}
                {shouldShowFilters() && <FilterControls />}
              </div>

              {/* Mobile Navigation */}
              {session?.user?.role === 'admin' && (
                <nav className="space-y-2">
                  <Link 
                    href="/admin" 
                    className="block py-2 hover:text-blue-400 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                  <Link 
                    href="/movies" 
                    className="block py-2 hover:text-blue-400 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Manage Movies
                  </Link>
                </nav>
              )}

              {/* Mobile User Actions */}
              <div className="pt-4 border-t border-gray-700">
                {status === 'loading' ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : session ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Link 
                        href={session.user?.role === 'admin' ? '/admin' : '/dashboard'}
                        className="text-sm hover:text-blue-400 transition-colors cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {session.user?.name}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full capitalize ${
                          session.user?.role === 'admin' 
                            ? 'bg-red-600 text-white' 
                            : membership?.membership_type?.name === 'Akut'
                            ? 'bg-purple-600 text-white'
                            : membership?.membership_type?.name === 'Gabut'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}>
                          {session.user?.role === 'admin' 
                            ? 'Admin' 
                            : membership?.membership_type?.name || 'User'
                          }
                        </span>
                      </Link>
                    </div>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/auth/signin' })
                        setIsMobileMenuOpen(false)
                      }}
                      className="flex items-center justify-center w-full py-2 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
                      aria-label="Sign out"
                    >
                      <FiLogOut className="w-5 h-5 text-white mr-2" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      signIn('google')
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
