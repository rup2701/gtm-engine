// app/api/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, userSettings, accounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { publishToLinkedIn } from '@/lib/publishers/linkedin';
import { publishToTwitter } from '@/lib/publishers/twitter';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    // 1. Get the post
    const [post] = await db.select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 2. Get user settings (tokens)
    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    
    
    if (!settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 500 });
    }

    // 3. Get the content (use edited version if available)
    const content = post.editedContent || post.content;

    // 4. Publish to the right platform
    let result;
    
    switch (post.platform) {
      case 'twitter':
        if (!settings.twitterAccessToken) {
          throw new Error('Twitter token not configured');
        }
        result = await publishToTwitter(content, settings.twitterAccessToken);
        break;
      case 'linkedin': { // Added block scope curly braces to safely contain block-scoped variables
        const [linkedinAccount] = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.userId, userId),
              eq(accounts.provider, "linkedin")
            )
          )
          .limit(1);

        if (!linkedinAccount || !linkedinAccount.access_token) {
          throw new Error('LinkedIn token not configured');
        }

        // Publish content using the token and the stored LinkedIn URN/Person ID
        result = await publishToLinkedIn(
          content,
          linkedinAccount.access_token,
          linkedinAccount.providerAccountId || undefined,
        );

        // Fallback: If for some reason providerAccountId was missing, update the ACCOUNTS table, not userSettings
        if (!linkedinAccount.providerAccountId &&
            result?.analytics?.linkedinPersonId) {
          await db
            .update(accounts)
            .set({ providerAccountId: result.analytics.linkedinPersonId })
            .where(
              and(
                eq(accounts.userId, userId),
                eq(accounts.provider, "linkedin")
              )
            );
        }

        // console.log('LinkedIn publish result:', result);
        break;
      }
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
        // updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    return NextResponse.json({
      success: true,
      postId: post.id,
      platform: post.platform,
      url: result.url,
    });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish' },
      { status: 500 }
    );
  }
}