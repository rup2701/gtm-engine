'use client';

import { useEffect, useState } from 'react';

type Tier = 'starter' | 'pro' | 'agency';

type PlanSelectionModalProps = {
  organizationId: string;
  initialTier: Tier;
};

type CheckoutConfig = {
  clientToken: string;
  environment: 'sandbox' | 'production';
  priceIds: Record<Tier, string | undefined>;
};

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (environment: 'sandbox' | 'production') => void };
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

export default function PlanSelectionModal({ organizationId, initialTier }: PlanSelectionModalProps) {
  const [selectedTier, setSelectedTier] = useState<Tier>(() => {
    if (typeof window === 'undefined') return initialTier;
    const requested = new URLSearchParams(window.location.search).get('plan');
    return requested === 'pro' || requested === 'agency' ? requested : initialTier;
  });
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetch('/api/billing/paddle/config')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load checkout.');
        setConfig(data);
      })
      .catch((checkoutError) => setError(checkoutError.message));
  }, []);

  const startTrial = () => {
    const priceId = config?.priceIds[selectedTier];
    if (!config || !priceId) {
      setError('Checkout is not configured for this plan.');
      return;
    }

    const openCheckout = () => {
      if (!window.Paddle) {
        setError('Unable to load Paddle checkout.');
        return;
      }
      window.Paddle.Environment.set(config.environment);
      window.Paddle.Initialize({
        token: config.clientToken,
        eventCallback: (event) => {
          if (
            typeof event === 'object' &&
            event !== null &&
            'name' in event &&
            event.name === 'checkout.completed'
          ) {
            setCompleted(true);
            window.setTimeout(() => window.location.reload(), 1500);
          }
        },
      });
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { organizationId },
        settings: { displayMode: 'overlay', theme: 'light' },
      });
    };

    const script = document.querySelector<HTMLScriptElement>('script[data-paddle]');
    if (script && window.Paddle) {
      openCheckout();
      return;
    }

    const paddleScript = script ?? document.createElement('script');
    if (!script) {
      paddleScript.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      paddleScript.async = true;
      paddleScript.dataset.paddle = 'true';
      document.head.appendChild(paddleScript);
    }
    paddleScript.addEventListener('load', openCheckout, { once: true });
    paddleScript.addEventListener('error', () => setError('Unable to load Paddle checkout.'), { once: true });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_24px_70px_-12px_rgba(16,24,40,0.35)]">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Choose your DispatchOS plan</h1>
          <p className="mt-2 text-sm text-gray-500">
            Start your 14-day trial. A payment method is required, and you can cancel before the trial ends.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/15">{error}</div>
        )}
        {completed && (
          <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
            Trial confirmed. Setting up your workspace...
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <button
              key={plan.tier}
              type="button"
              onClick={() => setSelectedTier(plan.tier)}
              className={`flex min-h-[21rem] flex-col rounded-2xl bg-white p-5 text-left ring-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition ${
                selectedTier === plan.tier
                  ? 'ring-emerald-600/40'
                  : plan.tier === 'pro'
                    ? 'ring-emerald-500/40'
                    : 'ring-black/5 hover:bg-zinc-50'
              }`}
            >
              {plan.tier === 'pro' && (
                <span className="mb-3 w-fit rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                  Recommended
                </span>
              )}
              <span className="block text-base font-semibold text-gray-900">{plan.name}</span>
              <span className="mt-3 block text-3xl font-bold tracking-tight text-gray-900">
                {plan.price}<span className="ml-1 text-sm font-normal text-gray-500">/ month</span>
              </span>
              <span className="mt-1 block text-sm font-medium text-emerald-700">{plan.products}</span>
              <span className="mt-4 block text-sm text-gray-500">{plan.description}</span>
              <span className="mt-5 block flex-1 space-y-2 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <span key={feature} className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden>✓</span>
                    {feature}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={startTrial}
            disabled={!config || completed}
            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completed ? 'Finalizing...' : config ? `Start ${plans.find((plan) => plan.tier === selectedTier)?.name} trial` : 'Loading checkout...'}
          </button>
        </div>
      </section>
    </div>
  );
}
