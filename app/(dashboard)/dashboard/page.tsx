// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ProductAddModalGate from '@/app/components/ProductAddModalGate';
import ProductEditor from '@/app/components/ProductEditor';

export default async function ProductDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; addProduct?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const orgId = session!.user.organizationId!;

  const userProducts = await db
    .select()
    .from(products)
    .where(eq(products.organizationId, orgId));

  const active =
    userProducts.find((p) => p.id === params.productId) || userProducts[0];

  const showAddProduct = params.addProduct === 'true';

  if (!active && !showAddProduct) {
    notFound();
  }
  
  return (
    <>
      <div className="p-10 max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">{active.name}</h1>
        <p className="text-gray-500 mb-8">{active.description}</p>

        <p className="text-sm text-gray-600 font-medium mb-4">
          This is what DispatchOS knows about your business. Edits here shape every post. 
        </p>
        <ProductEditor product={active} />
      </div>
      {showAddProduct && <ProductAddModalGate open={showAddProduct} closeHref="/dashboard" />}
    </>
  );
}