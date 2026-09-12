// components/ProductEditor.tsx
'use client';


import { useRouter } from 'next/navigation';
import { updateProduct } from '../(dashboard)/dashboard/action';
import EditableField from './ui/EditableField';

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

  const save = async (patch: Record<string, any>) => {
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
  const times = product
    ? Array.isArray(product.publishTimes)
      ? product.publishTimes
      : typeof product.publishTimes === 'string'
        ? JSON.parse(product.publishTimes || '[]')
        : []
    : [];
  const platforms = product
    ? Array.isArray(product.platforms)
      ? product.platforms
      : typeof product.platforms === 'string'
        ? JSON.parse(product.platforms || '[]')
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
      <EditableField
        label="Categories"
        value={categories}
        onSave={(v: string) =>
          save({ categories: JSON.stringify(v.split(',').map((s: string) => s.trim())) })
        }
      />
      <EditableField
        label="Times"
        value={times}
        onSave={(v: string) =>
          save({ publishTimes: JSON.stringify(v.split(',').map((s: string) => s.trim())) })
        }
      />
      <EditableField
        label="Channels"
        value={platforms}
        onSave={(v: string) =>
          save({ platforms: JSON.stringify(v.split(',').map((s: string) => s.trim())) })
        }
      />
    </div>
  );
}