import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentOrgId } from '@/lib/auth';
import { getPaddleApiBaseUrl, getPaddleApiKey } from '@/lib/billing/paddle';

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

  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'Paddle API key is not configured for this environment.' }, { status: 503 });
  }

  const response = await fetch(`${getPaddleApiBaseUrl()}/subscriptions/${subscription.billingSubscriptionId}`, {
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