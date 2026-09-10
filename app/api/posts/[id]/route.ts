// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;
    const { status, editedContent, scheduledAt } = body;

    const updateData: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (editedContent !== undefined) updateData.editedContent = editedContent;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

    const [updated] = await db.update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      post: updated
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}