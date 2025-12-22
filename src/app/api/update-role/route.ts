import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { role } = await request.json()

    if (!role || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Use the update_user_role function from Supabase
    const { data, error } = await supabase
      .rpc('update_user_role', {
        user_uuid: session.user.id,
        new_role: role
      })

    if (error) {
      console.error('Supabase RPC error:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: `Role updated to ${role}`
    })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
