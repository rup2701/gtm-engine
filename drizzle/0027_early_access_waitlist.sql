ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "early_access_ends_at" timestamp;

CREATE TABLE IF NOT EXISTS "early_access_counter" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "claimed" integer NOT NULL DEFAULT 0,
  "limit_count" integer NOT NULL DEFAULT 20
);
INSERT INTO "early_access_counter" ("id", "claimed", "limit_count")
VALUES (1, 0, 20)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "early_access_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id"),
  "claimed_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "email" varchar(255) NOT NULL,
  "requested_tier" varchar(20),
  "created_at" timestamp NOT NULL DEFAULT now()
);
