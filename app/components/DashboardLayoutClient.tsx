'use client';

import { useState } from 'react';
import DashboardSidebar from '@/app/components/DashboardSidebar';
import TopNav from '@/app/components/TopNav';

type ProductOption = {
  id: string;
  name: string;
};

type DashboardLayoutClientProps = {
  products: ProductOption[];
  initialProduct: ProductOption | null;
  children: React.ReactNode;
};

export default function DashboardLayoutClient({
  products,
  initialProduct,
  children,
}: DashboardLayoutClientProps) {
  const [activeProduct, setActiveProduct] = useState<ProductOption | null>(
    initialProduct
  );

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <TopNav
        products={products}
        activeProduct={activeProduct}
        onProductChange={setActiveProduct}
      />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar activeProduct={activeProduct?.id ?? null} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}