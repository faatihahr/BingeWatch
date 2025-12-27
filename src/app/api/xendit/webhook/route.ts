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
    console.log('Xendit webhook received:', body);

    // Extract relevant data from webhook
    const { id, external_id, status, paid_at, payment_method } = body;

    if (status === 'PAID') {
      console.log('Payment PAID via webhook - updating database');
      
      try {
        // Update purchases table
        if (external_id && external_id.includes('movie')) {
          console.log('Updating movie purchase via webhook...');
          const { error } = await supabaseAdmin
            .from('purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', external_id);
          
          if (error) {
            console.error('Failed to update movie purchase via webhook:', error);
          } else {
            console.log('Movie purchase updated successfully via webhook');
          }
        }
        
        // Update membership_purchases table if it's a membership
        if (external_id && external_id.includes('membership')) {
          console.log('Updating membership purchase via webhook...');
          const { error } = await supabaseAdmin
            .from('membership_purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', external_id);
          
          if (error) {
            console.error('Failed to update membership purchase via webhook:', error);
          } else {
            console.log('Membership purchase updated successfully via webhook');
          }
        }
      } catch (dbError) {
        console.error('Webhook database update error:', dbError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
