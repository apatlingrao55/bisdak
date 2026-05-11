CREATE TABLE IF NOT EXISTS "email_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"used" boolean DEFAULT false,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"employment_type" text NOT NULL,
	"apply_url" text,
	"apply_email" text,
	"salary" text,
	"status" text DEFAULT 'open' NOT NULL,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "video_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_status_expires_idx" ON "jobs" ("status", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_business_idx" ON "jobs" ("business_id");
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_apply_method_check"
  CHECK (
    (apply_url IS NOT NULL AND apply_email IS NULL)
    OR (apply_url IS NULL AND apply_email IS NOT NULL)
  );