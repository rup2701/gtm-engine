// components/PillEditor.tsx
'use client';
import { useState } from 'react';

export default function PillEditor({
  label,
  values,
  onSave,
  sanitize = (v: string) => v.trim().replace(/\s+/g, '-').toLowerCase(),
}: {
  label: string;
  values: string[];
  onSave: (next: string[]) => Promise<void>;
  sanitize?: (v: string) => string;
}) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (next: string[]) => {
    setSaving(true);
    await onSave(next);
    setSaving(false);
  };

  const add = async () => {
    const clean = sanitize(input);
    if (!clean || values.includes(clean)) {
      setInput('');
      return;
    }
    await persist([...values, clean]);
    setInput('');
  };

  const remove = async (v: string) => {
    await persist(values.filter((x) => x !== v));
  };

  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-3 border-b border-gray-100 items-start">
      <span className="text-md text-gray-500 pt-1">{label}</span>

      <div className="flex flex-wrap items-center gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#00b377]/10 text-[#00b377] text-md rounded"
          >
            {v}
            <button
              onClick={() => remove(v)}
              disabled={saving}
              className="text-[#00b377] hover:text-[#008d61] font-bold"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
            if (e.key === 'Backspace' && !input && values.length > 0) {
              remove(values[values.length - 1]);
            }
          }}
          onBlur={add}
          placeholder="+ Add..."
          className="min-w-[100px] px-2 py-1 text-sm border-b border-transparent focus:border-[#00b377] focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
}