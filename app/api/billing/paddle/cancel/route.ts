import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentOrgId } from '@/lib/auth';

export async function POST() {
  const organizationId = await getCurrentOrgId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  if (!subscription?.billingSubscriptionId) {
    return NextResponse.json({ error: 'No Paddle subscription found.' }, { status: 400 });
  }

  const apiKey = process.env.PADDLE_SANDBOX_API_KEY ?? process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Paddle API is not configured.' }, { status: 500 });
  }

  const apiBase = process.env.PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
  const response = await fetch(`${apiBase}/subscriptions/${subscription.billingSubscriptionId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheduled_change: { action: 'cancel', effective_at: 'next_billing_period' },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Paddle could not schedule cancellation.' }, { status: response.status });
  }
  return NextResponse.json({ success: true });
}