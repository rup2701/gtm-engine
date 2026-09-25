// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, accounts } from '@/db/schema';
import { eq, and, lte, isNull, ne, gte } from 'drizzle-orm';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { getValidTwitterAccessToken, TwitterReauthRequiredError, TwitterRefreshPendingError } from '@/lib/auth/twitterToken';
import { subMinutes } from 'date-fns';

// NOTE: scoped to a single CRON_USER_ID (early-stage, not yet multi-tenant).
// The /api/publish route (manual "Fire Now") is the multi-tenant path today.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const pendingPosts = await db.select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'queued'),
        lte(posts.scheduledAt, now),
        gte(posts.scheduledAt, subMinutes(now, 20)),
        isNull(posts.publishedAt),
        ne(posts.platform, 'reddit'),
      )
    )
    .limit(25);

  // 2. Cache LinkedIn accounts per user within this run (avoid refetching per post)
  const linkedinAccountCache = new Map<string, typeof accounts.$inferSelect | null>();
  async function getLinkedInAccount(userId: string) {
    if (linkedinAccountCache.has(userId)) return linkedinAccountCache.get(userId)!;
    const [account] = await db.select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'linkedin')))
      .limit(1);
    linkedinAccountCache.set(userId, account ?? null);
    return account ?? null;
  }

  const results = [];
  for (const post of pendingPosts) {
    const userId = post.userId; // ← from the post row now, not the env var

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
          const accessToken = await getValidTwitterAccessToken(userId);
          await publishToTwitter(content, accessToken);
          break;
        }
        case 'linkedin': {
          const linkedinAccount = await getLinkedInAccount(userId);
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
              .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'linkedin')));
            linkedinAccountCache.set(userId, {
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

