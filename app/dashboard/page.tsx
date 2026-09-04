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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Appnomics Content Engine</h1>
            <p className="text-sm text-zinc-400">Vertex AI Pipeline • Project: instaroom-501622</p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Ready</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Weekly Batch Generation</h2>
          <p className="text-sm text-zinc-400">
            Triggers Gemini 2.5 Flash to synthesize 3–5 posts/day across your core categories using your master files and upload memory.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={refreshScrape}
                onChange={(e) => setRefreshScrape(e.target.checked)}
                className="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
              />
              Re-scrape live site (appnomics.ai) before running synthesis
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-5 py-2.5 rounded-md text-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>{refreshScrape ? 'Scraping & Synthesizing...' : 'Synthesizing Batch...'}</span>
              </>
            ) : (
              <span>⚡ Generate Fresh Batch (Vertex AI)</span>
            )}
          </button>
          {error && <p className="text-sm text-rose-400 mt-2">{error}</p>}
        </div>

        {output && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-zinc-200">Generated Staging Preview</h2>
              <button
                onClick={() => alert('Queued to publishing engine!')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-all cursor-pointer"
              >
                Sync to Publishing Queue →
              </button>
            </div>
            <pre className="bg-zinc-950 p-4 rounded border border-zinc-800 text-xs text-zinc-300 overflow-x-auto max-h-96">
              {output}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}