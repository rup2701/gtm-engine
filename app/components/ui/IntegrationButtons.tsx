'use client';

import { useState, useTransition, MouseEvent } from "react";
import { signIn } from "next-auth/react";
import { disconnectProvider } from "@/app/(dashboard)/settings/actions";


interface IntegrationButtonsProps {
  isLinkedInConnected: boolean;
  isTwitterConnected: boolean;
  isDiscordConnected: boolean;
  isBlueSkyConnected: boolean;
}

export default function IntegrationButtons({ isLinkedInConnected, isTwitterConnected}: IntegrationButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  
   const handleConnect = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      // 🚀 Direct trigger for NextAuth's authentication handlers
      await signIn(provider, { callbackUrl: "/settings" });
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
      setLoadingProvider(null);
    }
  };

  const handleDisconnectLinkedIn = () => {
    if (confirm("Are you sure you want to disconnect your LinkedIn account? Your scheduled posts for this channel will not go out.")) {
      // Execute the server action smoothly inside a transition
      startTransition(async () => {
        try {
          await disconnectProvider("linkedin");
        } catch (error) {
          alert("Failed to disconnect account. Please try again.");
        }
      });
    }
  };

  const handleDisconnectTwitter = (): void => {
    setLoadingProvider("twitter");
    startTransition(async () => {
      try {
        await disconnectProvider("twitter");
      } catch (error) {
        alert("Failed to disconnect account. Please try again.");
      } finally {
        setLoadingProvider(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">

          <div>
            <p className="font-medium text-lg">LinkedIn Profile</p>
            <p className="text-xs text-gray-400">
              {isLinkedInConnected ? "Connected and ready" : "Not connected"}
            </p>
          </div>
        </div>

        {isLinkedInConnected ? (
          <button
            onClick={handleDisconnectLinkedIn}
            disabled={isPending || loadingProvider === "linkedin"}
            className="border border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={() => handleConnect("linkedin")}
            className="bg-[#0077B5] hover:bg-[#006396] text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            Connect Account
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-medium">𝕏 Twitter Channel</h4>
            <p className="text-xs text-gray-400">
              {isTwitterConnected  ? "Connected and ready" : "Not connected"}
            </p>
          </div>
        </div>

        {isTwitterConnected ? (
          <button
            onClick={handleDisconnectTwitter}
            disabled={isPending || loadingProvider === "twitter"}
            className="border border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={() => handleConnect("twitter")}
            className="bg-[#1DA1F2] hover:bg-[#0d8ddb] text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            Connect Account
          </button>
        )}
      </div>

      {/* Pre-emptive help text block */}
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
                LinkedIn often hides its Sign in with Google button on external connection screens. If your LinkedIn account doesn&apos;t have a regular password, you will get stuck.
              </p>
              <p className="font-semibold mb-1">To fix this before connecting:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Go to LinkedIn&apos;s main login page in a separate tab (log out if needed).</li>
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
