'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

interface IntegrationButtonsProps {
  isLinkedInConnected: boolean;
}

export default function IntegrationButtons({ isLinkedInConnected }: IntegrationButtonsProps) {
  const [showHelp, setShowHelp] = useState(false);
  
  const handleConnectLinkedIn = () => {
    signIn("linkedin", { callbackUrl: "/dashboard/settings" });
  };

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💼</span>
          <div>
            <p className="font-medium text-sm">LinkedIn Context</p>
            <p className="text-xs text-gray-400">
              {isLinkedInConnected ? "Connected and ready" : "Not connected"}
            </p>
          </div>
        </div>

        {!isLinkedInConnected && (
          <button
            onClick={handleConnectLinkedIn}
            className="bg-[#0077B5] hover:bg-[#006396] text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            Connect Account
          </button>
        )}
      </div>

      {/* 💡 Pre-emptive help text for users before they leave your site */}
      {!isLinkedInConnected && (
        <div className="text-xs">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-gray-600 underline"
          >
            {showHelp ? "Hide connection tips" : "Usually log into LinkedIn with Google?"}
          </button>
          
          {showHelp && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 leading-relaxed">
              <p className="font-semibold mb-1">Important Note:</p>
              <p className="mb-2">
                LinkedIn often hides its "Sign in with Google" button on external connection screens. If your LinkedIn account doesn't have a regular password, you will get stuck.
              </p>
              <p className="font-semibold mb-1">To fix this before connecting:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Go to LinkedIn's main login page in a separate tab (log out if needed).</li>
                <li>Click <strong>Forgot password?</strong> to assign a native password to your email.</li>
                <li>Come back here, click Connect, and type that password manually.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
