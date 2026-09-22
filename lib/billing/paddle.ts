import crypto from 'crypto';

export const PADDLE_PLANS = {
  starter: { productLimit: 1, ragLimit: 1 },
  pro: { productLimit: 3, ragLimit: 10 },
  agency: { productLimit: 5, ragLimit: 999 },
} as const;

export type PaddleTier = keyof typeof PADDLE_PLANS;

export function tierFromPriceId(priceId: string | undefined): PaddleTier | null {
  if (!priceId) return null;
  const mapping: Record<string, PaddleTier | undefined> = {
    [process.env.PADDLE_STARTER_PRICE_ID ?? '']: 'starter',
    [process.env.PADDLE_PRO_PRICE_ID ?? '']: 'pro',
    [process.env.PADDLE_AGENCY_PRICE_ID ?? '']: 'agency',
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