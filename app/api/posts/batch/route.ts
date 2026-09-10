import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { getCurrentUserId } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekKey, action } = await request.json();

    if (!weekKey || action !== 'queue-all') {
      return NextResponse.json(
        { error: 'weekKey and action=queue-all are required' },
        { status: 400 },
      );
    }

    const updatedPosts = await db.update(posts)
      .set({ status: 'queued', updatedAt: new Date() })
      .where(and(
        eq(posts.weekKey, weekKey),
        eq(posts.userId, userId),
        eq(posts.status, 'draft'),
      ))
      .returning({ id: posts.id });

    return NextResponse.json({
      success: true,
      queuedCount: updatedPosts.length,
    });
  } catch (error) {
    console.error('Failed to queue posts:', error);
    return NextResponse.json(
      { error: 'Failed to queue posts' },
      { status: 500 },
    );
  }
}
