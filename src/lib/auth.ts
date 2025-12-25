import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { DefaultSession } from 'next-auth'
import { getUserUUID } from './uuidConverter'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | 'user'
    } & DefaultSession['user']
  }
  
  interface User {
    id: string
    role: 'admin' | 'user'
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()

          if (!user || !user.password) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Credentials auth error:', error)
          return null
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // For credentials auth, use the user ID directly
        // For Google auth, convert to UUID
        const isGoogleAuth = account?.provider === 'google'
        const userId = isGoogleAuth ? getUserUUID(user.id) : user.id
        console.log('JWT callback: User ID conversion - Original:', user.id, 'Is Google:', isGoogleAuth, '-> Converted:', userId)
        
        // Store all user data in token during login
        token.id = userId
        token.role = user.role || 'user'
        token.originalId = user.id // Store original ID for reference
        token.email = user.email
        token.name = user.name
        token.lastSync = Date.now() // Track when data was synced
        
        // For Google auth users, create user record if not exists
        if (isGoogleAuth) {
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('role')
              .eq('id', userId)
              .single()
            
            if (!existingUser) {
              console.log('Creating user record for Google auth:', userId)
              await supabase
                .from('users')
                .insert({
                  id: userId,
                  email: user.email,
                  name: user.name,
                  role: 'user'
                })
            } else {
              // Update token with actual role from database
              token.role = existingUser.role
            }
          } catch (error) {
            console.error('Error checking/creating Google user:', error)
            // Keep default role 'user' on error
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'admin' | 'user'
        console.log('Session callback: Setting session role to:', token.role)
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      // Default redirect to movies page
      return `${baseUrl}/movies`
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
  },
}
