// components/EditableField.tsx
'use client';
import { useState } from 'react';

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
    <div className="grid grid-cols-[180px_1fr] gap-4 py-3 border-b border-gray-100 items-start">
      <span className="text-md text-gray-500">{label}</span>

      <div className="flex items-center gap-2">
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
              <>
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
              </>
            )}
          </>
        ) : (
          <>
            <span
              onClick={() => setEditing(true)}
              className="flex-1 text-md text-gray-800 cursor-text hover:text-[#00b377] transition-colors"
            >
              {value || '—'}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-[#00b377]"
              aria-label={`Edit ${label}`}
            >
              ↻
            </button>
          </>
        )}
      </div>
    </div>
  );
}