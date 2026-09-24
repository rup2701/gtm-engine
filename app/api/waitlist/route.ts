// POST /api/waitlist
// Captures interest when EARLY20 is full. No forced product-wide gate —
// paying customers can still proceed straight to Paddle checkout; this is
// only for people who specifically wanted the free EARLY20 slot.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { waitlist, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId, getCurrentOrgId } from '@/lib/auth';
import { notifyFounder, sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  const organizationId = await getCurrentOrgId();
  if (!userId || !organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestedTier } = await request.json().catch(() => ({ requestedTier: null }));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) {
    return NextResponse.json({ error: 'No email on file for this account.' }, { status: 400 });
  }

  await db.insert(waitlist).values({
    organizationId,
    email: user.email,
    requestedTier: requestedTier ?? null,
  });

  await notifyFounder(
    `📝 New EARLY20 waitlist signup: ${user.email}`,
    `<p>${user.email} joined the EARLY20 waitlist (requested tier: ${requestedTier ?? 'unspecified'}).</p>`
  );

  await sendEmail(
    user.email,
    "You're on the DispatchOS early access waitlist",
    `<p>Thanks for your interest in DispatchOS! EARLY20 is full right now, but we've added you to the waitlist and will reach out if a free spot opens up.</p><p>You can also start a paid plan any time from your dashboard.</p>`
  );

  return NextResponse.json({ success: true });
}
