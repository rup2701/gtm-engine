'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { togglePlatform } from './actions';

const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn', connectable: true },
  { id: 'twitter', label: 'X (Twitter)', connectable: true },
  { id: 'reddit', label: 'Reddit', connectable: false },
  { id: 'bluesky', label: 'BlueSky', connectable: false },
] as const;

export function ChannelSelector({
  productId,
  platforms,
  connectedProviders,
}: {
  productId: string;
  platforms: string[];
  connectedProviders: string[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {CHANNELS.map(({ id, label, connectable }) => {
        const selected = platforms.includes(id);
        const needsConnect = connectable && !connectedProviders.includes(id);

        return (
          <label key={id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected}
                disabled={isPending || (needsConnect && !selected)}
                onChange={(e) =>
                  startTransition(() => togglePlatform(productId, id, e.target.checked))
                }
                className="h-4 w-4 accent-[var(--brand)]"
              />
              {label}
            </span>
            {needsConnect && (
              <Link
                href="/account?tab=connections"
                className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
              >
                Connect in Account Settings → Team
              </Link>
            )}
            {id === 'bluesky' && (
              <span className="text-xs text-gray-400">manual for now</span>
            )}
          </label>
        );
      })}
    </div>
  );
}