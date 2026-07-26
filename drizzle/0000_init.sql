CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"signed_on" date NOT NULL,
	"client_name" text NOT NULL,
	"value_pln" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'podpisana' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"cash_balance_pln" numeric(12, 2),
	"weight_kg" numeric(5, 2),
	"water_ml" integer,
	"sleep_h" numeric(3, 1),
	"mood" integer,
	"energy" integer,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"skill" text NOT NULL,
	"minutes" integer,
	"done" boolean DEFAULT true NOT NULL,
	"material_id" uuid,
	"note" text,
	"plan_id" uuid
);
--> statement-breakpoint
CREATE TABLE "learning_plan_week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"skill" text NOT NULL,
	"start_time" time,
	"duration_min" integer,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plan_year" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"skill" text NOT NULL,
	"focus" text,
	"target" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill" text NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'inne' NOT NULL,
	"url" text,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"note" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot" text NOT NULL,
	"taken" boolean DEFAULT false NOT NULL,
	"taken_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'lek' NOT NULL,
	"dose_amount" numeric(10, 3),
	"dose_unit" text,
	"times_of_day" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"days_of_week" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"for_date" date NOT NULL,
	"mode" text DEFAULT 'mentor' NOT NULL,
	"summary" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"discipline" text NOT NULL,
	"metric" text NOT NULL,
	"unit" text,
	"value" numeric(12, 3) NOT NULL,
	"higher_is_better" boolean DEFAULT true NOT NULL,
	"achieved_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"status" text DEFAULT 'aktywny' NOT NULL,
	"deadline" date,
	"next_action" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"run_id" uuid,
	"for_date" date NOT NULL,
	"category" text NOT NULL,
	"observation" text NOT NULL,
	"action" text NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"horizon" text,
	"status" text DEFAULT 'nowa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"payload" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"meetings_scheduled" integer DEFAULT 0 NOT NULL,
	"meetings_held" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Europe/Warsaw' NOT NULL,
	"currency" text DEFAULT 'PLN' NOT NULL,
	"week_starts_on" integer DEFAULT 1 NOT NULL,
	"water_goal_ml" integer,
	"water_good_pct" integer DEFAULT 100 NOT NULL,
	"water_ok_pct" integer DEFAULT 80 NOT NULL,
	"weight_target_kg" numeric(5, 2),
	"goal_calls_per_day" integer,
	"goal_meetings_scheduled_per_day" integer,
	"goal_meetings_held_per_day" integer,
	"goal_contracts_per_week" integer,
	"monthly_revenue_goal_pln" numeric(12, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'priorytet' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"project_id" uuid,
	"carried_from" date
);
--> statement-breakpoint
CREATE TABLE "training_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"discipline" text NOT NULL,
	"title" text,
	"done" boolean DEFAULT true NOT NULL,
	"duration_min" integer,
	"distance_km" numeric(8, 3),
	"rpe" integer,
	"note" text,
	"plan_id" uuid
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"discipline" text NOT NULL,
	"title" text,
	"start_time" time,
	"duration_min" integer,
	"note" text,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"onboarded_at" timestamp with time zone,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_plan_id_learning_plan_week_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."learning_plan_week"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_week" ADD CONSTRAINT "learning_plan_week_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_year" ADD CONSTRAINT "learning_plan_year_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_runs" ADD CONSTRAINT "mentor_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_run_id_mentor_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."mentor_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_submissions" ADD CONSTRAINT "report_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_daily" ADD CONSTRAINT "sales_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_user_date_idx" ON "contracts" USING btree ("user_id","signed_on");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_user_date_key" ON "daily_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "learning_logs_user_date_idx" ON "learning_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "learning_plan_week_user_idx" ON "learning_plan_week" USING btree ("user_id","weekday","active");--> statement-breakpoint
CREATE INDEX "learning_plan_year_user_idx" ON "learning_plan_year" USING btree ("user_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "materials_user_idx" ON "materials" USING btree ("user_id","skill");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_logs_unique" ON "medication_logs" USING btree ("medication_id","date","slot");--> statement-breakpoint
CREATE INDEX "medication_logs_user_date_idx" ON "medication_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "medications_user_idx" ON "medications" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "mentor_runs_user_date_idx" ON "mentor_runs" USING btree ("user_id","for_date");--> statement-breakpoint
CREATE INDEX "personal_records_user_idx" ON "personal_records" USING btree ("user_id","discipline","metric");--> statement-breakpoint
CREATE INDEX "project_milestones_project_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recommendations_user_idx" ON "recommendations" USING btree ("user_id","for_date","status");--> statement-breakpoint
CREATE INDEX "report_submissions_user_date_idx" ON "report_submissions" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_daily_user_date_key" ON "sales_daily" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_user_date_idx" ON "tasks" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "training_logs_user_date_idx" ON "training_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "training_plans_user_idx" ON "training_plans" USING btree ("user_id","weekday","active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));