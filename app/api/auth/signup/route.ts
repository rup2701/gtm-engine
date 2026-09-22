import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, organizations, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PADDLE_PLANS, type PaddleTier } from '@/lib/billing/paddle';

export async function POST(req: Request) {
  try {
    const { email, password, name, tier = 'starter' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!Object.hasOwn(PADDLE_PLANS, tier)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const selectedTier = tier as PaddleTier;
    const plan = PADDLE_PLANS[selectedTier];

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create organization
    const orgId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: orgId,
      name: name || email.split('@')[0],
      slug: email.split('@')[0] + '-' + Date.now(),
    });

    // 2. Create user
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      name: name || null,
      organizationId: orgId,
    });

    // 3. Hold the selected plan until the authenticated dashboard opens checkout.
    await db.insert(subscriptions).values({
      organizationId: orgId,
      tier: selectedTier,
      productLimit: plan.productLimit,
      ragLimit: plan.ragLimit,
      status: 'pending',
      billingProvider: 'paddle',
    });

    return NextResponse.json({ success: true, userId, orgId, tier: selectedTier });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}