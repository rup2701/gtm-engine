import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { products, subscriptions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import DashboardLayoutClient from '@/app/components/DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const orgId = session.user.organizationId;
  const [userProducts, subscription, signedInUser] = orgId
    ? await Promise.all([
        db.select().from(products).where(eq(products.organizationId, orgId)),
        db.query.subscriptions.findFirst({ where: eq(subscriptions.organizationId, orgId) }),
        db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { name: true, email: true },
        }),
      ])
    : [[], undefined, null];

  const activeProduct = userProducts[0] ?? null;

  return (
    <DashboardLayoutClient
      products={userProducts.map((p) => ({
        id: p.id,
        name: p.name,
      }))}
      initialProduct={activeProduct ? { id: activeProduct.id, name: activeProduct.name } : null}
      userName={signedInUser?.name?.trim() || signedInUser?.email || session.user.name || 'Account'}
      userEmail={signedInUser?.email ?? session.user.email ?? ''}
      pendingPlan={subscription?.status === 'pending'
        ? { organizationId: orgId!, tier: subscription.tier }
        : null}
    >
      {children}
    </DashboardLayoutClient>
  );
}