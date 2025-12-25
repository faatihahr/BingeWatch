import { NextRequest, NextResponse } from 'next/server';
import { xendit } from '@/lib/xendit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callbackToken = request.headers.get('x-callback-token');

    // Verify the callback token
    if (!callbackToken || !xendit.verifyCallbackToken(callbackToken)) {
      return NextResponse.json(
        { error: 'Invalid callback token' },
        { status: 401 }
      );
    }

    // Handle different types of callbacks
    const { event, data } = body;

    switch (event) {
      case 'invoice.paid':
        await handleInvoicePaid(data);
        break;
      case 'invoice.expired':
        await handleInvoiceExpired(data);
        break;
      case 'ewallet.charge':
        await handleEwalletCharge(data);
        break;
      case 'virtual_account.paid':
        await handleVirtualAccountPaid(data);
        break;
      default:
        console.log('Unhandled callback event:', event);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error handling Xendit callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleInvoicePaid(data: any) {
  // Update payment status in your database
  console.log('Invoice paid:', data);
  
  // Example: Update user membership status
  // await updateUserMembership(data.external_id, 'paid');
}

async function handleInvoiceExpired(data: any) {
  // Handle expired invoice
  console.log('Invoice expired:', data);
  
  // Example: Update payment status
  // await updatePaymentStatus(data.external_id, 'expired');
}

async function handleEwalletCharge(data: any) {
  // Handle e-wallet charge completion
  console.log('E-wallet charge:', data);
  
  // Example: Update payment status
  // await updatePaymentStatus(data.external_id, data.status === 'SUCCEEDED' ? 'paid' : 'failed');
}

async function handleVirtualAccountPaid(data: any) {
  // Handle virtual account payment
  console.log('Virtual account paid:', data);
  
  // Example: Update payment status
  // await updatePaymentStatus(data.external_id, 'paid');
}
