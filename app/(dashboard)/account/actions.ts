'use server';

import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId, getCurrentOrgId } from '@/lib/auth';

export async function updateProfileName(name: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Unauthorized');

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new Error('Invalid name');

  await db.update(users).set({ name: trimmed }).where(eq(users.id, userId));
  revalidatePath('/account');
}

export async function updateOrgName(name: string) {
  const organizationId = await getCurrentOrgId();
  if (!organizationId) throw new Error('Unauthorized');

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new Error('Invalid name');

  await db
    .update(organizations)
    .set({ name: trimmed })
    .where(eq(organizations.id, organizationId));

  revalidatePath('/account');
}