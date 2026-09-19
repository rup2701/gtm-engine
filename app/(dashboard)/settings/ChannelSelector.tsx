'use client';

import { useTransition } from 'react';
import { togglePlatform } from './actions';

const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn', connectable: true },
  { id: 'twitter', label: 'X (Twitter)', connectable: true },
  { id: 'reddit', label: 'Reddit', connectable: false },
  { id: 'bluesky', label: 'BlueSky', connectable: true },
] as const;

export function ChannelSelector({
  productId,
  platforms,
  connectedProviders,
}: {
  productId: string;
  platforms: string[];
  connectedProviders: string[]; // e.g. ['twitter', 'linkedin']
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
              <span className="text-xs text-amber-600">connect below to enable</span>
            )}
          </label>
        );
      })}
    </div>
  );
}