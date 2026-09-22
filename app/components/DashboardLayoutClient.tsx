'use client';

import { useState } from 'react';
import DashboardSidebar from '@/app/components/DashboardSidebar';
import TopNav from '@/app/components/TopNav';
import PlanSelectionModal from '@/app/components/PlanSelectionModal';

type ProductOption = {
  id: string;
  name: string;
};

type DashboardLayoutClientProps = {
  products: ProductOption[];
  initialProduct: ProductOption | null;
  pendingPlan: { organizationId: string; tier: string } | null;
  children: React.ReactNode;
};

export default function DashboardLayoutClient({
  products,
  initialProduct,
  pendingPlan,
  children,
}: DashboardLayoutClientProps) {
  const [activeProduct, setActiveProduct] = useState<ProductOption | null>(
    initialProduct
  );

  return (
    <div className="gtm-canvas flex h-screen flex-col text-zinc-950">
      <TopNav
        products={products}
        activeProduct={activeProduct}
        onProductChange={setActiveProduct}
      />
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <DashboardSidebar activeProduct={activeProduct?.id ?? null} />
        <main className="flex-1 overflow-y-auto rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]">
          {children}
        </main>
      </div>
      {pendingPlan && (
        <PlanSelectionModal
          organizationId={pendingPlan.organizationId}
          initialTier={pendingPlan.tier === 'pro' || pendingPlan.tier === 'agency' ? pendingPlan.tier : 'starter'}
        />
      )}
    </div>
  );
}