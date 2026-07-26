ALTER TABLE "daily_logs" ADD COLUMN "stress" integer;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "thoughts" text;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "good_things" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weight_target_date" date;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weight_start_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "weight_start_date" date;