// app/dashboard/staging/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Edit, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type Post = {
  id: string;
  batchId: string;
  dayOfWeek: string;
  scheduledAt: string;
  platform: 'twitter' | 'linkedin' | 'reddit';
  category: string;
  content: string;
  editedContent: string | null;
  status: 'draft' | 'queued' | 'hold' | 'dropped' | 'published' | 'failed';
  publishedAt: string | null;
};

type WeekData = {
  posts: Post[];
  groupedByDay: Record<string, Post[]>;
  total: number;
  stats: {
    queued: number;
    hold: number;
    dropped: number;
    published: number;
    draft: number;
  };
};

const PLATFORM_ICONS = {
  twitter: '🐦',
  linkedin: '🔗',
  reddit: '📱',
};

const PLATFORM_LABELS = {
  twitter: 'X',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── Date Utilities ───────────────────────────────────────────────

// ISO Week calculation for calendar viewing (not content generation)
function getCalendarWeekKey(date: Date): string {
  const year = date.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day);

  const diffDays = (date.getTime() - firstMonday.getTime()) / 86400000;
  const week = Math.floor(diffDays / 7) + 1;

  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Get the Monday of the week for a given offset
function getMondayDate(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Default offset: weekends → next week, weekdays → current week
function getDefaultOffset(): number {
  const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = today === 0 || today === 6;
  return isWeekend ? 1 : 0;
}

// Max forward offset: weekends → 1 (next week), weekdays → 0 (current)
function getMaxForwardOffset(): number {
  const today = new Date().getDay();
  const isWeekend = today === 0 || today === 6;
  return isWeekend ? 1 : 0;
}

// Check if a week is in the past
function isPastWeek(offset: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMonday = getMondayDate(offset);
  return targetMonday < today;
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// ─── Component ────────────────────────────────────────────────────

export default function StagingPage() {
  const [weekOffset, setWeekOffset] = useState(getDefaultOffset);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');

  const showPostDetails = (postId: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setHoveredPost(postId), 500);
  };

  const hidePostDetails = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = null;
    setHoveredPost(null);
  };

  const getWeekKey = (offset: number) => {
    const monday = getMondayDate(offset);
    return getCalendarWeekKey(monday);
  };

  const getWeekRange = (offset: number) => {
    const monday = getMondayDate(offset);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    return `${monday.toLocaleDateString('en-US', options)} - ${friday.toLocaleDateString('en-US', options)}`;
  };

  const fetchWeekData = async (offset: number, currentProductId?: string | null) => {
    const url = new URL('/api/posts', window.location.origin);
    url.searchParams.set('weekKey', getWeekKey(offset));
    console.log('Fetching week data for weekKey:', getWeekKey(offset), 'and productId:', currentProductId);
    if (currentProductId) {
      url.searchParams.set('productId', currentProductId);
    }
    
    setLoading(true);
    setFetchError(null);
    const weekKey = getWeekKey(offset);

    try {
      const url = new URL('/api/posts', window.location.origin);
      url.searchParams.set('weekKey', weekKey);
      if (productId) {
        url.searchParams.set('productId', productId);
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch posts');
      }

      if (!Array.isArray(data.posts)) {
        throw new Error('Posts response is missing the posts list');
      }

      setWeekData(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch posts';
      console.error('Failed to fetch posts:', error);
      setWeekData(null);
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
   const currentProductId = searchParams.get('productId');
   console.log('useEffect triggered with weekOffset:', weekOffset, 'and productId:', currentProductId); 
  fetchWeekData(weekOffset, currentProductId);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [weekOffset, searchParams]);

  const updatePostStatus = async (postId: string, status: string) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchWeekData(weekOffset);
  };

  const updatePostContent = async (postId: string, content: string) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedContent: content }),
    });
    if (res.ok) {
      fetchWeekData(weekOffset);
      setIsEditing(false);
      setSelectedPost(null);
    }
  };

  const handleRegenerate = async (withRescrape: boolean = false) => {
    if (isPastWeek(weekOffset)) {
      alert('Cannot regenerate past weeks.');
      return;
    }
    if (!confirm('This will wipe all edits. Are you sure?')) return;

    const weekKey = getWeekKey(weekOffset);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey, rescrape: withRescrape }),
    });
    if (res.ok) fetchWeekData(weekOffset);
  };

  const handleQueueAll = async () => {
    if (isPastWeek(weekOffset)) {
      alert('Cannot queue posts for past weeks.');
      return;
    }
    if (!confirm('Queue all draft posts for publishing?')) return;

    const weekKey = getWeekKey(weekOffset);
    const res = await fetch('/api/posts/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey, action: 'queue-all' }),
    });
    if (res.ok) fetchWeekData(weekOffset);
  };

  const handleFireNow = async (postId: string) => {
    await updatePostStatus(postId, 'queued');
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    fetchWeekData(weekOffset);
  };

  const maxForwardOffset = getMaxForwardOffset();

  // ─── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-[#f8fafc]">
        <div className="text-gray-500">Loading your content calendar...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <div className="text-red-600">{fetchError}</div>
        <button
          onClick={() => fetchWeekData(weekOffset)}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-white hover:bg-[var(--brand-hover)]"
        >
          Try again
        </button>
      </div>
    );
  }


  // ─── Main View ──────────────────────────────────────────────────

  const mondayDate = getMondayDate(weekOffset);
  const hasPosts = weekData && weekData.posts.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      {/* ─── Header (always visible) ────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
            {getWeekRange(weekOffset)}
          </span>
          {isPastWeek(weekOffset) && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Past Week</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 bg-white rounded-lg border hover:bg-gray-50 transition"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-2 text-sm bg-white rounded-lg border hover:bg-gray-50 transition"
          >
            This Week
          </button>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            disabled={weekOffset >= maxForwardOffset}
            className={`p-2 bg-white rounded-lg border transition ${
              weekOffset >= maxForwardOffset
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          <button
            onClick={() => handleRegenerate(false)}
            disabled={isPastWeek(weekOffset)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isPastWeek(weekOffset)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>

          <button
            onClick={() => handleRegenerate(true)}
            disabled={isPastWeek(weekOffset)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
              isPastWeek(weekOffset)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Rescrape
          </button>

          <button
            onClick={handleQueueAll}
            disabled={isPastWeek(weekOffset) || !hasPosts}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isPastWeek(weekOffset) || !hasPosts
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
            }`}
          >
            ✅ Queue All
          </button>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      {!hasPosts ? (
        // ─── Empty State ──────────────────────────────────────────
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No content for this week
            </h2>
            <p className="text-gray-500 mb-6">
              {isPastWeek(weekOffset)
                ? 'This week is in the past. Use the arrows above to view another week.'
                : 'Generate posts for this week to get started.'}
            </p>
            {!isPastWeek(weekOffset) && (
              <button
                onClick={() => handleRegenerate(false)}
                className="px-6 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] transition"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Generate Posts
              </button>
            )}
          </div>
        </div>
      ) : (
        // ─── Calendar Grid ────────────────────────────────────────
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DAYS.map((day) => {
            const posts = weekData.groupedByDay[day] || [];
            const dayIndex = DAYS.indexOf(day);
            const dayDate = new Date(mondayDate);
            dayDate.setDate(mondayDate.getDate() + dayIndex);

            return (
              <div
                key={day}
                className="bg-white rounded-xl border shadow-sm overflow-visible flex flex-col"
              >
                {/* Day header */}
                <div
                  className={`rounded-t-xl px-4 py-3 border-b ${
                    isToday(dayDate) ? 'bg-[var(--brand-soft)] border-[var(--brand)]' : 'bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{day}</div>
                  <div
                    className={`text-sm ${
                      isToday(dayDate) ? 'font-black tracking-tight text-[var(--brand-hover)]' : 'text-gray-500'
                    }`}
                  >
                    {dayDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {/* Posts */}
                <div className="p-3 space-y-3 flex-1 min-h-[200px]">
                  {posts.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">No posts</div>
                  ) : (
                    posts.map((post) => {
                      const displayContent = post.editedContent || post.content;
                      const preview =
                        displayContent.length > 60
                          ? displayContent.slice(0, 60) + '...'
                          : displayContent;
                      const isManualPlatform = post.platform === 'reddit';

                      return (
                        <div
                          key={post.id}
                          onMouseEnter={() => showPostDetails(post.id)}
                          onMouseLeave={hidePostDetails}
                          className={`relative p-3 rounded-lg border transition-all ${
                            post.status === 'dropped'
                              ? 'opacity-50 bg-gray-50'
                              : post.status === 'published'
                              ? 'bg-[var(--brand-soft)] border-[var(--brand)]'
                              : isManualPlatform
                              ? 'bg-amber-50 border-amber-200 hover:shadow-md'
                              : 'bg-white hover:shadow-md'
                          }`}
                        >
                          {hoveredPost === post.id && (
                            <div
                              role="tooltip"
                              className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-[#f8f8f8] p-4 text-left shadow-xl"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
                                <span className="font-semibold text-gray-900">
                                  {PLATFORM_LABELS[post.platform]} post
                                </span>
                                <span className="text-xs capitalize text-gray-500">
                                  {post.status}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-[17px] leading-6 text-gray-700">
                                {displayContent}
                              </p>
                              <div className="mt-3 text-xs text-gray-500">
                                {new Date(post.scheduledAt).toLocaleString()} · {post.category}
                              </div>
                            </div>
                          )}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="font-medium text-gray-900">
                                  {new Date(post.scheduledAt).toLocaleTimeString(
                                    'en-US',
                                    { hour: '2-digit', minute: '2-digit' }
                                  )}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">
                                  {PLATFORM_ICONS[post.platform]}{' '}
                                  {PLATFORM_LABELS[post.platform]}
                                </span>
                                {isManualPlatform && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                                    Manual action
                                  </span>
                                )}
                                <span className="text-gray-400">•</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {post.category}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {preview}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPost(post);
                                setEditContent(post.editedContent || post.content);
                                setIsEditing(true);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition ml-2 flex-shrink-0"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            {post.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'queued')}
                                  className="text-xs px-2 py-1 bg-[var(--brand-tint)] text-[var(--brand-hover)] rounded hover:bg-[var(--brand-tint-hover)] transition"
                                >
                                  ✅ Queue
                                </button>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'hold')}
                                  className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition"
                                >
                                  ⏸ Hold
                                </button>
                              </>
                            )}

                            {post.status === 'queued' && (
                              <>
                                <span className="text-xs px-2 py-1 bg-[var(--brand-tint)] text-[var(--brand-hover)] rounded">
                                  ✅ Queued
                                </span>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'hold')}
                                  className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition"
                                >
                                  ⏸ Hold
                                </button>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'dropped')}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
                                >
                                  ❌ Drop
                                </button>
                                {!isManualPlatform && new Date(post.scheduledAt) <= new Date() && (
                                  <button
                                    onClick={() => handleFireNow(post.id)}
                                    className="text-xs px-2 py-1 bg-[var(--brand-soft)] text-[var(--brand-hover)] rounded hover:bg-[var(--brand-tint-hover)] transition"
                                  >
                                    <Send className="w-3 h-3 inline" /> Fire Now
                                  </button>
                                )}
                              </>
                            )}

                            {post.status === 'hold' && (
                              <>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'queued')}
                                  className="text-xs px-2 py-1 bg-[var(--brand-tint)] text-[var(--brand-hover)] rounded hover:bg-[var(--brand-tint-hover)] transition"
                                >
                                  ✅ Queue
                                </button>
                                <button
                                  onClick={() => updatePostStatus(post.id, 'dropped')}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
                                >
                                  ❌ Drop
                                </button>
                              </>
                            )}

                            {post.status === 'published' && (
                              <span className="text-xs px-2 py-1 bg-[var(--brand-soft)] text-[var(--brand-hover)] rounded">
                                📤 Published
                              </span>
                            )}

                            {post.status === 'failed' && (
                              <span className="text-xs px-2 py-1 bg-rose-50 text-rose-700 rounded">
                                ⚠️ Failed
                              </span>
                            )}

                            {post.editedContent && post.status !== 'dropped' && (
                              <span
                                className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded"
                                title="Edited"
                              >
                                ✏️
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Footer Stats (only when posts exist) ────────────────── */}
      {hasPosts && (
        <div className="mt-6 p-4 bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="font-medium text-gray-700">
                📊 {weekData.total} posts total
              </span>
              <span className="text-[var(--brand)]">✅ {weekData.stats.queued} queued</span>
              <span className="text-amber-600">⏸ {weekData.stats.hold} on hold</span>
              <span className="text-red-600">❌ {weekData.stats.dropped} dropped</span>
              <span className="text-[var(--brand-hover)]">📤 {weekData.stats.published} published</span>
            </div>
            <div className="text-gray-400 text-xs">
              {weekData.posts.some((p) => p.editedContent) && (
                <span className="text-purple-600 mr-3">
                  ✏️ {weekData.posts.filter((p) => p.editedContent).length} edited
                </span>
              )}
              <span>Hash: {weekData.posts[0]?.batchId?.slice(0, 8) || '—'}...</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ───────────────────────────────────────────── */}
      {isEditing && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Post</h3>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
                <span>
                  {PLATFORM_ICONS[selectedPost.platform]}{' '}
                  {PLATFORM_LABELS[selectedPost.platform]}
                </span>
                <span>•</span>
                <span>
                  {new Date(selectedPost.scheduledAt).toLocaleString()}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {selectedPost.category}
                </span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-48 p-3 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedPost(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => updatePostContent(selectedPost.id, editContent)}
                className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}