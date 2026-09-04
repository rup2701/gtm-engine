DROP INDEX "scheduled_idx";--> statement-breakpoint
DROP INDEX "batch_idx";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "context_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "week_key" varchar(10);