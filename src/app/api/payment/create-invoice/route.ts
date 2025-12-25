import { NextRequest, NextResponse } from 'next/server';
import { xendit } from '@/lib/xendit';

export async function POST(request: NextRequest) {
  try {
    const { membershipType, userEmail, userName } = await request.json();

    if (!membershipType || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique external ID
    const externalId = `membership_${membershipType.id}_${Date.now()}`;

    // Create invoice with Xendit
    const invoice = await xendit.createInvoice({
      externalId,
      amount: membershipType.price,
      description: `${membershipType.name} Membership - ${membershipType.duration_days} days`,
      payerEmail: userEmail,
      customer: {
        givenNames: userName || userEmail.split('@')[0],
        email: userEmail,
      },
      items: [
        {
          name: `${membershipType.name} Membership`,
          quantity: 1,
          price: membershipType.price,
          category: 'membership',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      invoiceUrl: invoice.invoice_url,
      invoiceId: invoice.id,
      externalId,
    });
  } catch (error) {
    console.error('Error creating payment invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create payment invoice' },
      { status: 500 }
    );
  }
}
