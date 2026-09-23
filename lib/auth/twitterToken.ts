// Centralized, race-safe Twitter/X access-token retrieval.
//
// X rotates the OAuth2 refresh_token on every use: the instant a new
// access/refresh token pair is issued, the old refresh_token is dead.
// If two callers (a manual "Fire Now", a metrics sync, a background
// queue worker) both read the same expired token and try to refresh
// concurrently, only one succeeds — the other gets a permanent-looking
// "invalid_parameter" error even though nothing is actually wrong with
// the connection.
//
// This helper removes the human from the loop by using an atomic
// compare-and-swap on the accounts row: a refresh attempt only proceeds
// if it can claim the row by matching the access_token it read. Losing
// the race simply means someone else already refreshed (or is about
// to) — we back off briefly and reuse whatever token is now current.
//
// A refresh is only treated as "needs reconnect" when Twitter itself
// rejects the refresh_token (a truly dead/revoked grant), never when
// it's just a losing race.
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import refreshTwitterToken from '@/lib/utils/refreshTwitterToken';

const EXPIRY_MARGIN_SECONDS = 120;
const MAX_CLAIM_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 300;

export class TwitterReauthRequiredError extends Error {}
export class TwitterRefreshPendingError extends Error {}

function isExpired(expiresAt: number | null, nowSec: number): boolean {
  return !expiresAt || nowSec >= expiresAt - EXPIRY_MARGIN_SECONDS;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getValidTwitterAccessToken(userId: string): Promise<string> {
  let [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'twitter')))
    .limit(1);

  if (!account?.access_token) {
    throw new TwitterReauthRequiredError('X is not connected for this account.');
  }
  if (account.needsReauth) {
    throw new TwitterReauthRequiredError(
      'Your X connection has expired. Please disconnect and reconnect X in Settings.'
    );
  }

  const nowSec = () => Math.floor(Date.now() / 1000);
  if (!isExpired(account.expires_at, nowSec())) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new TwitterReauthRequiredError(
      'Your X connection has expired. Please disconnect and reconnect X in Settings.'
    );
  }

  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    // Compare-and-swap: only the caller that still sees this exact
    // access_token wins the claim. Whoever refreshes first changes the
    // access_token, so every later attempt naturally loses the race
    // instead of also calling Twitter with the same doomed refresh_token.
    const claimed = await db
      .update(accounts)
      .set({ refreshLockAt: new Date() })
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, 'twitter'),
          eq(accounts.access_token, account.access_token)
        )
      )
      .returning({ refreshToken: accounts.refresh_token });

    if (claimed.length > 0 && claimed[0].refreshToken) {
      try {
        const newTokens = await refreshTwitterToken(claimed[0].refreshToken);
        const newExpiresAt = nowSec() + newTokens.expires_in;

        await db
          .update(accounts)
          .set({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token ?? claimed[0].refreshToken,
            expires_at: newExpiresAt,
            refreshLockAt: null,
            needsReauth: false,
          })
          .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'twitter')));

        return newTokens.access_token;
      } catch (refreshError) {
        // Twitter itself rejected the refresh_token — this is a real
        // dead connection, not a race. Flag it so we stop retrying
        // silently and surface a clear reconnect prompt.
        console.error('[Twitter token] Refresh rejected by provider:', refreshError);
        await db
          .update(accounts)
          .set({ refreshLockAt: null, needsReauth: true })
          .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'twitter')));

        throw new TwitterReauthRequiredError(
          'Your X connection has expired. Please disconnect and reconnect X in Settings.'
        );
      }
    }

    // Lost the race — someone else refreshed (or is refreshing). Back
    // off and re-read the row; reuse it if it's valid now.
    await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
    [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'twitter')))
      .limit(1);

    if (!account?.access_token) {
      throw new TwitterReauthRequiredError('X is not connected for this account.');
    }
    if (account.needsReauth) {
      throw new TwitterReauthRequiredError(
        'Your X connection has expired. Please disconnect and reconnect X in Settings.'
      );
    }
    if (!isExpired(account.expires_at, nowSec())) {
      return account.access_token;
    }
  }

  // Another caller is still mid-refresh after all our retries — this is
  // transient, not a dead connection. Callers (especially background
  // jobs) should retry rather than surface a reconnect prompt.
  throw new TwitterRefreshPendingError(
    'X token refresh is already in progress. Please retry shortly.'
  );
}
