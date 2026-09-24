// components/EditableField.tsx
'use client';
import { useState } from 'react';
import { Pencil } from 'lucide-react';

export default function EditableField({
  label,
  value,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const changed = draft !== value;

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-1 gap-2 py-3 border-b border-gray-100 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-4">
      <span className="text-md text-gray-500">{label}</span>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {editing ? (
          <>
            {multiline ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                rows={3}
                className="flex-1 border border-[#00b377] rounded px-3 py-2 text-md focus:outline-none"
              />
            ) : (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="flex-1 border border-[#00b377] rounded px-3 py-2 text-md focus:outline-none"
              />
            )}

            {changed && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 bg-[#00b377] text-white rounded font-semibold hover:bg-[#008d61]"
                >
                  {saving ? '...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className="group flex w-full items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-md text-gray-800 transition hover:border-[#00b377] hover:bg-emerald-50/40"
          >
            <span className="flex-1 whitespace-pre-wrap">{value || '—'}</span>
            <Pencil className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-[#00b377]" />
          </button>
        )}
      </div>
    </div>
  );
}
