'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDefaultOffset, getWeekKey } from '@/lib/date-utils';

type WeekState = {
  draft: number;
  queued: number;
  published: number;
};

export default function GeneratePage() {
  const [loading, setLoading] = useState(false);
  const [refreshScrape, setRefreshScrape] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [weekState, setWeekState] = useState<WeekState | null>(null);
  const [confirming, setConfirming] = useState(false);


  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const weekKey = getWeekKey(getDefaultOffset());

  const weekLocked = !!weekState && (weekState.queued > 0 || weekState.published > 0);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/posts?weekKey=${weekKey}&productId=${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stats) {
          setWeekState({
            draft: data.stats.draft,
            queued: data.stats.queued,
            published: data.stats.published,
          });
        }
      })
      .catch(() => {});
  }, [productId, weekKey]);
  
  const handleGenerate = async (force: boolean = false) => {
    // Drafts exist and not yet confirmed → show the in-app confirmation modal.
    if (!force && weekState && weekState.draft > 0) {
      setConfirming(true);
      return;
    }

    setConfirming(false);
    setError(null);
    setErrorCode(null);
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshScrape, productId, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorCode(data.code ?? null);
        throw new Error(data.error || 'Failed to generate batch.');
      }
      setOutput(data.content ?? data.message ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <main className="p-6 font-sans text-gray-900">
       
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-black/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate</h1>
            {/* <p className="text-sm text-gray-500">Vertex AI Pipeline • Project: instaroom-501622</p> */}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 ring-1 ring-black/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Ready</span>
          </div>
        </div>

        {error && errorCode === 'NO_PLATFORMS' ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/15">
            <span aria-hidden>⚠️</span>
            <div>
              {error}{' '}
              <Link
                href={`/settings${productId ? `?productId=${productId}` : ''}`}
                className="font-medium underline hover:text-amber-900"
              >
                Select channels in Settings →
              </Link>
            </div>
          </div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
        ) : null
      }
        <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="text-sm font-semibold text-gray-900">This Week's Content Engine</h2>
          <p className="text-sm text-gray-500">
            Generates a full week of on-brand posts for every connected channel — written from your product story, audience, and voice.
          </p>
          {weekLocked && weekState && (
            <div className="flex items-start gap-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 ring-1 ring-inset ring-black/5">
              <span aria-hidden>🔒</span>
              <span>
                This week is locked — {weekState.queued + weekState.published} post{(weekState.queued + weekState.published) === 1 ? ' is' : 's are'} queued or published. To regenerate, drop or unqueue them from the Publish calendar first.
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={refreshScrape}
                onChange={(e) => setRefreshScrape(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-indigo-600 focus:ring-0"
              />
              Re-scrape live site before running synthesis.
            </label>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading || weekLocked}
            className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{refreshScrape ? 'Scraping & Synthesizing...' : 'Synthesizing Batch...'}</span>
              </>
            ) : (
              <span>{weekState && weekState.draft > 0 ? '⚡ Regenerate Batch' : '⚡ Generate Fresh Batch'}</span>
            )}
          </button>
          {/* {error && <p className="mt-2 text-sm text-red-600">{error}</p>} */}
        </div>

        {output && (
          <div className="space-y-4 rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Generated Staging Preview</h2>
              <button
                onClick={() => alert('Queued to publishing engine!')}
                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-700"
              >
                Sync to Publishing Queue →
              </button>
            </div>
            <pre className="max-h-96 overflow-x-auto rounded-xl bg-zinc-50 p-4 text-xs text-gray-700 ring-1 ring-black/5">
              {output}
            </pre>
          </div>
        )}
      </div>

      {/* ── Overwrite confirmation modal ─────────────────────────── */}
      {confirming && weekState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_24px_70px_-12px_rgba(16,24,40,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Replace existing drafts?</h3>
            <p className="mt-2 text-sm text-gray-600">
              {weekState.draft} draft post{weekState.draft === 1 ? '' : 's'} already exist{weekState.draft === 1 ? 's' : ''} for this week. Regenerating will permanently delete them, including any edits.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-zinc-100 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerate(true)}
                className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"
              >
                Delete &amp; Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}