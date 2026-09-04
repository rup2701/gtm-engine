'use client';

import { useState } from 'react';

interface QueueItem {
  id: string;
  time: string;
  platform: 'linkedin' | 'x';
  category: 'build' | 'engineering' | 'ux' | 'marketing' | 'launch';
  content: string;
  status: 'published' | 'queued' | 'failed';
}

const INITIAL_QUEUE: QueueItem[] = [
  {
    id: 'post_01',
    time: '09:00 AM',
    platform: 'linkedin',
    category: 'engineering',
    content: 'After a decade of shipping production software, we realized architectural discipline is the ultimate bottleneck...',
    status: 'published',
  },
  {
    id: 'post_02',
    time: '01:30 PM',
    platform: 'x',
    category: 'build',
    content: 'Why most AI wrapper startups fail within 6 months: zero defensibility in the core data pipeline...',
    status: 'published',
  },
  {
    id: 'post_03',
    time: '05:00 PM',
    platform: 'linkedin',
    category: 'ux',
    content: 'Good developer UX isn’t about flashy animations. It’s about reducing cognitive load to zero.',
    status: 'queued',
  },
];

export default function PublishDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);

  const handleFireNow = (id: string) => {
    setQueue(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'published' } : item))
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Publishing Command & Log</h1>
            <p className="text-sm text-zinc-400">Automated Agent Dispatch • Connected to X & LinkedIn APIs</p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Agent Active</span>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-zinc-200">Today's Execution Queue</h2>
            <span className="text-xs text-zinc-400">Auto-syncing via database cron</span>
          </div>
          
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400 bg-zinc-950/50">
                <th className="p-4 font-medium">Scheduled Time</th>
                <th className="p-4 font-medium">Platform</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Content Preview</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {queue.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/25 transition-colors">
                  <td className="p-4 text-zinc-300 font-mono text-xs">{item.time}</td>
                  <td className="p-4 capitalize text-zinc-300">{item.platform}</td>
                  <td className="p-4">
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md font-mono">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400 max-w-xs truncate">{item.content}</td>
                  <td className="p-4">
                    {item.status === 'published' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        ● Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        ◌ Queued
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {item.status === 'queued' ? (
                      <button
                        onClick={() => handleFireNow(item.id)}
                        className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium px-3 py-1.5 rounded transition-all cursor-pointer"
                      >
                        Fire Now ▶
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">Logged ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}