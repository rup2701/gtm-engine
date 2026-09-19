// components/ProductEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import { updateProduct } from '../(dashboard)/dashboard/action';
import EditableField from './ui/EditableField';
import PillEditor from './PillEditor';

type Product = {
  id: string;
  name: string;
  description: string | null;
  icp: string | null;
  tone: string | null;
  categories: string | string[] | null;
  frequencyMin: number | null;
  frequencyMax: number | null;
  publishTimes: string | string[] | unknown[] | unknown | null;
  platforms: string | string[] | null;
};

export default function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();

  const save = async (patch: Record<string, unknown>) => {
    await updateProduct(product.id, patch);
    router.refresh();
  };

  const categories = product
    ? Array.isArray(product.categories)
      ? product.categories
      : typeof product.categories === 'string'
        ? JSON.parse(product.categories || '[]')
        : []
    : [];

  return (
    <div>
      <EditableField
        label="Description"
        value={product.description ?? ''}
        onSave={(v: unknown) => save({ description: v })}
        multiline
      />
      <EditableField
        label="ICP"
        value={product.icp ?? ''}
        onSave={(v: unknown) => save({ icp: v })}
        multiline
      />
      <EditableField
        label="Tone"
        value={product.tone ?? ''}
        onSave={(v: unknown) => save({ tone: v })}
        multiline
      />
      <PillEditor
        label="Categories"
        values={categories}
        onSave={(next) => save({ categories: JSON.stringify(next) })}
      />
    </div>
  );
}