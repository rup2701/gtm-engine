// components/TopNav.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { CalendarDays, LogOut, Settings, Sparkles, Zap } from 'lucide-react';

type Product = { id: string; name: string };

type TopNavProps = {
  products: Product[];
  activeProduct: Product| null;
  onProductChange: Dispatch<SetStateAction<Product | null>>;
};



export default function TopNav({
  products,
  activeProduct,
  onProductChange,
}: TopNavProps) {

  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const productQuery = activeProduct?.id ? `?productId=${activeProduct.id}` : '';
  const navigation = [
    { href: `/generate${productQuery}`, label: 'Generate', icon: Sparkles },
    { href: `/publish${productQuery}`, label: 'Publish', icon: CalendarDays },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <header className="glass relative z-50 mx-3 mt-3 flex h-14 items-center justify-between rounded-2xl px-4 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_32px_-16px_rgba(16,24,40,0.18)]">
      {/* Left: Logo */}

      {/* Center: Product switcher */}
      <div ref={switcherRef} className="relative z-50 flex items-center gap-2">
      <Link
        href={`/dashboard${productQuery}`}
        className="flex items-center gap-3"
        aria-label="dispatchOS home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.2)]">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
        </span>
        {/* <span className="text-base font-semibold tracking-tight">dispatchOS</span> */}
      </Link>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-zinc-700 ring-1 ring-black/5 transition hover:bg-white hover:ring-black/10"
        >
          <span className="w-2 h-2 rounded-full bg-[#00b377]" />
          {activeProduct?.name || 'No product'}
          <span className="text-xs text-zinc-400">▾</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-2 min-w-[220px] rounded-2xl bg-white p-1.5 ring-1 ring-black/5 shadow-[0_8px_30px_-6px_rgba(16,24,40,0.25)]">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  router.push(`/dashboard?productId=${p.id}`);
                  onProductChange(p) 
                }}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm md:text-md hover:bg-zinc-100 ${
                  p.id === activeProduct?.id
                    ? 'text-[#00b377] font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
            <div className="mt-1 border-t border-black/5 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push('/dashboard?addProduct=true');
                }}
                className="w-full text-left rounded-xl px-3 py-2 text-sm md:text-md text-gray-500 hover:bg-zinc-100"
              >
                + Add Product
              </button>
            </div>
          </div>
        )}
      </div>
      <nav className="flex items-center gap-1 md:hidden" aria-label="Primary navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`rounded-xl p-2 transition-colors ${
                isActive ? 'bg-emerald-500/10 text-emerald-700' : 'text-zinc-400 hover:bg-white/70 hover:text-zinc-950'
              }`}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/70 hover:text-zinc-950"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
      
      {/* Right: Status + Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs text-zinc-500 ring-1 ring-black/5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          system: online
        </div>
      </div>
    </header>
  );
}