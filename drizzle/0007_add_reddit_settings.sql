ALTER TABLE "user_settings" ADD COLUMN "reddit_access_token" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reddit_subreddits" jsonb DEFAULT '[]'::jsonb;