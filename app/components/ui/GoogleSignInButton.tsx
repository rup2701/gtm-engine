'use client';

import { signIn } from "next-auth/react";

export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="flex w-full max-w-sm items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50"
    >
      {/* Official Google G Logo Icon */}
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#EA4335"
          d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.27 2.69 1.305 6.61l3.96 3.155z"
        />
        <path
          fill="#4285F4"
          d="M23.49 12.275c0-.825-.075-1.62-.21-2.385H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.54l3.68 2.855c2.15-1.98 3.39-4.89 3.39-8.52z"
        />
        <path
          fill="#FBBC05"
          d="M5.266 14.235L1.305 17.39C3.27 21.31 7.33 24 12 24c3.155 0 5.805-1.05 7.74-2.85l-3.68-2.855c-1.07.72-2.43 1.15-4.06 1.15-4.14 0-7.64-2.8-8.89-6.575z"
        />
        <path
          fill="#34A853"
          d="M12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.27 2.69 1.305 6.61l3.96 3.155A7.033 7.033 0 0 1 12 4.909z"
        />
      </svg>
      <span>Continue with Google</span>
    </button>
  );
}
