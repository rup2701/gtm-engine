CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_hash" varchar(64) NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"post_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"day_of_week" varchar(10) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"category" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"hook" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"edited_by_user" boolean DEFAULT false,
	"original_content" text,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"engagement_rate" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_url" text,
	"icp_description" text,
	"tone_instructions" text,
	"posting_frequency" jsonb DEFAULT '{"postsPerDay":3,"daysPerWeek":5}'::jsonb,
	"categories" jsonb DEFAULT '["design","engineering","ux","marketing","launch","build"]'::jsonb,
	"last_scraped_at" timestamp,
	"context_hash" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_idx" ON "posts" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE INDEX "batch_idx" ON "posts" USING btree ("batch_id");