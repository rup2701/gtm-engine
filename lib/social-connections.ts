import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import { accounts, users } from '@/db/schema';
import {
  getValidTwitterAccessToken,
  TwitterReauthRequiredError,
} from '@/lib/auth/twitterToken';

export type SocialProvider = 'linkedin' | 'twitter';

export async function getOrganizationSocialAccount(
  organizationId: string,
  provider: SocialProvider,
) {
  const [result] = await db
    .select({ account: accounts })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(accounts.provider, provider),
        isNotNull(accounts.access_token),
        ne(accounts.access_token, ''),
      ),
    )
    .limit(1);

  return result?.account ?? null;
}

export async function getOrganizationTwitterAccessToken(
  organizationId: string,
): Promise<string> {
  const account = await getOrganizationSocialAccount(organizationId, 'twitter');
  if (!account) {
    throw new TwitterReauthRequiredError('X is not connected for this organization.');
  }

  return getValidTwitterAccessToken(account.userId);
}