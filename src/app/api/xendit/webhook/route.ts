import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client for database updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nrsklnfxhvfuqixfvzol.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc2tsbmZ4aHZmdXFpeGZ2em9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM5NzEyOCwiZXhwIjoyMDgxOTczMTI4fQ.y6zcM47UFxhguzBo2EHorHckeWgOrLHnyT4sYllZFaQ',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Xendit webhook received - headers:', headers);
    console.log('Xendit webhook received - body:', JSON.stringify(body));

    // Normalize payload: support different Xendit webhook shapes
    // e.g. body may be the invoice object itself or { data: { ... } } or nested
    let payload: any = body
    if (body && typeof body === 'object') {
      if (body.data && typeof body.data === 'object') {
        // prefer body.data.object, body.data.invoice, or body.data
        payload = body.data.object || body.data.invoice || body.data
      }
      // some webhooks wrap the object inside 'data[0]' or similar
      if (!payload || Object.keys(payload).length === 0) {
        payload = body.data?.[0] || body
      }
    }

    // Try multiple possible field names used by Xendit and different endpoints
    const id = payload?.id || body?.id || payload?.invoice_id || payload?.invoiceId || payload?.payment_id
    const external_id = payload?.external_id || payload?.externalId || body?.external_id || body?.externalId
    const status = (payload?.status || body?.status || payload?.payment_status || '').toString().toUpperCase()
    const paid_at = payload?.paid_at || payload?.paidAt || body?.paid_at || body?.paidAt
    const payment_method = payload?.payment_method || payload?.paymentMethod || body?.payment_method

    console.log('Parsed webhook values:', { id, external_id, status, paid_at, payment_method })

    if (status === 'PAID') {
      console.log('Payment PAID via webhook - updating database');

      try {
        let updated = false

        // 1) Try update by external_id if available
        if (external_id) {
          console.log('Attempting update by external_id:', external_id)
          const { data, error } = await supabaseAdmin
            .from('purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', external_id)

          if (error) {
            console.error('Failed to update purchases by external_id:', error)
          } else if (data && data.length > 0) {
            console.log('Updated purchases by external_id:', data)
            updated = true
          }

          // membership_purchases as well
          const { data: mData, error: mError } = await supabaseAdmin
            .from('membership_purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', external_id)

          if (mError) {
            console.error('Failed to update membership_purchases by external_id:', mError)
          } else if (mData && mData.length > 0) {
            console.log('Updated membership_purchases by external_id:', mData)
            updated = true
          }
        }

        // 2) If not updated yet, try to match by invoice id appearing in invoice_url or external_id
        if (!updated && id) {
          console.log('Attempting fallback update by invoice id presence in invoice_url or external_id:', id)

          // update purchases where invoice_url contains id
          const { data: d1, error: e1 } = await supabaseAdmin
            .from('purchases')
            .update({ payment_status: 'paid' })
            .ilike('invoice_url', `%${id}%`)

          if (e1) console.error('Error updating purchases by invoice_url ilike:', e1)
          if (d1 && d1.length > 0) {
            console.log('Updated purchases by invoice_url ilike:', d1)
            updated = true
          }

          // update purchases where external_id contains id
          const { data: d2, error: e2 } = await supabaseAdmin
            .from('purchases')
            .update({ payment_status: 'paid' })
            .ilike('external_id', `%${id}%`)

          if (e2) console.error('Error updating purchases by external_id ilike:', e2)
          if (d2 && d2.length > 0) {
            console.log('Updated purchases by external_id ilike:', d2)
            updated = true
          }

          // membership_purchases fallback
          const { data: m3, error: m3e } = await supabaseAdmin
            .from('membership_purchases')
            .update({ payment_status: 'paid' })
            .ilike('invoice_url', `%${id}%`)

          if (m3e) console.error('Error updating membership_purchases by invoice_url ilike:', m3e)
          if (m3 && m3.length > 0) {
            console.log('Updated membership_purchases by invoice_url ilike:', m3)
            updated = true
          }
        }

        if (!updated) {
          console.log('Webhook processed but no matching purchase found to update. Payload logged above for inspection.')
        }
      } catch (dbError) {
        console.error('Webhook database update error:', dbError);
      }
    } else {
      console.log('Webhook received with non-PAID status:', status)
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
