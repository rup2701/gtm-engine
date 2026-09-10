ALTER TABLE "batches" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "batches" SET "user_id" = '6B748737-E65C-4347-8471-9A2F0E74CFBD' WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "posts" SET "user_id" = '6B748737-E65C-4347-8471-9A2F0E74CFBD' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;