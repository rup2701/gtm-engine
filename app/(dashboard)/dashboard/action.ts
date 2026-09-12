// app/(dashboard)/dashboard/actions.ts
'use server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function updateProduct(productId: string, patch: Record<string, any>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await db
    .update(products)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(products.id, productId));

  revalidatePath('/dashboard');
}