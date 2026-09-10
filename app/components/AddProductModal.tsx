'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractBrandContext } from '@/lib/context/extractBrandContext';

type Extracted = {
  brandName: string;
  description: string;
  icp: string;
  tone: string;
  suggestedCategories: string[];
};

const DEFAULT_TIMES: Record<number, string[]> = {
  1: ['09:00'],
  2: ['09:00', '15:00'],
  3: ['09:00', '13:00', '17:00'],
  4: ['09:00', '11:00', '14:00', '17:00'],
  5: ['09:00', '11:00', '13:00', '15:00', '17:00'],
};


export default function AddProductModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [url, setUrl] = useState('');

  // Step 2 (pre-filled from extraction)
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [icp, setIcp] = useState('');
  const [tone, setTone] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Step 3
  const [frequency, setFrequency] = useState(3);
  const [times, setTimes] = useState(['09:00', '13:00', '17:00']);
  const [channels, setChannels] = useState(['linkedin', 'twitter']);

  const [rawText, setRawText] = useState('');


  const handleFrequencyChange = (value: number) => {
    setFrequency(value);
    setTimes(DEFAULT_TIMES[value] || ['09:00']);
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category || categories.includes(category)) return;

    setCategories((current) => [...current, category]);
    setNewCategory('');
  };

  const handleScrapeAndExtract = async () => {
    setLoading(true);
    try {
      // 1. Scrape
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, productId: 'temp' }),
      });
      const scrapeData: { pages: Array<{ title: string; content: string }> } =
        await scrapeRes.json();

      // 2. Concatenate
      const combined = scrapeData.pages
        .map((p) => `# ${p.title}\n${p.content}`)
        .join('\n\n---\n\n');
      setRawText(combined);

      // 3. Extract via server action
      const extracted: Extracted = await extractBrandContext({
        raw_text: combined,
      });

      // 4. Pre-fill form
      setBrandName(extracted.brandName || '');
      setDescription(extracted.description || '');
      setIcp(extracted.icp || '');
      setTone(extracted.tone || '');
      setCategories(extracted.suggestedCategories || []);

      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          description,
          icp,
          tone,
          categories,
          frequency,
          times,
          channels,
          rawText,
        }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(responseData.error || `Save failed (${res.status})`);
      }

      router.push(`/generate?productId=${responseData.productId}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="add-product-title" className="sr-only">Add product</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-2xl leading-none text-gray-400 hover:text-gray-900"
          >
            ×
          </button>
        </div>
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-2">Add your first product</h2>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;ll analyze your site and pre-fill the rest.
            </p>

            <input
              placeholder="Website URL (e.g. appnomics.dev)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-gray-200 p-3 mb-4 rounded font-mono text-sm focus:outline-none focus:border-[#00b377]"
            />

            <button
              onClick={handleScrapeAndExtract}
              disabled={loading || !url}
              className="w-full bg-[#00b377] text-white py-3 rounded font-bold hover:bg-[#008d61] disabled:opacity-50"
            >
              {loading ? 'Analyzing site...' : 'Continue →'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-2">Confirm your brand</h2>
            <p className="text-sm text-gray-500 mb-6">
              We extracted this from your site. Edit anything that&apos;s off.
            </p>

            <label className="block text-xs text-gray-600 mb-1">Brand name</label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full border border-gray-200 p-3 mb-3 rounded text-sm"
            />

            <label className="block text-xs text-gray-600 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 p-3 mb-3 rounded text-sm"
            />

            <label className="block text-xs text-gray-600 mb-1">ICP</label>
            <textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 p-3 mb-3 rounded text-sm"
            />

            <label className="block text-xs text-gray-600 mb-1">Tone</label>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full border border-gray-200 p-3 mb-3 rounded text-sm"
            />

            <label className="block text-xs text-gray-600 mb-1">Categories</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded bg-[#00b377]/10 px-3 py-1 text-xs text-[#00b377]"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => setCategories((current) => current.filter((category) => category !== c))}
                    aria-label={`Remove ${c}`}
                    className="ml-1 text-[#008d61] hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="Add a category"
                className="min-w-0 flex-1 rounded border border-gray-200 p-2 text-sm focus:border-[#00b377] focus:outline-none"
              />
              <button
                type="button"
                onClick={addCategory}
                disabled={!newCategory.trim()}
                className="rounded border border-[#00b377] px-3 py-2 text-sm font-bold text-[#008d61] hover:bg-[#00b377]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 py-3 rounded font-bold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-[#00b377] text-white py-3 rounded font-bold hover:bg-[#008d61]"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold mb-2">Set your schedule</h2>
            <p className="text-sm text-gray-500 mb-6">
              How often should DispatchOS post?
            </p>

            <label className="block text-xs text-gray-600 mb-1">
              Posts per day: {frequency}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={frequency}
              onChange={(e) => handleFrequencyChange(Number(e.target.value))}
              className="w-full mb-4 accent-[#00b377]"
            />

            <label className="block text-xs text-gray-600 mb-1">Times</label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {times.map((t, i) => (
                <input
                  key={i}
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const newTimes = [...times];
                    newTimes[i] = e.target.value;
                    setTimes(newTimes);
                  }}
                  className="border border-gray-200 p-2 rounded text-sm"
                />
              ))}
            </div>

            <label className="block text-xs text-gray-600 mb-1">Channels</label>
            <div className="flex gap-2 mb-6">
              {['linkedin', 'twitter', 'bluesky', 'reddit'].map((ch) => (
                <button
                  key={ch}
                  onClick={() =>
                    setChannels((prev) =>
                      prev.includes(ch)
                        ? prev.filter((c) => c !== ch)
                        : [...prev, ch]
                    )
                  }
                  className={`px-3 py-1 text-xs rounded border ${
                    channels.includes(ch)
                      ? 'bg-[#00b377] text-white border-[#00b377]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-200 py-3 rounded font-bold"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[#00b377] text-white py-3 rounded font-bold hover:bg-[#008d61] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Create Product'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}