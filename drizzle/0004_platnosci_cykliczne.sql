CREATE TABLE "obligation_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"paid_on" date,
	"amount_pln" numeric(12, 2),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_pln" numeric(12, 2) NOT NULL,
	"category" text,
	"cadence" text DEFAULT 'miesiecznie' NOT NULL,
	"first_due_date" date NOT NULL,
	"end_date" date,
	"note" text,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_payments_due_key" ON "obligation_payments" USING btree ("obligation_id","due_date");--> statement-breakpoint
CREATE INDEX "obligation_payments_user_due_idx" ON "obligation_payments" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "obligations_user_idx" ON "obligations" USING btree ("user_id","active");