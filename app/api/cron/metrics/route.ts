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
import refreshTwitterToken from '@/lib/utils/refreshTwitterToken';

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
        let token = account.access_token;
        const nowSec = Math.floor(Date.now() / 1000);
        const isExpired = account.expires_at
          ? nowSec >= account.expires_at - 120
          : true;

        if (isExpired && account.refresh_token) {
          try {
            const newTokens = await refreshTwitterToken(account.refresh_token);
            token = newTokens.access_token;
            await db
              .update(accounts)
              .set({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token ?? account.refresh_token,
                expires_at: nowSec + newTokens.expires_in,
              })
              .where(
                and(eq(accounts.userId, post.userId), eq(accounts.provider, 'twitter'))
              );
          } catch (refreshError) {
            // Dead refresh token — user must reconnect X. Skip this post
            // rather than failing the entire metrics run.
            console.error(`[metrics cron] Twitter refresh failed for user ${post.userId}:`, refreshError);
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
