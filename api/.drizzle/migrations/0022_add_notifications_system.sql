-- Custom SQL migration file, put your code below! --

-- Create notification type enum
CREATE TYPE "notification_type" AS ENUM('SYSTEM', 'MESSAGE', 'EVENT', 'GROUP', 'SERVICE', 'BOOKING', 'REVIEW', 'MENTION', 'LIKE', 'COMMENT', 'FRIEND_REQUEST', 'GROUP_INVITE', 'EVENT_REMINDER', 'PAYMENT', 'SECURITY');

-- Create notification status enum
CREATE TYPE "notification_status" AS ENUM('UNREAD', 'READ', 'ARCHIVED', 'DELETED');

-- Create notification priority enum
CREATE TYPE "notification_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'UNREAD' NOT NULL,
	"priority" "notification_priority" DEFAULT 'NORMAL' NOT NULL,
	"related_user_id" integer,
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"image_url" text,
	"action_url" text,
	"metadata" jsonb,
	"is_email_sent" boolean DEFAULT false,
	"is_push_sent" boolean DEFAULT false,
	"email_sent_at" timestamp with time zone,
	"push_sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"push_enabled" boolean DEFAULT true,
	"in_app_enabled" boolean DEFAULT true,
	"system_notifications" boolean DEFAULT true,
	"message_notifications" boolean DEFAULT true,
	"event_notifications" boolean DEFAULT true,
	"group_notifications" boolean DEFAULT true,
	"service_notifications" boolean DEFAULT true,
	"booking_notifications" boolean DEFAULT true,
	"review_notifications" boolean DEFAULT true,
	"mention_notifications" boolean DEFAULT true,
	"like_notifications" boolean DEFAULT true,
	"comment_notifications" boolean DEFAULT true,
	"friend_request_notifications" boolean DEFAULT true,
	"group_invite_notifications" boolean DEFAULT true,
	"event_reminder_notifications" boolean DEFAULT true,
	"payment_notifications" boolean DEFAULT true,
	"security_notifications" boolean DEFAULT true,
	"digest_frequency" varchar(20) DEFAULT 'DAILY',
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"timezone" varchar(50) DEFAULT 'Asia/Manila',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"variables" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create notification delivery log table
CREATE TABLE IF NOT EXISTS "notification_delivery_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"delivery_method" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" ("status");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" ("type");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
CREATE INDEX IF NOT EXISTS "notification_settings_user_id_idx" ON "notification_settings" ("user_id");
CREATE INDEX IF NOT EXISTS "notification_delivery_log_notification_id_idx" ON "notification_delivery_log" ("notification_id");
