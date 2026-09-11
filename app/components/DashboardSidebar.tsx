// components/DashboardSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { CalendarDays, LayoutGrid, LogOut, Settings, Sparkles } from 'lucide-react';


export default function DashboardSidebar({ activeProduct }: { activeProduct: string }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/generate', label: 'Generate', icon: Sparkles },
    { href: `/publish?productId=${activeProduct}`, label: 'Publish', icon: CalendarDays },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 border-r border-gray-200 bg-white h-full flex flex-col p-3">
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

      <div className="flex-1" />

      <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
        <Link
          href="/workspace/settings"
          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
        >
          Workspace settings
        </Link>
         <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className=" flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <LogOut className="h-4 w-4 text-zinc-400" />
            Sign out
          </button>
      </div>
    </aside>
  );
}