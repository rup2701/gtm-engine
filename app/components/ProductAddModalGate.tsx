'use client';

import { useRouter } from 'next/navigation';
import AddProductModal from '@/app/components/AddProductModal';

export default function ProductAddModalGate({
  open,
  closeHref = '/',
}: {
  open: boolean;
  closeHref?: string;
}) {
  const router = useRouter();

  if (!open) return null;

  return <AddProductModal onClose={() => router.push(closeHref)} />;
}
