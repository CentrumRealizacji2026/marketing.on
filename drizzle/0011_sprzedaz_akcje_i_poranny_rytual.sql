ALTER TABLE "daily_logs" ADD COLUMN "morning_intention" text;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "morning_mood" integer;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "morning_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "next_action_date" date;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "touched_at" timestamp with time zone;