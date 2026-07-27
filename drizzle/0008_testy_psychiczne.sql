CREATE TABLE "mental_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"test" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mental_assessments" ADD CONSTRAINT "mental_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mental_assessments_key" ON "mental_assessments" USING btree ("user_id","date","test");--> statement-breakpoint
CREATE INDEX "mental_assessments_user_idx" ON "mental_assessments" USING btree ("user_id","test","date");