ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refresh_lock_at" timestamp;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "needs_reauth" boolean DEFAULT false NOT NULL;
