UPDATE "subscriptions"
SET "billing_provider" = 'paddle'
WHERE "billing_provider" IS NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions"
ALTER COLUMN "billing_provider" SET DEFAULT 'paddle';
--> statement-breakpoint
ALTER TABLE "subscriptions"
ALTER COLUMN "billing_provider" SET NOT NULL;