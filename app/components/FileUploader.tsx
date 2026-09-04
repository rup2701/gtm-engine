'use client';

import { useState } from 'react';

export default function FileUploader({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      onUploaded();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 p-6 rounded-lg text-center transition-all">
      <label className="cursor-pointer space-y-2 block">
        <span className="text-sm font-medium text-zinc-300">
          {uploading ? 'Uploading context...' : '📁 Drop sprint notes, specs, or markdown files here'}
        </span>
        <p className="text-xs text-zinc-500">Files will be instantly appended to the next generation context window.</p>
        <input type="file" onChange={handleFileChange} className="hidden" accept=".md,.txt,.json" />
      </label>
    </div>
  );
}