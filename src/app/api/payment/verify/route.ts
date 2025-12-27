import { NextRequest, NextResponse } from 'next/server';
import { xendit } from '@/lib/xendit';
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
    const { invoiceId, externalId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get invoice details from Xendit
    console.log('Verifying payment for invoice:', invoiceId, 'externalId:', externalId);
    
    let invoice;
    try {
      invoice = await xendit.getInvoice(invoiceId);
      console.log('Xendit invoice status:', invoice.status);
    } catch (xenditError: any) {
      console.error('Error getting invoice from Xendit:', xenditError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify payment with Xendit',
        details: xenditError?.message || 'Unknown error'
      });
    }

    if (invoice && invoice.status === 'PAID') {
      // Payment is paid, update database
      try {
        console.log('Updating payment status to PAID in database...');
        
        // Update purchases table
        if (externalId && externalId.includes('movie')) {
          console.log('Updating movie purchase...');
          const { error } = await supabaseAdmin
            .from('purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', externalId);
          
          if (error) {
            console.error('Failed to update movie purchase:', error);
            throw error;
          }
        }
        
        // Update membership_purchases table if it's a membership
        if (externalId && externalId.includes('membership')) {
          console.log('Updating membership purchase...');
          const { error } = await supabaseAdmin
            .from('membership_purchases')
            .update({ payment_status: 'paid' })
            .eq('external_id', externalId);
          
          if (error) {
            console.error('Failed to update membership purchase:', error);
            throw error;
          }
        }
        
        console.log('Database updated successfully');
      } catch (dbError) {
        console.error('Failed to update payment status in database:', dbError);
        // Don't throw error here, still return success since Xendit shows PAID
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: invoice.id,
          external_id: invoice.externalId,
          amount: invoice.amount,
          status: invoice.status,
          paid_at: (invoice as any).paid_at || (invoice as any).paidAt,
          payment_method: (invoice as any).payment_method || (invoice as any).paymentMethod,
          payer_email: (invoice as any).payer_email || (invoice as any).payerEmail,
        },
      });
    } else if (invoice) {
      // Payment exists but not paid
      console.log('Payment not completed, current status:', invoice.status);
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
        status: invoice.status,
      });
    } else {
      // Invoice not found
      console.log('Invoice not found');
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
