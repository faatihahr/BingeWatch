import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    if (!payload || !payload.user_id || !payload.membership_type_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Perform a safe insert-or-update since ON CONFLICT requires a DB unique constraint
    try {
      // Check for existing record
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('membership_purchases')
        .select('id')
        .eq('user_id', payload.user_id)
        .eq('membership_type_id', payload.membership_type_id)
        .limit(1)
        .single()

      if (selectError && (selectError as any).code !== 'PGRST116') {
        console.error('Error checking existing membership_purchase:', selectError)
        return NextResponse.json({ success: false, error: selectError.message || selectError }, { status: 500 })
      }

      if (existing && existing.id) {
        // Update existing row
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('membership_purchases')
          .update(payload)
          .eq('id', existing.id)

        if (updateError) {
          console.error('Failed to update existing membership_purchase:', updateError)
          return NextResponse.json({ success: false, error: updateError.message || updateError }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: updated })
      }

      // Insert new row
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('membership_purchases')
        .insert([payload])

      if (insertError) {
        console.error('Failed to insert membership_purchase:', insertError)
        return NextResponse.json({ success: false, error: insertError.message || insertError }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: inserted })
    } catch (e: any) {
      console.error('create-membership-purchase transaction error:', e)
      return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
    }
  } catch (err: any) {
    console.error('create-membership-purchase error:', err)
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
