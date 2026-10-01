'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { updateProfileName } from './actions';

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
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
      <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-5">
        <div>
          <p className="text-sm font-medium text-zinc-900">Sign out</p>
          <p className="text-xs text-zinc-500">End your current session on this device.</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}