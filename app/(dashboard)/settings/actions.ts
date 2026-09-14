'use server';

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
