// POST /api/early-access/claim
// Redeems the EARLY20 promo: first 20 organizations get 90 days on the
// Starter plan with no Paddle checkout. Slot claiming is a single atomic
// UPDATE ... WHERE claimed < limit_count, so concurrent claims can never
// oversell the cap — the same compare-and-swap principle used to fix the
// Twitter token refresh race.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions, earlyAccessCounter, earlyAccessClaims, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId, getCurrentOrgId } from '@/lib/auth';
import { PADDLE_PLANS } from '@/lib/billing/paddle';
import { notifyFounder } from '@/lib/email';

const EARLY_ACCESS_CODE = 'EARLY20';
const EARLY_ACCESS_DAYS = 90;

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const organizationId = await getCurrentOrgId();
  if (!userId || !organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await request.json().catch(() => ({ code: '' }));
  if (String(code ?? '').trim().toUpperCase() !== EARLY_ACCESS_CODE) {
    return NextResponse.json({ error: 'Invalid early access code.' }, { status: 400 });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  if (subscription?.status === 'early_access') {
    // Idempotent: already claimed, nothing to do.
    return NextResponse.json({ success: true, earlyAccessEndsAt: subscription.earlyAccessEndsAt });
  }
  if (subscription && subscription.status !== 'pending') {
    return NextResponse.json(
      { error: 'This workspace already has an active plan.' },
      { status: 400 }
    );
  }

  const [existingClaim] = await db
    .select()
    .from(earlyAccessClaims)
    .where(eq(earlyAccessClaims.organizationId, organizationId))
    .limit(1);

  if (!existingClaim) {
    // Atomic claim: only succeeds while claimed < limit_count.
    const claimed = await db
      .update(earlyAccessCounter)
      .set({ claimed: sql`${earlyAccessCounter.claimed} + 1` })
      .where(sql`${earlyAccessCounter.id} = 1 AND ${earlyAccessCounter.claimed} < ${earlyAccessCounter.limitCount}`)
      .returning({ claimed: earlyAccessCounter.claimed, limitCount: earlyAccessCounter.limitCount });

    if (claimed.length === 0) {
      return NextResponse.json({ error: 'Early access is full.', full: true }, { status: 409 });
    }

    const inserted = await db
      .insert(earlyAccessClaims)
      .values({ organizationId })
      .onConflictDoNothing({ target: earlyAccessClaims.organizationId })
      .returning({ id: earlyAccessClaims.id });

    if (inserted.length === 0) {
      // A concurrent duplicate request for the SAME org already claimed —
      // undo our extra increment so the counter still reflects unique orgs.
      await db
        .update(earlyAccessCounter)
        .set({ claimed: sql`${earlyAccessCounter.claimed} - 1` })
        .where(eq(earlyAccessCounter.id, 1));
    }
  }

  const plan = PADDLE_PLANS.starter;
  const earlyAccessEndsAt = new Date(Date.now() + EARLY_ACCESS_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      tier: 'starter',
      productLimit: plan.productLimit,
      ragLimit: plan.ragLimit,
      status: 'early_access',
      earlyAccessEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.organizationId, organizationId));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [{ claimed: slotsClaimed, limitCount }] = await db
    .select({ claimed: earlyAccessCounter.claimed, limitCount: earlyAccessCounter.limitCount })
    .from(earlyAccessCounter)
    .where(eq(earlyAccessCounter.id, 1));

  await notifyFounder(
    `🎉 EARLY20 claimed (${slotsClaimed}/${limitCount}): ${user?.email ?? userId}`,
    `<p>${user?.email ?? userId} claimed EARLY20 — 90 days free on Starter.</p><p>Slots claimed: ${slotsClaimed}/${limitCount}</p>`
  );

  return NextResponse.json({ success: true, earlyAccessEndsAt });
}
