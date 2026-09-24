import { pgTable, uuid, varchar, text, timestamp, boolean, integer, real, jsonb, json, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from "next-auth/adapters";

// --- Your Existing Users Table (Updated to support NextAuth fields) ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 100 }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // NextAuth expects these optional fields for OAuth profiles:
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'), 
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- New Table: NextAuth Accounts (Crucial for Account Linking) ---
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(), // "google", "linkedin"
    providerAccountId: text("provider_account_id").notNull(), // LinkedIn's ID    

    id_token: text("id_token"),
    session_state: text("session_state"),

    // 🔐 CRITICAL FIELDS FOR TWITTER OAUTH 2.0:
    access_token: text("access_token"),
    refresh_token: text("refresh_token"),
    expires_at: integer("expires_at"), // Unix timestamp of expiration
    token_type: text("token_type"),
    scope: text("scope"),

    // Race-safe refresh: claimed atomically so concurrent callers can't
    // both consume the same rotating refresh_token (Twitter invalidates
    // the old one the instant a new one is issued).
    refreshLockAt: timestamp("refresh_lock_at"),
    // Set when a refresh attempt is rejected by the provider (dead/revoked
    // token) rather than a transient/race failure — this is the only case
    // that genuinely requires the user to reconnect.
    needsReauth: boolean("needs_reauth").default(false).notNull(),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    }
  ]
);

// --- New Table: NextAuth Sessions ---
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// --- New Table: NextAuth Verification Tokens (For passwordless magic links if needed) ---
export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    {
      compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    }
  ]
);


export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contextHash: varchar('context_hash', { length: 64 }).notNull(),
  weekKey: varchar('week_key', { length: 10 }), // ✅ added
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  postCount: integer('post_count').default(0),
  status: varchar('status', { length: 20 }).default('draft'),
});

// 1. Define the table
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  batchId: uuid('batch_id').references(() => batches.id).notNull(),
  
  // 🎯 FIX: Force Drizzle and PostgreSQL to explicitly store the timezone offset
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  dayOfWeek: varchar('day_of_week', { length: 10 }).notNull(),
  
  platform: varchar('platform', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  
  content: text('content').notNull(),
  editedContent: text('edited_content'),
  hook: text('hook'),
  
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  publishedAt: timestamp('published_at'),
  editedByUser: boolean('edited_by_user').default(false),
  originalContent: text('original_content'),
  
  contextHash: varchar('context_hash', { length: 64 }),
  weekKey: varchar('week_key', { length: 10 }),
  
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  engagementRate: real('engagement_rate').default(0),
  analytics: jsonb('analytics').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Define indexes separately using the table reference
// export const scheduledIdx = index('scheduled_idx')
//   .on(posts.scheduledAt, posts.status);

// export const batchIdx = index('batch_idx')
//   .on(posts.batchId);

// export const contextIdx = index('context_idx')
//   .on(posts.contextHash);

// export const weekIdx = index('week_idx')
//   .on(posts.weekKey);


export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  timezone: varchar('timezone', { length: 100 }).default('UTC').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  tier: varchar('tier', { length: 20 }).notNull(), // starter, pro, agency
  productLimit: integer('product_limit').notNull(), // 1, 3, 999
  ragLimit: integer('rag_limit').notNull(), // 1, 10, 999
  status: varchar('status', { length: 20 }).default('trialing').notNull(), // trialing, active, canceled, expired, past_due, pending, early_access
  billingProvider: varchar('billing_provider', { length: 20 }).default('paddle').notNull(),
  billingCustomerId: varchar('billing_customer_id', { length: 255 }),
  billingSubscriptionId: varchar('billing_subscription_id', { length: 255 }),
  billingPriceId: varchar('billing_price_id', { length: 255 }),
  trialEndsAt: timestamp('trial_ends_at'),
  earlyAccessEndsAt: timestamp('early_access_ends_at'), // EARLY20: 90 free days, tracked separately from a Paddle trial
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('subscriptions_organization_id_unique').on(table.organizationId),
]);

// Singleton counter for the EARLY20 promo. Claiming is a single atomic
// UPDATE ... WHERE claimed < limit_count, so concurrent claims can never
// oversell the cap (same compare-and-swap principle as the Twitter token fix).
export const earlyAccessCounter = pgTable('early_access_counter', {
  id: integer('id').primaryKey().default(1),
  claimed: integer('claimed').default(0).notNull(),
  limitCount: integer('limit_count').default(20).notNull(),
});

// Audit trail + guard against the same organization claiming twice.
export const earlyAccessClaims = pgTable('early_access_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull()
    .unique(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
});

export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  email: varchar('email', { length: 255 }).notNull(),
  requestedTier: varchar('requested_tier', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const userConfig = pgTable('user_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  websiteUrl: text('website_url'),
  icpDescription: text('icp_description'),
  toneInstructions: text('tone_instructions'),
  postingFrequency: jsonb('posting_frequency').default({ postsPerDay: 3, daysPerWeek: 5 }),
  categories: jsonb('categories').default(['design', 'engineering', 'ux', 'marketing', 'launch', 'build']),
  lastScrapedAt: timestamp('last_scraped_at'),
  contextHash: varchar('context_hash', { length: 64 }),
});


export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Social tokens (encrypted)
  twitterBearerToken: text('twitter_bearer_token'),
  twitterAccessToken: text('twitter_access_token'),
  twitterRefreshToken: text('twitter_refresh_token'),
  linkedinAccessToken: text('linkedin_access_token'),
  linkedinPersonId: text('linkedin_person_id'),
  linkedinRefreshToken: text('linkedin_refresh_token'),
  linkedinExpiresAt: timestamp('linkedin_expires_at'),
  redditAccessToken: text('reddit_access_token'),
  redditSubreddits: jsonb('reddit_subreddits').$type<string[]>().default([]),
  discordWebhookUrl: text('discord_webhook_url'),
  
  // User context
  tone: text('tone').default('authoritative'),
  icp: text('icp'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  name: varchar('name', { length: 100 }).notNull(),
  website: varchar('website', { length: 255 }),
  description: text('description'),
  icp: text('icp'),
  tone: text('tone'),
  categories: text('categories'), // JSON array
  frequencyMin: integer('frequency_min').default(3),
  frequencyMax: integer('frequency_max').default(5),
  publishTimes: json('publish_times').default(['09:00', '13:00', '17:00']),
  platforms: jsonb('platforms').$type<string[]>().default([]),
  autoPublish: boolean('auto_publish').default(true),
  lastScrapedAt: timestamp('last_scraped_at'),
  scrapedRootUrl: text('scraped_root_url'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scrapedContent = pgTable('scraped_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  url: text('url').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});