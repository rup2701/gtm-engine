// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ProductAddModalGate from '@/app/components/ProductAddModalGate';

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

  const categories = active ? JSON.parse(active.categories || '[]') : [];

  const times = active
    ? Array.isArray(active.publishTimes)
      ? active.publishTimes
      : typeof active.publishTimes === 'string'
        ? JSON.parse(active.publishTimes || '[]')
        : []
    : [];

  const channels = active
    ? Array.isArray(active.platforms)
      ? active.platforms
      : typeof active.platforms === 'string'
        ? JSON.parse(active.platforms || '[]')
        : []
    : [];

  return (
    <>
      <div className="p-10 max-w-4xl">
        {active ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{active.name}</h1>
            <p className="text-gray-500 mb-8">{active.description}</p>

            <div className="grid grid-cols-2 gap-6">
              <Section label="ICP" value={active.icp || ''} />
              <Section label="Tone" value={active.tone || ''} />
              <Section label="Frequency" value={`${active.frequencyMin}–${active.frequencyMax} posts/day`} />
              <Section label="Times" value={times.join(', ')} />
              <Section label="Channels" value={channels.join(', ')} />
              <Section label="Content Categories" value={categories.join(', ')} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500">
            No products yet. Create your first product.
          </div>
        )}
      </div>

      {showAddProduct && <ProductAddModalGate open={showAddProduct} closeHref="/dashboard" />}
    </>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}