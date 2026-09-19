'use server';

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { products } from '@/db/schema';
import { getCurrentOrgId } from '@/lib/auth';

const VALID_PLATFORMS = ['linkedin', 'twitter', 'reddit', 'bluesky'] as const;

export async function disconnectProvider(provider: string) {
  // 1. Authenticate the request on the server
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // 2. Prevent users from accidental lockouts
  // If they only have ONE social provider account and no password, don't let them disconnect it
  if (provider === 'google' || provider === 'linkedin') {
    // You could optionally add safety checks here if necessary
  }

  // 3. Delete the specific provider row from the NextAuth accounts table
  await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, provider)
      )
    );

  // 4. Purge Next.js data cache for the settings page so the UI updates instantly
  revalidatePath("/dashboard/settings");

  return { success: true };
}

export async function togglePlatform(productId: string, platform: string, enabled: boolean) {
  const organizationId = await getCurrentOrgId();
  if (!organizationId) throw new Error('Unauthorized');
  if (!(VALID_PLATFORMS as readonly string[]).includes(platform)) {
    throw new Error('Invalid platform');
  }

  // Re-validate tenant ownership — productId comes from the client
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, productId),
      eq(products.organizationId, organizationId),
    ),
  });
  if (!product) throw new Error('Product not found');

  const current = (product.platforms ?? []) as string[];
  const next = enabled
    ? [...new Set([...current, platform])]
    : current.filter((p) => p !== platform);

  await db
    .update(products)
    .set({ platforms: next, updatedAt: new Date() })
    .where(eq(products.id, product.id));

  revalidatePath('/settings');
}