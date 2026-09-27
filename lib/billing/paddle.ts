import crypto from 'crypto';

export const PADDLE_PLANS = {
  starter: { productLimit: 1, ragLimit: 1 },
  pro: { productLimit: 3, ragLimit: 10 },
  agency: { productLimit: 5, ragLimit: 999 },
} as const;

export type PaddleTier = keyof typeof PADDLE_PLANS;

export type PaddleEnvironment = 'sandbox' | 'production';

export function getPaddleEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENV === 'production' ? 'production' : 'sandbox';
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getPaddlePriceIds(): Record<PaddleTier, string | undefined> {
  if (getPaddleEnvironment() === 'production') {
    return {
      starter: envValue('PADDLE_LIVE_STARTER_PRICE_ID'),
      pro: envValue('PADDLE_LIVE_PRO_PRICE_ID'),
      agency: envValue('PADDLE_LIVE_AGENCY_PRICE_ID'),
    };
  }

  return {
    starter: envValue('PADDLE_SANDBOX_STARTER_PRICE_ID') ?? envValue('PADDLE_STARTER_PRICE_ID'),
    pro: envValue('PADDLE_SANDBOX_PRO_PRICE_ID') ?? envValue('PADDLE_PRO_PRICE_ID'),
    agency: envValue('PADDLE_SANDBOX_AGENCY_PRICE_ID') ?? envValue('PADDLE_AGENCY_PRICE_ID'),
  };
}

export function getPaddleClientToken(): string | undefined {
  return getPaddleEnvironment() === 'production'
    ? envValue('PADDLE_LIVE_CLIENT_TOKEN')
    : envValue('PADDLE_SANDBOX_CLIENT_TOKEN') ?? envValue('PADDLE_CLIENT_TOKEN');
}

export function getPaddleApiKey(): string | undefined {
  return getPaddleEnvironment() === 'production'
    ? envValue('PADDLE_LIVE_API_KEY')
    : envValue('PADDLE_SANDBOX_API_KEY');
}

export function getPaddleWebhookSecret(): string | undefined {
  return getPaddleEnvironment() === 'production'
    ? envValue('PADDLE_LIVE_WEBHOOK_SECRET')
    : envValue('PADDLE_SANDBOX_WEBHOOK_SECRET') ?? envValue('PADDLE_WEBHOOK_SECRET');
}

export function getPaddleApiBaseUrl(): string {
  return getPaddleEnvironment() === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}

export function tierFromPriceId(priceId: string | undefined): PaddleTier | null {
  if (!priceId) return null;
  const prices = getPaddlePriceIds();
  const mapping: Record<string, PaddleTier | undefined> = {
    [prices.starter ?? '']: 'starter',
    [prices.pro ?? '']: 'pro',
    [prices.agency ?? '']: 'agency',
  };
  return mapping[priceId] ?? null;
}

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const values = Object.fromEntries(
    signatureHeader.split(';').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );
  if (!values.ts || !values.h1) return false;

  const signedPayload = `${values.ts}:${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  const actual = Buffer.from(values.h1, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export function paddleDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}