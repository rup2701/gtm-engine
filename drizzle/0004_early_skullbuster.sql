CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"twitter_bearer_token" text,
	"twitter_access_token" text,
	"twitter_refresh_token" text,
	"linkedin_access_token" text,
	"discord_webhook_url" text,
	"frequency_min" integer DEFAULT 3,
	"frequency_max" integer DEFAULT 5,
	"publish_times" json DEFAULT '["09:00","13:00","17:00"]'::json,
	"auto_publish" boolean DEFAULT true,
	"tone" text DEFAULT 'authoritative',
	"icp" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
