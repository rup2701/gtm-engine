'use client';

import { useEffect, useState } from 'react';

interface ChannelConfig {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  apiKeyPlaceholder: string;
  apiKey?: string; // 👈 Add this
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

  const handleTokenChange = (id: string, value: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.id === id ? { ...ch, apiKey: value } : ch
      )
    );
  };
  
  const saveToken = async (id: string) => {
    const channel = channels.find(ch => ch.id === id);
    if (!channel) return;

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: id,
          token: channel.apiKey,
        }),
      });
      
      if (res.ok) {
        setSuccessMessage(`${channel.name} token saved successfully.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to save token:', error);
    } finally {
      setSaving(false);
    }
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

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        // Set connected state based on saved tokens
        setChannels(prev => prev.map(ch => ({
          ...ch,
          connected: !!data[ch.id + 'Token'],
          apiKey: data[ch.id + 'Token'] || '',
        })));
      });
    }, []);
    
  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-gray-500">Manage social API keys, publishing endpoints, and agent rules.</p>
          </div>
          {successMessage && (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
              {successMessage}
            </span>
          )}
        </div>

        {/* Social Channels Section */}
        {/* <h3>Publishing Channels</h3> */}
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Connected Channels</h2>
            <p className="mt-1 text-xs text-gray-500">Configure where the publishing agent broadcasts your daily queue.</p>
          </div>

          <div className="space-y-4">
            {channels.map(channel => (
              <div key={channel.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${channel.connected ? 'animate-pulse bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-800">{channel.name}</span>
                  </div>
                  <button
                    onClick={() => toggleConnection(channel.id)}
                    className={`text-xs font-medium px-3 py-1 rounded transition-all cursor-pointer ${
                      channel.connected 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {channel.connected ? 'Disconnect' : 'Connect Channel'}
                  </button>
                </div>

                {channel.connected && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="password"
                      value={channel.apiKey}
                      onChange={(e) => handleTokenChange(channel.id, e.target.value)}
                      placeholder="Paste your API key / token"
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => saveToken(channel.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white transition-all hover:bg-indigo-700"
                    >
                      Save Key
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Agent Global Rules Section */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Publishing Agent Rules</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Daily Frequency Cadence</label>
              <select className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-800">
                <option>3 to 5 posts per day</option>
                <option>High frequency (5 to 8 posts/day)</option>
                <option>Conservative (1 to 2 posts/day)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Auto-Publish Mode</label>
              <select className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-800">
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
            className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving changes...' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </main>
  );
}