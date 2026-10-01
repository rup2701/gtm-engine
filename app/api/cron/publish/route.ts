// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, accounts, products, users } from '@/db/schema';
import { eq, and, lte, isNull, isNotNull, ne, gte, exists, sql } from 'drizzle-orm';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { TwitterReauthRequiredError, TwitterRefreshPendingError } from '@/lib/auth/twitterToken';
import { getOrganizationSocialAccount, getOrganizationTwitterAccessToken } from '@/lib/social-connections';
import { subMinutes } from 'date-fns';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const pendingPosts = await db.select({ post: posts, organizationId: products.organizationId })
    .from(posts)
    .innerJoin(products, eq(posts.productId, products.id))
    .where(
      and(
        eq(products.autoPublish, true),
        eq(posts.status, 'queued'),
        lte(posts.scheduledAt, now),
        gte(posts.scheduledAt, subMinutes(now, 20)),
        isNull(posts.publishedAt),
        ne(posts.platform, 'reddit'),
        exists(
          db.select({ connected: sql`1` })
            .from(accounts)
            .innerJoin(users, eq(accounts.userId, users.id))
            .where(and(
              eq(users.organizationId, products.organizationId),
              eq(accounts.provider, posts.platform),
              isNotNull(accounts.access_token),
              ne(accounts.access_token, ''),
            )),
        ),
      )
    )
    .limit(25);

  // 2. Cache LinkedIn accounts per organization within this run.
  const linkedinAccountCache = new Map<string, typeof accounts.$inferSelect | null>();
  async function getLinkedInAccount(organizationId: string) {
    if (linkedinAccountCache.has(organizationId)) return linkedinAccountCache.get(organizationId)!;
    const account = await getOrganizationSocialAccount(organizationId, 'linkedin');
    linkedinAccountCache.set(organizationId, account);
    return account ?? null;
  }

  const results = [];
  for (const { post, organizationId } of pendingPosts) {
    const userId = post.userId; // ← from the post row now, not the env var

    if (post.platform === 'linkedin') {
      const linkedinAccount = await getLinkedInAccount(organizationId);
      if (!linkedinAccount?.access_token) {
        console.log(`[cron publish] LinkedIn is not connected for post ${post.id}; leaving it queued.`);
        results.push({ id: post.id, userId, success: false, error: 'LinkedIn is not connected', retryable: true });
        continue;
      }
    }

    // claim it atomically first (fixes the overlapping-tick race too)
    const [claimed] = await db.update(posts)
      .set({ status: 'publishing' })
      .where(and(eq(posts.id, post.id), eq(posts.status, 'queued')))
      .returning();
    if (!claimed) continue;

    try {
      const content = post.editedContent || post.content;

      switch (post.platform) {
        case 'twitter': {
          const accessToken = await getOrganizationTwitterAccessToken(organizationId);
          await publishToTwitter(content, accessToken);
          break;
        }
        case 'linkedin': {
          const linkedinAccount = await getLinkedInAccount(organizationId);
          if (!linkedinAccount?.access_token) {
            throw new Error('LinkedIn is not configured');
          }
          const result = await publishToLinkedIn(
            content,
            linkedinAccount.access_token,
            linkedinAccount.providerAccountId || undefined,
          );
          if (!linkedinAccount.providerAccountId && result.analytics?.linkedinPersonId) {
            await db.update(accounts)
              .set({ providerAccountId: result.analytics.linkedinPersonId })
              .where(and(eq(accounts.userId, linkedinAccount.userId), eq(accounts.provider, 'linkedin')));
            linkedinAccountCache.set(organizationId, {
              ...linkedinAccount,
              providerAccountId: result.analytics.linkedinPersonId,
            });
          }
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      await db.update(posts)
        .set({ status: 'published', publishedAt: now })
        .where(eq(posts.id, post.id));

      results.push({ id: post.id, userId, success: true });
    } catch (error) {
      if (error instanceof TwitterRefreshPendingError) {
        await db.update(posts).set({ status: 'queued' }).where(eq(posts.id, post.id));
        console.log(`[cron publish] Twitter refresh pending for post ${post.id}, will retry next run.`);
        results.push({ id: post.id, userId, success: false, error: error.message, retryable: true });
        continue;
      }

      const message = error instanceof TwitterReauthRequiredError ? error.message : String(error);

      await db.update(posts)
        .set({ status: 'failed' })
        .where(eq(posts.id, post.id));
      results.push({ id: post.id, userId, success: false, error: message });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}

