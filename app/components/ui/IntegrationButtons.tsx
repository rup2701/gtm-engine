'use client';

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { disconnectProvider } from "@/app/(dashboard)/settings/actions";


interface IntegrationButtonsProps {
  isLinkedInConnected: boolean;
  isTwitterConnected: boolean;
  isTwitterReauthRequired: boolean;
  canDisconnectLinkedIn: boolean;
  canDisconnectTwitter: boolean;
}

export default function IntegrationButtons({
  isLinkedInConnected,
  isTwitterConnected,
  isTwitterReauthRequired,
  canDisconnectLinkedIn,
  canDisconnectTwitter,
}: IntegrationButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  
   const handleConnect = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      if (provider === "twitter" && isTwitterReauthRequired && canDisconnectTwitter) {
        await disconnectProvider("twitter");
      }
      // 🚀 Direct trigger for NextAuth's authentication handlers
      await signIn(provider, { callbackUrl: "/account?tab=connections" });
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
        } catch {
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
      } catch {
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

        {isLinkedInConnected && canDisconnectLinkedIn ? (
          <button
            onClick={handleDisconnectLinkedIn}
            disabled={isPending || loadingProvider === "linkedin"}
            className="rounded-xl px-3 py-1.5 text-xs text-red-600 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {isPending ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : isLinkedInConnected ? (
          <span className="text-xs text-gray-500">Connected by a team member</span>
        ) : (
          <button
            onClick={() => handleConnect("linkedin")}
            className="rounded-xl bg-[#0077B5] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#006396]"
          >
            Connect Account
          </button>
        )}
      </div>

      {/* LinkedIn login help stays with its connection control. */}
      {!isLinkedInConnected && (
        <div className="-mt-2 text-xs">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="font-semibold text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-gray-900"
          >
            {showHelp ? "Hide connection tips" : "Usually log into LinkedIn with Google?"}
          </button>
          
          {showHelp && (
            <div className="mt-2 rounded-xl bg-amber-50 p-3 leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-600/15">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-medium">𝕏 Twitter Channel</h4>
            <p className="text-xs text-gray-400">
              {isTwitterReauthRequired
                ? "Reconnection required"
                : isTwitterConnected
                  ? "Connected and ready"
                  : "Not connected"}
            </p>
          </div>
        </div>

        {isTwitterConnected && isTwitterReauthRequired && canDisconnectTwitter ? (
          <button
            onClick={() => handleConnect("twitter")}
            disabled={isPending || loadingProvider === "twitter"}
            className="rounded-xl bg-[#1DA1F2] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0d8ddb] disabled:opacity-50"
          >
            {loadingProvider === "twitter" ? "Reconnecting..." : "Reconnect Account"}
          </button>
        ) : isTwitterConnected && isTwitterReauthRequired ? (
          <span className="text-xs text-gray-500">Reconnect from the account owner</span>
        ) : isTwitterConnected && canDisconnectTwitter ? (
          <button
            onClick={handleDisconnectTwitter}
            disabled={isPending || loadingProvider === "twitter"}
            className="rounded-xl px-3 py-1.5 text-xs text-red-600 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {isPending ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : isTwitterConnected ? (
          <span className="text-xs text-gray-500">Connected by a team member</span>
        ) : (
          <button
            onClick={() => handleConnect("twitter")}
            className="rounded-xl bg-[#1DA1F2] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0d8ddb]"
          >
            Connect Account
          </button>
        )}
      </div>

    </div>
  );
}
