// components/DashboardSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarDays, LayoutGrid, Settings, Sparkles } from 'lucide-react';

type DashboardSidebarProps = {
  activeProduct: string | null;
  userName: string;
  userEmail: string;
};

export default function DashboardSidebar({
  activeProduct,
  userName,
  userEmail,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Omit productId entirely when there's no active product yet — passing the
  // literal string "null" crashes downstream pages that query by UUID.
  const productQuery = activeProduct ? `?productId=${activeProduct}` : '';
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const navItems = [
    { href: `/dashboard${productQuery}`, label: 'Dashboard', icon: LayoutGrid },
    { href: `/generate${productQuery}`, label: 'Generate', icon: Sparkles },
    { href: `/publish${productQuery}`, label: 'Publish', icon: CalendarDays },
    { href: `/analytics${productQuery}`, label: 'Analytics', icon: BarChart3 },
    { href: `/settings${productQuery}`, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="glass hidden w-56 shrink-0 flex-col self-stretch rounded-2xl p-2 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_32px_-16px_rgba(16,24,40,0.15)] md:flex">
      <div className="mt-2 mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Workspace
      </div>
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href.split('?')[0];
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-950'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-zinc-400'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mt-auto flex flex-col gap-1 border-t border-black/5 pt-3">
        <Link
          href="/account?tab=profile"
          className="flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/70"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 ring-1 ring-black/5">
            {initials || userEmail.slice(0, 1).toUpperCase() || '?'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-zinc-800" title={userName}>
              {userName}
            </span>
            <span className="block truncate text-xs text-zinc-500" title={userEmail}>
              {userEmail}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}