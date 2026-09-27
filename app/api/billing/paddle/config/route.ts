import { NextResponse } from 'next/server';
import { getPaddleClientToken, getPaddleEnvironment, getPaddlePriceIds } from '@/lib/billing/paddle';

export async function GET() {
  const environment = getPaddleEnvironment();
  const clientToken = getPaddleClientToken();
  const priceIds = getPaddlePriceIds();
  const missingPrices = Object.entries(priceIds)
    .filter(([, priceId]) => !priceId)
    .map(([tier]) => tier);

  if (!clientToken || missingPrices.length > 0) {
    return NextResponse.json(
      {
        error: `Paddle ${environment} checkout is not fully configured.`,
        missing: [...(!clientToken ? ['client token'] : []), ...missingPrices.map((tier) => `${tier} price ID`)],
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    clientToken,
    environment,
    priceIds,
  });
}