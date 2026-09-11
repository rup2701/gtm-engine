// app/page.tsx
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import ProductAddModalGate from '@/app/components/ProductAddModalGate';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ addProduct?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  if (params.addProduct === 'true') {
    return <ProductAddModalGate open={true} />;
  }

  const userProducts = await db
    .select()
    .from(products)
    .where(eq(products.organizationId, session.user.organizationId!))
    .limit(1);

  if (userProducts.length === 0) {
    redirect('/dashboard/?addProduct=true');
  }

  redirect('/dashboard');
}