'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (environment: 'sandbox' | 'production') => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: unknown) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customData: { organizationId: string };
          settings?: { displayMode?: 'overlay' | 'inline'; theme?: 'light' | 'dark' };
        }) => void;
      };
    };
  }
}

type Tier = 'starter' | 'pro' | 'agency';

type BillingPlansProps = {
  organizationId: string;
  currentTier: string;
  currentStatus: string;
  billingSubscriptionId?: string | null;
  clientToken?: string;
  priceIds: Record<Tier, string | undefined>;
};

const plans: Array<{
  tier: Tier;
  name: string;
  price: string;
  products: string;
  description: string;
  features: string[];
}> = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$29',
    products: '1 product',
    description: 'The focused starting point for a consistent content practice.',
    features: ['Weekly content generation', 'Analytics feedback loop', 'Human review calendar'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$59',
    products: 'Up to 3 products',
    description: 'For builders shipping weekly who want the full feedback loop.',
    features: ['Everything in Starter', 'Threads and content variants', 'Higher generation limits'],
  },
  {
    tier: 'agency',
    name: 'Agency',
    price: '$129',
    products: 'Up to 5 products',
    description: 'For teams managing content across several brands or clients.',
    features: ['Everything in Pro', 'Five product workspaces', 'Priority capacity as it grows'],
  },
];

export function BillingPlans({
  organizationId,
  currentTier,
  currentStatus,
  billingSubscriptionId,
  clientToken,
  priceIds,
}: BillingPlansProps) {
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const currentIndex = plans.findIndex((plan) => plan.tier === currentTier);
  const upgradePlans = plans.filter((_, index) => index > currentIndex);

  useEffect(() => {
    const initialize = () => {
      if (!clientToken || !window.Paddle) {
        setCheckoutError('Paddle checkout is not configured yet.');
        return;
      }
      window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (event) => {
          console.info('[Paddle]', event);
        },
      });
      setCheckoutReady(true);
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-paddle]');
    if (existingScript) {
      if (window.Paddle) initialize();
      else existingScript.addEventListener('load', initialize, { once: true });
      return () => existingScript.removeEventListener('load', initialize);
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.dataset.paddle = 'true';
    script.onload = initialize;
    script.onerror = () => setCheckoutError('Unable to load checkout. Please try again.');
    document.head.appendChild(script);
  }, [clientToken]);

  const openCheckout = (tier: Tier) => {
    setCheckoutError(null);
    setSelectedTier(tier);
    const priceId = priceIds[tier];

    if (!priceId || !window.Paddle || !checkoutReady) {
      setCheckoutError('This plan is not ready for checkout yet.');
      setSelectedTier(null);
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { organizationId },
      settings: { displayMode: 'overlay', theme: 'light' },
    });
    setSelectedTier(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upgrade your DispatchOS plan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Move up when you need more products, repurposing, or generation capacity.
        </p>
      </div>

      {checkoutError && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/15">
          {checkoutError}
        </div>
      )}

      {cancelMessage && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
          {cancelMessage}
        </div>
      )}

      {upgradePlans.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {upgradePlans.map((plan) => {
          return (
            <article
              key={plan.tier}
              className={`flex flex-col rounded-2xl bg-white p-5 ring-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                plan.tier === 'pro' ? 'ring-emerald-500/40' : 'ring-black/5'
              }`}
            >
              {plan.tier === 'pro' && (
                <span className="mb-3 w-fit rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                  Recommended
                </span>
              )}
              <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500">/ month</span>
              </div>
              <p className="mt-1 text-sm font-medium text-emerald-700">{plan.products}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openCheckout(plan.tier)}
                disabled={selectedTier === plan.tier || !checkoutReady}
                className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  plan.tier === 'pro'
                    ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                }`}
              >
                {selectedTier === plan.tier
                    ? 'Opening checkout...'
                    : checkoutReady
                      ? `Upgrade to ${plan.name}`
                      : 'Loading checkout...'}
              </button>
            </article>
          );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 ring-1 ring-black/5">
          You are on the highest available plan.
        </div>
      )}

      {billingSubscriptionId && currentStatus !== 'canceled' && (
        <div className="border-t border-black/5 pt-5">
          <button
            type="button"
            disabled={canceling}
            onClick={async () => {
              setCanceling(true);
              setCheckoutError(null);
              try {
                const response = await fetch('/api/billing/paddle/cancel', {
                  method: 'POST',
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to cancel subscription.');
                setCancelMessage('Your subscription is scheduled to cancel at the end of the current billing period.');
              } catch (error) {
                setCheckoutError(error instanceof Error ? error.message : 'Unable to cancel subscription.');
              } finally {
                setCanceling(false);
              }
            }}
            className="text-sm font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-red-600"
          >
            {canceling ? 'Scheduling cancellation...' : 'Cancel subscription'}
          </button>
        </div>
      )}
    </div>
  );
}
