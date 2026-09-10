ALTER TABLE "products" ADD COLUMN "frequency_min" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "frequency_max" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publish_times" json DEFAULT '["09:00","13:00","17:00"]'::json;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "platforms" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "auto_publish" boolean DEFAULT true;--> statement-breakpoint
UPDATE "products" AS p
SET
	"frequency_min" = settings."frequency_min",
	"frequency_max" = settings."frequency_max",
	"publish_times" = settings."publish_times",
	"platforms" = settings."platforms",
	"auto_publish" = settings."auto_publish"
FROM (
	SELECT DISTINCT ON (u."organization_id")
		u."organization_id",
		us."frequency_min",
		us."frequency_max",
		us."publish_times",
		us."platforms",
		us."auto_publish"
	FROM "users" AS u
	INNER JOIN "user_settings" AS us ON us."user_id" = u."id"
	WHERE u."organization_id" IS NOT NULL
	ORDER BY u."organization_id", us."updated_at" DESC NULLS LAST
) AS settings
WHERE p."organization_id" = settings."organization_id";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "frequency_min";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "frequency_max";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "publish_times";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "platforms";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "auto_publish";