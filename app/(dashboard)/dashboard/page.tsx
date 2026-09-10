'use client';
import AddProductModal from '@/app/components/AddProductModal';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddProductOpen = searchParams.get('addProduct') === 'true';

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Workspace</h1>
        {/* <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-[#00b377] text-white rounded-[2px] hover:bg-[#008d61]"
        >
          + Add Product
        </button> */}
      </div>

      {/* Empty state or product list */}
      <p className="text-gray-500">No products yet. Add one to get started.</p>

      {isAddProductOpen && (
        <AddProductModal onClose={() => router.replace('/dashboard')} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}