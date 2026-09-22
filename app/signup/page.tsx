'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import LinkedInButton from '../components/ui/LinkedInButton';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';

type Tier = 'starter' | 'pro' | 'agency';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier] = useState<Tier>(() => {
    if (typeof window === 'undefined') return 'starter';
    const requestedTier = new URLSearchParams(window.location.search).get('plan');
    return requestedTier === 'pro' || requestedTier === 'agency' ? requestedTier : 'starter';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, tier }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Signup failed');
      setLoading(false);
      return;
    }

    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    router.push(`/dashboard?plan=${data.tier}`);
  };

  return (
    <div className="gtm-canvas flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl px-6 py-12 ring-1 ring-black/5 shadow-[0_24px_70px_-12px_rgba(16,24,40,0.25)]">
        <h1 className="text-xl text-center font-medium text-[#111827] mb-6">
          Create your DispatchOS account
        </h1>

        <GoogleSignInButton callbackUrl={`/dashboard?plan=${tier}`} label="Sign up with Google" />
        <LinkedInButton callbackUrl={`/dashboard?plan=${tier}`} label="Sign up with LinkedIn" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="rounded-full bg-white px-3 text-gray-400 ring-1 ring-black/5">or</span>
          </div>
        </div>
        
        {error && (
          <p className="text-[#dc2626] text-sm font-mono">{error}</p>
        )}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[#111827] placeholder:text-[#9ca3af] focus:border-[#00d48a] focus:outline-none focus:ring-1 focus:ring-[#00d48a]"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[#111827] placeholder:text-[#9ca3af] focus:border-[#00d48a] focus:outline-none focus:ring-1 focus:ring-[#00d48a]"
        />

        <input
          type="password"
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[#111827] placeholder:text-[#9ca3af] focus:border-[#00d48a] focus:outline-none focus:ring-1 focus:ring-[#00d48a]"
        />

        

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--brand)] py-3 font-bold font-mono text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account →'}
        </button>


        <p className="text-xs text-[#6b7280] font-mono text-center">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--brand)] hover:text-[var(--brand-hover)] hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}