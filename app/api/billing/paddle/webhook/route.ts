import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  PADDLE_PLANS,
  paddleDate,
  tierFromPriceId,
  verifyPaddleSignature,
} from '@/lib/billing/paddle';

type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string;
    price_id?: string;
    items?: Array<{ price?: { id?: string } }>;
    custom_data?: { organizationId?: string };
    current_billing_period?: { ends_at?: string } | null;
    trial_date?: { ends_at?: string } | null;
  };
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !verifyPaddleSignature(rawBody, request.headers.get('paddle-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const data = event.data;
  const subscriptionId = data?.id;
  if (!data || !subscriptionId) {
    return NextResponse.json({ received: true });
  }

  const itemPriceId = data.items?.[0]?.price?.id;
  const priceId = data.price_id ?? itemPriceId;
  const tier = tierFromPriceId(priceId);
  const organizationId = data.custom_data?.organizationId;
  const status = paddleStatus(event.event_type, data.status);

  if (!tier || !status) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const plan = PADDLE_PLANS[tier];
  const values = {
    tier,
    productLimit: plan.productLimit,
    ragLimit: plan.ragLimit,
    status,
    billingProvider: 'paddle',
    billingCustomerId: data.customer_id ?? null,
    billingSubscriptionId: subscriptionId,
    billingPriceId: priceId ?? null,
    trialEndsAt: paddleDate(data.trial_date?.ends_at),
    currentPeriodEnd: paddleDate(data.current_billing_period?.ends_at),
    canceledAt: status === 'canceled' ? new Date() : null,
    updatedAt: new Date(),
  };

  const updated = organizationId
    ? await db
        .update(subscriptions)
        .set(values)
        .where(eq(subscriptions.organizationId, organizationId))
        .returning({ id: subscriptions.id })
    : await db
        .update(subscriptions)
        .set(values)
        .where(eq(subscriptions.billingSubscriptionId, subscriptionId))
        .returning({ id: subscriptions.id });

  if (updated.length === 0 && organizationId) {
    await db.insert(subscriptions).values({ organizationId, ...values });
  }

  return NextResponse.json({ received: true });
}

function paddleStatus(
  eventType: string | undefined,
  dataStatus: string | undefined,
): 'trialing' | 'active' | 'canceled' | 'past_due' | null {
  if (dataStatus === 'trialing') return 'trialing';
  if (dataStatus === 'active') return 'active';
  if (dataStatus === 'past_due') return 'past_due';
  if (dataStatus === 'canceled') return 'canceled';
  if (!eventType) return null;
  if (eventType === 'subscription.trialing') return 'trialing';
  if (eventType === 'subscription.created' || eventType === 'subscription.updated') return 'active';
  if (eventType === 'subscription.past_due') return 'past_due';
  if (eventType === 'subscription.canceled') return 'canceled';
  return null;
}