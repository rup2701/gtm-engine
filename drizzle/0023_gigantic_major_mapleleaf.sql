ALTER TABLE "subscriptions" RENAME COLUMN "stripe_id" TO "billing_provider";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'trialing';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_price_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "canceled_at" timestamp;