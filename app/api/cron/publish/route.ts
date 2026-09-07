// app/api/cron/publish/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, userSettings } from '@/db/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
import { MY_USER_ID } from '@/lib/constants';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { publishToReddit } from '@/lib/publishers/reddit';

export async function POST() {
  const now = new Date();
  
  // 1. Get your settings (tokens)
  const [settings] = await db.select()
    .from(userSettings)
    .where(eq(userSettings.userId, MY_USER_ID));

  if (!settings) {
    return NextResponse.json({ error: 'No settings found' }, { status: 500 });
  }

  // 2. Find pending posts
  const pendingPosts = await db.select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'queued'),
        lte(posts.scheduledAt, now),
        isNull(posts.publishedAt)
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
          await publishToLinkedIn(content, settings.linkedinAccessToken);
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
        .where(eq(posts.id, post.id));

      results.push({ id: post.id, success: true });
    } catch (error) {
      await db.update(posts)
        .set({ status: 'failed' })
        .where(eq(posts.id, post.id));
      results.push({ id: post.id, success: false, error: String(error) });
    }
  }

  return NextResponse.json({ results });
}

