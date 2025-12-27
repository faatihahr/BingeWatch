import { NextRequest, NextResponse } from 'next/server';
import { xendit } from '@/lib/xendit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('E-wallet charge API received body:', body);
    const { membershipType, userEmail, userName, ewalletType, phone, movie } = body;

    console.log('Parsed data:', { membershipType, userEmail, userName, ewalletType, phone, movie });

    // Handle both membership and movie purchases
    let itemData, amount, description, externalId;
    
    if (membershipType) {
      // Membership purchase
      itemData = {
        name: membershipType.name,
        quantity: 1,
        price: membershipType.price,
        category: 'membership',
      };
      amount = membershipType.price;
      description = membershipType.description || `${membershipType.name} - ${membershipType.duration_days} days`;
      externalId = `${membershipType.id}_${ewalletType}_${Date.now()}`;
    } else if (movie) {
      // Movie purchase
      itemData = {
        name: movie.title,
        quantity: 1,
        price: movie.price,
        category: 'movie',
      };
      amount = movie.price;
      description = `Purchase movie: ${movie.title}`;
      externalId = `movie-${movie.id}_${ewalletType}_${Date.now()}`;
    } else {
      console.log('❌ Missing membershipType or movie data');
      return NextResponse.json(
        { error: 'Missing membershipType or movie data' },
        { status: 400 }
      );
    }

    if (!userEmail || !ewalletType) {
      console.log('❌ Missing required fields:', { userEmail, ewalletType });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create invoice using Xendit (this will show all payment options including e-wallets)
    const invoice = await xendit.createInvoice({
      externalId,
      amount,
      description,
      payerEmail: userEmail,
      customer: {
        givenNames: userName || userEmail.split('@')[0],
        email: userEmail,
        mobileNumber: phone || undefined,
      },
      items: [itemData],
    });

    console.log('Created invoice:', invoice);
    console.log('Invoice URL:', (invoice as any)?.invoice_url);

    return NextResponse.json({
      success: true,
      invoiceUrl: (invoice as any)?.invoice_url || (invoice as any)?.invoiceUrl,
      invoiceId: invoice.id,
      externalId,
      ewalletType,
    });
  } catch (error) {
    console.error('Error creating e-wallet invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create e-wallet invoice' },
      { status: 500 }
    );
  }
}
