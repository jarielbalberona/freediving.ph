CREATE TYPE "public"."feature_restriction_type" AS ENUM('DM_DISABLED', 'CHIKA_POSTING_DISABLED');--> statement-breakpoint
CREATE TYPE "public"."moderation_thread_state" AS ENUM('OPEN', 'LOCKED', 'REMOVED');--> statement-breakpoint
ALTER TYPE "public"."report_reason_code" ADD VALUE 'DOXXING' BEFORE 'HATE';--> statement-breakpoint
ALTER TYPE "public"."report_reason_code" ADD VALUE 'IMPERSONATION' BEFORE 'HATE';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'PROFILE' BEFORE 'THREAD';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'PERSONAL_BEST' BEFORE 'THREAD';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'PROFILE_ACTIVITY_ITEM' BEFORE 'THREAD';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'TRAINING_LOG' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'SAFETY_RESOURCE' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'AWARENESS_POST' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'MARKETPLACE_LISTING' BEFORE 'OTHER';--> statement-breakpoint
ALTER TYPE "public"."report_target_type" ADD VALUE 'COLLABORATION_POST' BEFORE 'OTHER';--> statement-breakpoint
CREATE TABLE "thread_moderation_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"state" "moderation_thread_state" DEFAULT 'OPEN' NOT NULL,
	"reason_code" "report_reason_code",
	"note" text,
	"acted_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feature_restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"restriction_type" "feature_restriction_type" NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"reason_code" "report_reason_code",
	"note" text,
	"acted_by_user_id" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thread_moderation_states" ADD CONSTRAINT "thread_moderation_states_acted_by_user_id_users_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" ADD CONSTRAINT "user_feature_restrictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" ADD CONSTRAINT "user_feature_restrictions_acted_by_user_id_users_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "thread_moderation_states_thread_id_unique_idx" ON "thread_moderation_states" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_feature_restrictions_user_type_unique_idx" ON "user_feature_restrictions" USING btree ("user_id","restriction_type");