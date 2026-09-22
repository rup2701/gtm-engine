import { NextResponse } from 'next/server';

export async function GET() {
  const clientToken = process.env.PADDLE_CLIENT_TOKEN;
  if (!clientToken) {
    return NextResponse.json({ error: 'Paddle checkout is not configured.' }, { status: 503 });
  }

  return NextResponse.json({
    clientToken,
    environment: process.env.PADDLE_ENV === 'production' ? 'production' : 'sandbox',
    priceIds: {
      starter: process.env.PADDLE_STARTER_PRICE_ID,
      pro: process.env.PADDLE_PRO_PRICE_ID,
      agency: process.env.PADDLE_AGENCY_PRICE_ID,
    },
  });
}