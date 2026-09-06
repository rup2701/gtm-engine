import { pgTable, uuid, varchar, text, timestamp, boolean, integer, real, jsonb, json } from 'drizzle-orm/pg-core';

export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  contextHash: varchar('context_hash', { length: 64 }).notNull(),
  weekKey: varchar('week_key', { length: 10 }), // ✅ added
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  postCount: integer('post_count').default(0),
  status: varchar('status', { length: 20 }).default('draft'),
});

// 1. Define the table
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').references(() => batches.id).notNull(),
  
  scheduledAt: timestamp('scheduled_at').notNull(),
  dayOfWeek: varchar('day_of_week', { length: 10 }).notNull(),
  
  platform: varchar('platform', { length: 20 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
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


// db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

// db/schema.ts
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  
  // Social tokens (encrypted)
  twitterBearerToken: text('twitter_bearer_token'),
  twitterAccessToken: text('twitter_access_token'),
  twitterRefreshToken: text('twitter_refresh_token'),
  linkedinAccessToken: text('linkedin_access_token'),
  discordWebhookUrl: text('discord_webhook_url'),
  
  // Publishing rules
  frequencyMin: integer('frequency_min').default(3),
  frequencyMax: integer('frequency_max').default(5),
  publishTimes: json('publish_times').default(['09:00', '13:00', '17:00']),
  autoPublish: boolean('auto_publish').default(true),
  
  // User context
  tone: text('tone').default('authoritative'),
  icp: text('icp'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});