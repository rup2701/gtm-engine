'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import LinkedInButton from '../components/ui/LinkedInButton';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="gtm-canvas flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="glass w-full max-w-md space-y-4 rounded-2xl p-8 ring-1 ring-black/5 shadow-[0_24px_70px_-12px_rgba(16,24,40,0.25)]">
        <h1 className="text-2xl font-bold text-[#111827] mb-6">
          Sign in to your account
        </h1>

        {error && (
          <p className="text-[#dc2626] text-sm font-mono">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[#111827] placeholder:text-[#9ca3af] focus:border-[#00b377] focus:outline-none focus:ring-1 focus:ring-[#00b377]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[#111827] placeholder:text-[#9ca3af] focus:border-[#00b377] focus:outline-none focus:ring-1 focus:ring-[#00b377]"
        />

        
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#00b377] py-3 font-bold font-mono text-white transition-all hover:bg-[#008d61] disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="rounded-full bg-white px-3 text-gray-400 ring-1 ring-black/5">or</span>
          </div>
        </div>

        <GoogleSignInButton />
        <LinkedInButton label="Sign in with LinkedIn" />

        <p className="text-xs text-[#6b7280] font-mono text-center">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-[#00b377] hover:text-[#008d61] hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}