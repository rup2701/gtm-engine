// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('productId');
  const weekKey = searchParams.get('weekKey'); // "2026-W36"
  const batchId = searchParams.get('batchId');

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  if (!weekKey && !batchId) {
    return NextResponse.json(
      { error: 'weekKey or batchId required' },
      { status: 400 }
    );
  }

  try {
    const whereClause = batchId
      ? and(eq(posts.productId, productId), eq(posts.batchId, batchId))
      : and(eq(posts.productId, productId), eq(posts.weekKey, weekKey as string));

    const results = await db.query.posts.findMany({
      where: whereClause,
      orderBy: (posts, { asc }) => [asc(posts.dayOfWeek), asc(posts.scheduledAt)],
    });

    // Group by day for calendar view
    const groupedByDay = results.reduce((acc, post) => {
      const day = post.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(post);
      return acc;
    }, {} as Record<string, typeof results>);

    return NextResponse.json({
      success: true,
      posts: results,
      groupedByDay,
      total: results.length,
      stats: {
        queued: results.filter(p => p.status === 'queued').length,
        hold: results.filter(p => p.status === 'hold').length,
        dropped: results.filter(p => p.status === 'dropped').length,
        published: results.filter(p => p.status === 'published').length,
        draft: results.filter(p => p.status === 'draft').length,
      }
    });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}