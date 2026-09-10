import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, organizations, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

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

    // 3. Create free subscription
    await db.insert(subscriptions).values({
      organizationId: orgId,
      tier: 'starter',
      productLimit: 1,
      ragLimit: 1,
      status: 'active',
    });

    return NextResponse.json({ success: true, userId, orgId });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}