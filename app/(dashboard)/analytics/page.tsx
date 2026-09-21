// app/(dashboard)/analytics/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import AnalyticsClient from './analytics-client';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect('/login');

  const params = await searchParams;
  const userProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.organizationId, session.user.organizationId));

  const active =
    userProducts.find((p) => p.id === params.productId) ?? userProducts[0];

  if (!active) {
    redirect('/dashboard?addProduct=true');
  }

  return <AnalyticsClient productId={active.id} productName={active.name} />;
}
