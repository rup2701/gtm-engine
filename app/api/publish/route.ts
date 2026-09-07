// app/api/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MY_USER_ID } from '@/lib/constants';
import { publishToLinkedIn,  } from '@/lib/publishers/linkedin';
import { publishToTwitter } from '@/lib/publishers/twitter';

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    // 1. Get the post
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 2. Get user settings (tokens)
    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, MY_USER_ID));

    if (!settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 500 });
    }

    // 3. Get the content (use edited version if available)
    const content = post.editedContent || post.content;

    // 4. Publish to the right platform
    let result;
    const platform = post.platform.toLowerCase();
    console.log(`Publishing post ${postId} to ${platform}...`);
    switch (post.platform) {
      case 'twitter':
        if (!settings.twitterAccessToken) {
          throw new Error('Twitter token not configured');
        }
        result = await publishToTwitter(content, settings.twitterAccessToken);
        break;

      case 'linkedin':
        if (!settings.linkedinAccessToken) {
          throw new Error('LinkedIn token not configured');
        }
        result = await publishToLinkedIn(
          content,
          settings.linkedinAccessToken,
          settings.linkedinPersonId || undefined,
        );
        if (!settings.linkedinPersonId && result.analytics?.linkedinPersonId) {
          await db.update(userSettings)
            .set({ linkedinPersonId: result.analytics.linkedinPersonId })
            .where(eq(userSettings.userId, MY_USER_ID));
        }
        console.log('LinkedIn publish result:', result);
        break;

      case 'reddit':
        // throw new Error('Reddit publishing not implemented yet');

      default:
        throw new Error(`Unknown platform: ${post.platform}`);
    }

    // 5. Update post status
    await db.update(posts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        // analytics: result.analytics || {},
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    return NextResponse.json({
      success: true,
      postId: post.id,
      platform: post.platform,
      // url: result.url,
    });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish' },
      { status: 500 }
    );
  }
}