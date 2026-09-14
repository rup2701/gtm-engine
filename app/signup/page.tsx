'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import LinkedInButton from '../components/ui/LinkedInButton';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
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

    router.push('/generate');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 bg-white px-6 py-12 rounded-2xl shadow-md">
        <h1 className="text-xl text-center font-medium text-[#111827] mb-6">
          Welcome to DispatchOS
        </h1>

        <LinkedInButton label="Sign up with LinkedIn" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#f8fafc] px-3 text-gray-400">or</span>
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
          className="w-full bg-white border border-[#e5e7eb] rounded-[2px] px-4 py-3 text-[#111827] font-mono placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00d48a] focus:ring-1 focus:ring-[#00d48a]"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-white border border-[#e5e7eb] rounded-[2px] px-4 py-3 text-[#111827] font-mono placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00d48a] focus:ring-1 focus:ring-[#00d48a]"
        />

        <input
          type="password"
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full bg-white border border-[#e5e7eb] rounded-[2px] px-4 py-3 text-[#111827] font-mono placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00d48a] focus:ring-1 focus:ring-[#00d48a]"
        />

        

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--brand)] text-white font-bold font-mono rounded-[2px] hover:bg-[var(--brand-hover)] transition-all disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Account →'}
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