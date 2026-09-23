// app/api/cron/metrics/route.ts
// Polls engagement metrics for recently published posts.
// Refreshes posts published in the last 14 days — engagement decays,
// so older posts don't need re-fetching.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, accounts } from '@/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { fetchLinkedInMetrics } from '@/lib/publishers/linkedin';
import { fetchTwitterMetrics } from '@/lib/publishers/twitter';
import { getValidTwitterAccessToken, TwitterRefreshPendingError } from '@/lib/auth/twitterToken';

export async function GET(request: NextRequest) {
  // Vercel cron protection
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const publishedPosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, since)));

  let updated = 0;
  let failed = 0;
  // Multiple posts for the same user shouldn't each trigger their own
  // refresh attempt within a single cron run.
  const twitterTokenCache = new Map<string, string>();

  for (const post of publishedPosts) {
    try {
      const platformData = (post.analytics ?? {}) as Record<string, unknown>;

      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.userId, post.userId), eq(accounts.provider, post.platform))
        )
        .limit(1);

      if (!account?.access_token) continue;

      if (post.platform === 'twitter' && platformData.tweetId) {
        let token = twitterTokenCache.get(post.userId);
        if (!token) {
          try {
            token = await getValidTwitterAccessToken(post.userId);
            twitterTokenCache.set(post.userId, token);
          } catch (tokenError) {
            if (tokenError instanceof TwitterRefreshPendingError) {
              console.log(`[metrics cron] Twitter refresh in progress for user ${post.userId}, will retry next run.`);
            } else {
              console.error(`[metrics cron] Twitter token unavailable for user ${post.userId}:`, tokenError);
            }
            failed++;
            continue;
          }
        }

        const metrics = await fetchTwitterMetrics(
          platformData.tweetId as string,
          token
        );
        if (!metrics) {
          failed++;
          continue;
        }

        const engagement =
          metrics.likes + metrics.retweets + metrics.replies + metrics.quotes;
        const engagementRate =
          metrics.impressions > 0 ? engagement / metrics.impressions : 0;

        await db
          .update(posts)
          .set({
            impressions: metrics.impressions,
            engagementRate,
            analytics: { ...platformData, metrics, metricsFetchedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(posts.id, post.id));
        updated++;
      } else if (post.platform === 'linkedin' && platformData.postId) {
        const metrics = await fetchLinkedInMetrics(
          platformData.postId as string,
          account.access_token
        );
        if (!metrics) {
          failed++;
          continue;
        }

        // Member-level: no impressions, use raw engagement count as rate proxy
        const engagementRate = metrics.likes + metrics.comments;

        await db
          .update(posts)
          .set({
            engagementRate,
            analytics: { ...platformData, metrics, metricsFetchedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(posts.id, post.id));
        updated++;
      }
    } catch (err) {
      console.error(`[metrics cron] failed for post ${post.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    scanned: publishedPosts.length,
    updated,
    failed,
  });
}
