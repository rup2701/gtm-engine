// app/api/analytics/route.ts
// Read-only aggregation for the analytics page.
// Section 1: content pillar efficiency (category × posts × avg engagement)
// Section 2: channel health & throughput (platform × status rollup)
// Section 3 (v1): high-signal posts (top engagement, published, last 30d)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { and, eq, gte, desc } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { isValidUuid } from '@/lib/utils/uuid';

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }
  if (!isValidUuid(productId)) {
    return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
  }

  const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const allPosts = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.productId, productId),
        gte(posts.createdAt, since)
      )
    );

  // ── Section 1: pillar efficiency (published posts only) ──
  const published = allPosts.filter((p) => p.status === 'published');
  const byCategory = new Map<string, { posts: number; totalEngagement: number }>();
  for (const p of published) {
    const entry = byCategory.get(p.category) ?? { posts: 0, totalEngagement: 0 };
    entry.posts++;
    entry.totalEngagement += p.engagementRate ?? 0;
    byCategory.set(p.category, entry);
  }

  const pillarRows = [...byCategory.entries()].map(([category, v]) => ({
    category,
    posts: v.posts,
    avgEngagement: v.posts > 0 ? v.totalEngagement / v.posts : 0,
  }));
  const maxAvg = Math.max(...pillarRows.map((r) => r.avgEngagement), 0);
  const pillars = pillarRows
    .map((r) => ({
      ...r,
      // normalize 0–1 for signal bars; rating thresholds on normalized value
      normalized: maxAvg > 0 ? r.avgEngagement / maxAvg : 0,
      rating:
        maxAvg === 0
          ? 'none'
          : r.avgEngagement / maxAvg >= 0.7
            ? 'high'
            : r.avgEngagement / maxAvg >= 0.4
              ? 'med'
              : 'low',
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // ── Section 2: channel health & throughput ──
  const byPlatform = new Map<string, typeof allPosts>();
  for (const p of allPosts) {
    const list = byPlatform.get(p.platform) ?? [];
    list.push(p);
    byPlatform.set(p.platform, list);
  }
  const channels = [...byPlatform.entries()].map(([platform, list]) => {
    const pub = list.filter((p) => p.status === 'published');
    return {
      platform,
      published: pub.length,
      staged: list.filter((p) => p.status === 'draft' || p.status === 'queued').length,
      held: list.filter((p) => p.status === 'hold').length,
      failed: list.filter((p) => p.status === 'failed').length,
      impressions: pub.reduce((sum, p) => sum + (p.impressions ?? 0), 0),
    };
  });

  // ── Section 3 (v1): high-signal posts ──
  const highSignal = published
    .filter((p) => (p.engagementRate ?? 0) > 0)
    .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      category: p.category,
      excerpt: (p.editedContent ?? p.content).slice(0, 120),
      engagementRate: p.engagementRate,
      impressions: p.impressions,
      publishedAt: p.publishedAt,
    }));

  return NextResponse.json({
    success: true,
    window: { days, since: since.toISOString() },
    totals: {
      posts: allPosts.length,
      published: published.length,
      impressions: published.reduce((sum, p) => sum + (p.impressions ?? 0), 0),
    },
    pillars,
    channels,
    highSignal,
  });
}
