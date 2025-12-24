import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Only handle root path redirect
  if (pathname === '/') {
    // Check if user is coming from auth callback
    const url = request.url
    if (url.includes('callback') || url.includes('signin')) {
      return NextResponse.next()
    }
    
    // Get session cookie to check if user is logged in
    const sessionCookie = request.cookies.get('next-auth.session-token') || 
                        request.cookies.get('__Secure-next-auth.session-token')
    
    if (sessionCookie) {
      // User is logged in, redirect to movies page
      return NextResponse.redirect(new URL('/movies', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/']
}
