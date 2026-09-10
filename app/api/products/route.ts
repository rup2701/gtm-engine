// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { products, scrapedContent } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized: organization missing from session' }, { status: 401 });
    }

    const body = await req.json();
    const {
      brandName, description, icp, tone, categories,
      frequency, times, channels, autoPublish = true, rawText,
    } = body;

    if (!brandName || !Array.isArray(times) || !Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'brandName, times, and channels are required' },
        { status: 400 },
      );
    }

    const productId = crypto.randomUUID();

    await db.insert(products).values({
      id: productId,
      organizationId: session.user.organizationId!,
      name: brandName,
      description,
      icp,
      tone,
      categories: JSON.stringify(categories ?? []),
      frequencyMin: frequency,
      frequencyMax: frequency,
      publishTimes: times,
      platforms: channels,
      autoPublish,
    });

    if (rawText) {
      try {
        await db.insert(scrapedContent).values({
          productId,
          url: '',
          title: brandName,
          content: rawText,
        });
      } catch (error) {
        // Neon HTTP does not support transactions; remove the product if its scrape cannot be saved.
        await db.delete(products).where(eq(products.id, productId));
        throw error;
      }
    }

    return NextResponse.json({ success: true, productId });
  } catch (error) {
    console.error('Product save failed:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save product' },
      { status: 500 },
    );
  }
}