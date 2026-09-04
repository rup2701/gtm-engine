'use client';

import { useState } from 'react';

interface ChannelConfig {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  apiKeyPlaceholder: string;
}

const INITIAL_CHANNELS: ChannelConfig[] = [
  { id: 'x', name: 'X (Twitter API v2)', type: 'social', connected: true, apiKeyPlaceholder: 'x_bearer_token_****************' },
  { id: 'linkedin', name: 'LinkedIn Company Page', type: 'social', connected: true, apiKeyPlaceholder: 'li_oauth_token_****************' },
  { id: 'discord', name: 'Discord Webhook (Announcements)', type: 'webhook', connected: false, apiKeyPlaceholder: 'https://discord.com/api/webhooks/...' },
];

export default function SettingsPage() {
  const [channels, setChannels] = useState<ChannelConfig[]>(INITIAL_CHANNELS);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setChannels(prev =>
      prev.map(ch => (ch.id === id ? { ...ch, connected: !ch.connected } : ch))
    );
  };

  const handleSave = () => {
    setSaving(true);
    setSuccessMessage(null);
    setTimeout(() => {
      setSaving(false);
      setSuccessMessage('Settings updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 600);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Command Center Settings</h1>
            <p className="text-sm text-zinc-400">Manage social API keys, publishing endpoints, and agent rules.</p>
          </div>
          {successMessage && (
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-md">
              {successMessage}
            </span>
          )}
        </div>

        {/* Social Channels Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Connected Channels</h2>
            <p className="text-xs text-zinc-400 mt-1">Configure where the publishing agent broadcasts your daily queue.</p>
          </div>

          <div className="space-y-4">
            {channels.map(channel => (
              <div key={channel.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${channel.connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-sm font-medium text-zinc-200">{channel.name}</span>
                  </div>
                  <button
                    onClick={() => toggleConnection(channel.id)}
                    className={`text-xs font-medium px-3 py-1 rounded transition-all cursor-pointer ${
                      channel.connected 
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                        : 'bg-zinc-100 text-zinc-950 hover:bg-white'
                    }`}
                  >
                    {channel.connected ? 'Disconnect' : 'Connect Channel'}
                  </button>
                </div>

                {channel.connected && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="password"
                      readOnly
                      value={channel.apiKeyPlaceholder}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-2 rounded flex-1 font-mono focus:outline-none"
                    />
                    <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded transition-all">
                      Update Key
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Agent Global Rules Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Publishing Agent Rules</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Daily Frequency Cadence</label>
              <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs p-2.5 rounded">
                <option>3 to 5 posts per day</option>
                <option>High frequency (5 to 8 posts/day)</option>
                <option>Conservative (1 to 2 posts/day)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Auto-Publish Mode</label>
              <select className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs p-2.5 rounded">
                <option>Fully Automated (Cron Agent Active)</option>
                <option>Manual Review Required (Pause before dispatch)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium px-5 py-2.5 rounded-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving changes...' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </main>
  );
}