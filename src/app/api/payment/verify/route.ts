import { NextRequest, NextResponse } from 'next/server';
import { xendit } from '@/lib/xendit';

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
    const invoice = await xendit.getInvoice(invoiceId);

    if (invoice.status === 'PAID') {
      return NextResponse.json({
        success: true,
        payment: {
          id: invoice.id,
          external_id: invoice.external_id,
          amount: invoice.amount,
          status: invoice.status,
          paid_at: invoice.paid_at,
          payment_method: invoice.payment_method,
          payer_email: invoice.payer_email,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
        status: invoice.status,
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
