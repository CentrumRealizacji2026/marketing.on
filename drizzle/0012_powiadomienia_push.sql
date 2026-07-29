CREATE TABLE "push_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ref_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_meds" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_bills" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_training" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_learning" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_morning" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "push_evening" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "push_sends" ADD CONSTRAINT "push_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_sends_dedupe_key" ON "push_sends" USING btree ("user_id","kind","ref_key");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");