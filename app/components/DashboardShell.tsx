'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Settings, Sparkles, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

const navigation = [
  { href: '/generate', label: 'Generate', icon: Sparkles },
  { href: '/publish', label: 'Publish', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-950">
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 text-zinc-950 md:px-6">
        <Link href="/generate" className="flex items-center gap-3" aria-label="dispatchOS home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.2)]">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">dispatchOS</span>
        </Link>

        <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Distribution engine online
        </div>

        <nav className="flex items-center gap-1 md:hidden" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`rounded-md p-2 transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white p-4 md:block">
          <div className="mb-5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Workspace
          </div>
          <nav className="space-y-1" aria-label="Workspace navigation">
            {navigation.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-zinc-100 pt-5 text-xs text-zinc-400">
            <p className="px-3">dispatchOS</p>
            <p className="px-3 pt-1">Founder distribution control room</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
