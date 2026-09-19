'use client';

import { useState, useTransition } from 'react';
import { updateProfileName } from './actions';

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateProfileName(name);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm flex-1"
        placeholder="Your name"
        maxLength={80}
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-3 py-1.5 bg-[var(--brand)] text-white rounded disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="text-xs text-green-600">Saved ✓</span>}
    </form>
  );
}