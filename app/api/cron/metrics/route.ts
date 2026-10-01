// app/api/cron/metrics/route.ts
// Polls engagement metrics for recently published posts.
// Refreshes posts published in the last 14 days — engagement decays,
// so older posts don't need re-fetching.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, products } from '@/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { fetchLinkedInMetrics } from '@/lib/publishers/linkedin';
import { fetchTwitterMetrics } from '@/lib/publishers/twitter';
import { TwitterRefreshPendingError } from '@/lib/auth/twitterToken';
import { getOrganizationSocialAccount, getOrganizationTwitterAccessToken } from '@/lib/social-connections';

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
    .select({ post: posts, organizationId: products.organizationId })
    .from(posts)
    .innerJoin(products, eq(posts.productId, products.id))
    .where(and(eq(posts.status, 'published'), gte(posts.publishedAt, since)));

  let updated = 0;
  let failed = 0;
  // Multiple posts for the same user shouldn't each trigger their own
  // refresh attempt within a single cron run.
  const twitterTokenCache = new Map<string, string>();

  for (const { post, organizationId } of publishedPosts) {
    try {
      const platformData = (post.analytics ?? {}) as Record<string, unknown>;

      if (post.platform === 'twitter' && platformData.tweetId) {
        let token = twitterTokenCache.get(organizationId);
        if (!token) {
          try {
            token = await getOrganizationTwitterAccessToken(organizationId);
            twitterTokenCache.set(organizationId, token);
          } catch (tokenError) {
            if (tokenError instanceof TwitterRefreshPendingError) {
              console.log(`[metrics cron] Twitter refresh in progress for organization ${organizationId}, will retry next run.`);
            } else {
              console.error(`[metrics cron] Twitter token unavailable for organization ${organizationId}:`, tokenError);
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
        const linkedinAccount = await getOrganizationSocialAccount(organizationId, 'linkedin');
        if (!linkedinAccount?.access_token) continue;

        const metrics = await fetchLinkedInMetrics(
          platformData.postId as string,
          linkedinAccount.access_token
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
