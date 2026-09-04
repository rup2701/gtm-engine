import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean, index, integer, real } from 'drizzle-orm/pg-core';

export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  contextHash: varchar('context_hash', { length: 64 }).notNull(), // For version control (Point 8)
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  postCount: integer('post_count').default(0),
  status: varchar('status', { length: 20 }).default('draft'), // draft, approved, archived
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').references(() => batches.id).notNull(),
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at').notNull(),
  dayOfWeek: varchar('day_of_week', { length: 10 }).notNull(), // Monday, Tuesday...
  
  // Content
  platform: varchar('platform', { length: 20 }).notNull(), // twitter, linkedin, reddit
  category: varchar('category', { length: 20 }).notNull(), // design, engineering, etc.
  content: text('content').notNull(),
  hook: text('hook'), // First line for preview cards
  
  // Status & Editing
  status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, queued, published, failed
  editedByUser: boolean('edited_by_user').default(false),
  originalContent: text('original_content'), // Store pre-edit version for diff
  
  // Performance (Point 4 future-proofing)
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  engagementRate: real('engagement_rate').default(0),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  scheduledIdx: index('scheduled_idx').on(table.scheduledAt, table.status),
  batchIdx: index('batch_idx').on(table.batchId),
}));

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