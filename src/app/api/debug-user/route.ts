import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check session data
    const sessionData = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image
    }

    // Check if user exists in our database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Check if functions exist
    const { data: functions, error: funcError } = await supabase
      .rpc('sync_existing_user', {
        user_uuid: session.user.id,
        user_email: session.user.email!,
        user_name: session.user.name!,
        user_image: session.user.image || null
      })

    return NextResponse.json({
      session: sessionData,
      databaseUser: dbUser,
      databaseError: dbError,
      syncResult: functions,
      functionError: funcError
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
