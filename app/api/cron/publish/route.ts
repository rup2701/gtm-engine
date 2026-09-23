// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, accounts } from '@/db/schema';
import { eq, and, lte, isNull, ne } from 'drizzle-orm';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { getValidTwitterAccessToken, TwitterReauthRequiredError, TwitterRefreshPendingError } from '@/lib/auth/twitterToken';

// NOTE: scoped to a single CRON_USER_ID (early-stage, not yet multi-tenant).
// The /api/publish route (manual "Fire Now") is the multi-tenant path today.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  const userId = process.env.CRON_USER_ID;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}` || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const [linkedinAccount] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'linkedin')))
    .limit(1);

  // 2. Find pending posts
  const pendingPosts = await db.select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'queued'),
        eq(posts.userId, userId),
        lte(posts.scheduledAt, now),
        isNull(posts.publishedAt),
        ne(posts.platform, 'reddit')
      )
    )
    .limit(5);

  // 3. Publish each
  const results = [];
  for (const post of pendingPosts) {
    try {
      const content = post.editedContent || post.content;

      switch (post.platform) {
        case 'twitter': {
          const accessToken = await getValidTwitterAccessToken(userId);
          await publishToTwitter(content, accessToken);
          break;
        }
        case 'linkedin': {
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
            linkedinAccount.providerAccountId = result.analytics.linkedinPersonId;
          }
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      await db.update(posts)
        .set({ status: 'published', publishedAt: now })
        .where(and(eq(posts.id, post.id), eq(posts.userId, userId)));

      results.push({ id: post.id, success: true });
    } catch (error) {
      if (error instanceof TwitterRefreshPendingError) {
        // Transient — another caller is mid-refresh. Leave the post queued
        // so the next cron run (or a manual retry) picks it up cleanly.
        console.log(`[cron publish] Twitter refresh pending for post ${post.id}, will retry next run.`);
        results.push({ id: post.id, success: false, error: error.message, retryable: true });
        continue;
      }

      const message = error instanceof TwitterReauthRequiredError
        ? error.message
        : String(error);

      await db.update(posts)
        .set({ status: 'failed' })
        .where(and(eq(posts.id, post.id), eq(posts.userId, userId)));
      results.push({ id: post.id, success: false, error: message });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}

