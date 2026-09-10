'use client';

import { useState } from 'react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [refreshScrape, setRefreshScrape] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshScrape }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate batch.');
      setOutput(data.content);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate</h1>
            {/* <p className="text-sm text-gray-500">Vertex AI Pipeline • Project: instaroom-501622</p> */}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Ready</span>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Weekly Batch Generation</h2>
          <p className="text-sm text-gray-500">
            Triggers Gemini 2.5 Flash to synthesize 3–5 posts/day across your core categories using your master files and upload memory.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={refreshScrape}
                onChange={(e) => setRefreshScrape(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-indigo-600 focus:ring-0"
              />
              Re-scrape live site (appnomics.ai) before running synthesis
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{refreshScrape ? 'Scraping & Synthesizing...' : 'Synthesizing Batch...'}</span>
              </>
            ) : (
              <span>⚡ Generate Fresh Batch (Vertex AI)</span>
            )}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {output && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Generated Staging Preview</h2>
              <button
                onClick={() => alert('Queued to publishing engine!')}
                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-700"
              >
                Sync to Publishing Queue →
              </button>
            </div>
            <pre className="max-h-96 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
              {output}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}