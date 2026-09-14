// components/TopNav.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Dispatch, SetStateAction, useState } from 'react';
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

  const navigation = [
    { href: `/generate?productId=${activeProduct?.id}`, label: 'Generate', icon: Sparkles },
    { href: `/publish?productId=${activeProduct?.id}`, label: 'Publish', icon: CalendarDays },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      {/* Left: Logo */}

      {/* Center: Product switcher */}
      <div className="flex items-center gap-2 relative">
      <Link
        href={`/dashboard?productId=${activeProduct?.id || ''}`}
        className="flex items-center gap-3"
        aria-label="dispatchOS home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-zinc-950 shadow-[0_0_24px_rgba(52,211,153,0.2)]">
          <Zap className="h-4 w-4" strokeWidth={2.5} />
        </span>
        {/* <span className="text-base font-semibold tracking-tight">dispatchOS</span> */}
      </Link>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-gray-700 border-gray-200 text-sm md:text-md font-bold hover:border-gray-300"
        >
          <span className="w-2 h-2 rounded-full bg-[#00b377]" />
          {activeProduct?.name || 'No product'}
          <span className="text-gray-400 text-xl">▾</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white  border-gray-200 rounded shadow-sm z-20">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  router.push(`/dashboard?productId=${p.id}`);
                  onProductChange(p) 
                }}
                className={`w-full text-left px-3 py-2 text-sm md:text-md hover:bg-gray-50 ${
                  p.id === activeProduct?.id
                    ? 'text-[#00b377] font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                router.push('/dashboard?addProduct=true');
              }}
              className="w-full text-left px-3 py-2 text-sm md:text-md text-gray-500 border-t border-gray-100 hover:bg-gray-50"
            >
              + Add Product
            </button>
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
              className={`rounded-md p-2 transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
      
      {/* Right: Status + Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Distribution engine online
        </div>
      </div>
    </header>
  );
}