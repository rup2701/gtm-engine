// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, userSettings } from '@/db/schema';
import { eq, and, lte, isNull, ne } from 'drizzle-orm';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { publishToReddit } from '@/lib/publishers/reddit';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  const userId = process.env.CRON_USER_ID;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}` || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  
  // 1. Get your settings (tokens)
  const [settings] = await db.select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!settings) {
    return NextResponse.json({ error: 'No settings found' }, { status: 500 });
  }

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
        case 'twitter':
          if (!settings.twitterBearerToken) {
            throw new Error('Twitter is not configured');
          }
          await publishToTwitter(content, settings.twitterBearerToken);
          break;
        case 'linkedin':
          if (!settings.linkedinAccessToken) {
            throw new Error('LinkedIn is not configured');
          }
          const result = await publishToLinkedIn(
            content,
            settings.linkedinAccessToken,
            settings.linkedinPersonId || undefined,
          );
          if (!settings.linkedinPersonId && result.analytics?.linkedinPersonId) {
            await db.update(userSettings)
              .set({ linkedinPersonId: result.analytics.linkedinPersonId })
              .where(eq(userSettings.userId, userId));
            settings.linkedinPersonId = result.analytics.linkedinPersonId;
          }
          break;
        case 'reddit':
          if (!settings.redditAccessToken || !settings.redditSubreddits?.length) {
            throw new Error('Reddit is not configured');
          }
          await publishToReddit(content, {
            accessToken: settings.redditAccessToken,
            subreddit: settings.redditSubreddits[0],
            userAgent: process.env.REDDIT_USER_AGENT,
          });
          break;
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }

      await db.update(posts)
        .set({ status: 'published', publishedAt: now })
        .where(and(eq(posts.id, post.id), eq(posts.userId, userId)));

      results.push({ id: post.id, success: true });
    } catch (error) {
      await db.update(posts)
        .set({ status: 'failed' })
        .where(and(eq(posts.id, post.id), eq(posts.userId, userId)));
      results.push({ id: post.id, success: false, error: String(error) });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}

