// components/DashboardSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { BarChart3, CalendarDays, LayoutGrid, LogOut, Settings, SlidersHorizontal, Sparkles } from 'lucide-react';

type DashboardSidebarProps = {
  activeProduct: string | null;
};

export default function DashboardSidebar({
  activeProduct,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/dashboard?productId=${activeProduct}`, label: 'Dashboard', icon: LayoutGrid },
    { href: `/generate?productId=${activeProduct}`, label: 'Generate', icon: Sparkles },
    { href: `/publish?productId=${activeProduct}`, label: 'Publish', icon: CalendarDays },
    { href: `/analytics?productId=${activeProduct}`, label: 'Analytics', icon: BarChart3 },
    { href: `/settings?productId=${activeProduct}`, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="glass hidden w-56 shrink-0 flex-col self-stretch rounded-2xl p-2 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_32px_-16px_rgba(16,24,40,0.15)] md:flex">
      <div className="mt-2 mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Workspace
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-800 ring-1 ring-inset ring-emerald-600/15'
                  : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-950'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mt-auto flex flex-col gap-1 border-t border-black/5 pt-3">
        <Link
          href="/account"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-white/70 hover:text-zinc-950"
        >
          <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
          Account settings
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-white/70 hover:text-zinc-950"
        >
          <LogOut className="h-4 w-4 text-zinc-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}