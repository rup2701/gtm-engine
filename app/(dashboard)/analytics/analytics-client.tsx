// app/(dashboard)/analytics/analytics-client.tsx
'use client';

import { useEffect, useState } from 'react';

type Pillar = {
  category: string;
  posts: number;
  avgEngagement: number;
  normalized: number;
  rating: 'high' | 'med' | 'low' | 'none';
};

type Channel = {
  platform: string;
  published: number;
  staged: number;
  held: number;
  failed: number;
  impressions: number;
};

type HighSignalPost = {
  id: string;
  platform: string;
  category: string;
  excerpt: string;
  engagementRate: number;
  impressions: number;
  publishedAt: string | null;
};

type AnalyticsData = {
  window: { days: number; since: string };
  totals: { posts: number; published: number; impressions: number };
  pillars: Pillar[];
  channels: Channel[];
  highSignal: HighSignalPost[];
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter: '🐦',
  linkedin: '🔗',
  reddit: '📱',
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
};

const RATING_STYLES: Record<Pillar['rating'], string> = {
  high: 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/15',
  med: 'bg-amber-500/10 text-amber-700 ring-amber-600/15',
  low: 'bg-zinc-500/10 text-zinc-500 ring-zinc-600/15',
  none: 'bg-zinc-500/10 text-zinc-400 ring-zinc-600/10',
};

function formatEngagement(value: number): string {
  if (value <= 0) return '—';
  // Rates are fractions for X (engagement/impressions) or raw counts for LinkedIn
  return value < 1 ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
}

function SignalBar({ normalized }: { normalized: number }) {
  const pct = Math.round(normalized * 100);
  return (
    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-black/5">
      <div
        className="h-full rounded-full bg-[var(--brand)] transition-all"
        style={{ width: `${Math.max(pct, 4)}%` }}
      />
    </div>
  );
}

export default function AnalyticsClient({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?productId=${productId}&days=30`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to load analytics');
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-gray-500">Loading performance data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-red-600">{error ?? 'No data'}</div>
      </div>
    );
  }

  const isEmpty = data.totals.published === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            {productName} · last {data.window.days} days · {data.totals.published} published ·{' '}
            {data.totals.impressions.toLocaleString()} impressions
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 ring-1 ring-black/5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Feedback loop · live</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-4 text-6xl">📡</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-700">No published posts yet</h2>
          <p className="text-gray-500">
            Once posts go live, engagement signals from each channel will show up here —
            and feed back into the content engine.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1 — Pillar efficiency */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-lg font-semibold text-gray-900">Content Pillar Efficiency</h2>
            <p className="mt-1 text-xs text-gray-500">
              Which themes resonate. High-signal pillars get weighted into future generation.
            </p>
            <div className="mt-4 divide-y divide-black/5">
              {data.pillars.map((p) => (
                <div key={p.category} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 py-3">
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium text-gray-800">{p.category}</span>
                    <span className="ml-2 text-xs text-gray-400">{p.posts} posts</span>
                  </div>
                  <span className="w-16 text-right text-sm tabular-nums text-gray-700">
                    {formatEngagement(p.avgEngagement)}
                  </span>
                  <SignalBar normalized={p.normalized} />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${RATING_STYLES[p.rating]}`}
                  >
                    {p.rating === 'none' ? 'no signal' : p.rating}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2 — Channel health */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-md font-semibold text-gray-900">Channel Health & Throughput</h2>
            <div className="mt-4 space-y-2">
              {data.channels.map((c) => (
                <div
                  key={c.platform}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2.5 ring-1 ring-black/5"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <span aria-hidden>{PLATFORM_ICONS[c.platform] ?? '📣'}</span>
                    {PLATFORM_LABELS[c.platform] ?? c.platform}
                  </span>
                  <span className="text-xs text-gray-500">
                    {c.published} published · {c.staged} staged
                    {c.held > 0 ? ` · ${c.held} on hold` : ''}
                    {c.failed > 0 ? ` · ${c.failed} failed` : ''}
                  </span>
                  <span className="ml-auto text-xs tabular-nums text-gray-500">
                    {c.impressions > 0 ? `${c.impressions.toLocaleString()} impressions` : 'no impression data'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 — High-signal posts */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-md font-semibold text-gray-900">High-Signal Posts</h2>
            <p className="mt-1 text-xs text-gray-500">
              Top performers — these are candidates to anchor future prompts.
            </p>
            <div className="mt-4 space-y-2">
              {data.highSignal.length === 0 ? (
                <p className="text-sm text-gray-400">No engagement recorded yet — metrics sync runs every 6 hours.</p>
              ) : (
                data.highSignal.map((p) => (
                  <div key={p.id} className="rounded-xl px-3 py-2.5 ring-1 ring-black/5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span aria-hidden>{PLATFORM_ICONS[p.platform] ?? '📣'}</span>
                      <span className="font-medium text-gray-700">{p.category}</span>
                      <span>·</span>
                      <span className="tabular-nums">{formatEngagement(p.engagementRate)} engagement</span>
                      {p.impressions > 0 && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums">{p.impressions.toLocaleString()} impressions</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-700">{p.excerpt}…</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
