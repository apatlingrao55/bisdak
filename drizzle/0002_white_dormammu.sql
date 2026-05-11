CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"route" text NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limits_ip_route_ts_idx" ON "rate_limits" ("ip", "route", "ts");
