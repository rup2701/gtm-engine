import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import LinkedIn from 'next-auth/providers/linkedin';
import Google from 'next-auth/providers/google';
import TwitterProvider from 'next-auth/providers/twitter';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, organizations, subscriptions, accounts, sessions, verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DrizzleAdapter } from '@auth/drizzle-adapter';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 1. Hook up the adapter to manage core user/account tracking automatically
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  providers: [
    // Google Auth
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true, // Safe bridging across verified providers
    }),
    // LinkedIn Auth
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID!,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'openid profile email w_member_social',
          prompt: 'login',
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read tweet.write users.read offline.access",
        },
      },
    }),
// ...existing code...
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  
  // 2. Automate secondary initialization (Org, Settings, Subs) when a brand new user joins via OAuth
  events: {
    async createUser({ user }) {
      const userId = user.id!;
      const email = user.email!;

      // 1. 🛡️ Check if this user already has an active organization assigned in Neon
      const [existingUser] = await db
        .select({ organizationId: users.organizationId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // If an organizationId is already present, this is an account-linking flow!
      // Exit immediately to protect their existing organization association.
      if (existingUser?.organizationId) {
        console.log(`[Auth Event] User ${userId} already associated with organization ${existingUser.organizationId}. Skipping provisioning.`);
        return;
      }

      // 2. Otherwise, this is a truly brand-new signup. Safe to provision:
      const organizationId = crypto.randomUUID();

      // Create Organization
      await db.insert(organizations).values({
        id: organizationId,
        name: user.name || email.split('@')[0],
        slug: email.split('@')[0] + '-' + Date.now(),
      });

      // Update User to reference their new Organization
      await db
        .update(users)
        .set({ organizationId })
        .where(eq(users.id, userId));

      // New OAuth users select and confirm a plan after reaching the dashboard.
      await db.insert(subscriptions).values({
        organizationId,
        tier: 'starter',
        productLimit: 1,
        ragLimit: 1,
        status: 'pending',
        billingProvider: 'paddle',
      });
    }
  },

  callbacks: {
    // Adapter handles account bridging on signIn. We just allow access.
    async signIn() {
      return true;
    },

    async jwt({ token, user, trigger }) {
      // On initial login, pull data from user record into the JWT
      if (user) {
        token.id = user.id;
        token.organizationId = (user as any).organizationId;
      }
      
      // Fallback: If user isn't present during standard session checks, fetch organizationId from DB
      if (token.id && !token.organizationId) {
        const [dbUser] = await db
          .select({ organizationId: users.organizationId })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (dbUser) {
          token.organizationId = dbUser.organizationId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export async function getCurrentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCurrentOrgId() {
  const session = await auth();
  return session?.user?.organizationId ?? null;
}