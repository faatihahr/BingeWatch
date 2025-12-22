import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getUserUUID } from '@/lib/uuidConverter'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Convert session ID to UUID for database compatibility
    const userUUID = getUserUUID(session.user.id)

    // Use the sync_existing_user function from Supabase
    const { data, error } = await supabase
      .rpc('sync_existing_user', {
        user_uuid: userUUID,
        user_email: session.user.email!,
        user_name: session.user.name!,
        user_image: session.user.image || null
      })

    if (error) {
      console.error('Supabase RPC error:', error)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    return NextResponse.json({
      success: data.success,
      action: data.action,
      user: data.user,
      message: data.action === 'created' ? 'User created successfully' : 'User already exists'
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user from our database using UUID
    const userUUID = getUserUUID(session.user.id)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userUUID)
      .single()

    if (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
