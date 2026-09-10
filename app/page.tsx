// app/page.tsx
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user has any products
  const userProducts = await db
    .select()
    .from(products)
    .where(eq(products.organizationId, session.user.organizationId!))
    .limit(1);

  // if (userProducts.length === 0) {
  //   redirect('/dashboard/?addProduct=true');
  // }

  redirect('/generate');
}