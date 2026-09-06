// app/api/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { posts } from '@/db/schema';

export async function POST(request: NextRequest) {
  const { postId } = await request.json();

  // Find post
  const [post] = await db.query.posts.findMany({
    where: eq(posts.id, postId),
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Publish immediately
  const content = post.editedContent || post.content;
  const result = await publishToTwitter(content, process.env.TWITTER_API_KEY!);

  // Update DB
  await db.update(posts)
    .set({
      status: 'published',
      publishedAt: new Date(),
      analytics: result.analytics || {},
    })
    .where(eq(posts.id, postId));

  return NextResponse.json({ success: true, url: result.url });
}