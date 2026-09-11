'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 bg-white p-8 rounded-lg shadow-md">
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
          className="w-full bg-white border border-[#e5e7eb] rounded-[2px] px-4 py-3 text-[#111827] font-mono placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00b377] focus:ring-1 focus:ring-[#00b377]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-white border border-[#e5e7eb] rounded-[2px] px-4 py-3 text-[#111827] font-mono placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00b377] focus:ring-1 focus:ring-[#00b377]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#00b377] text-white font-bold font-mono rounded-[2px] hover:bg-[#008d61] transition-all disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>

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