-- Custom SQL migration file, put your code below! --

-- Create message type enum
CREATE TYPE "message_type" AS ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'SYSTEM');

-- Create conversation type enum
CREATE TYPE "conversation_type" AS ENUM('DIRECT', 'GROUP', 'CHANNEL');

-- Create message status enum
CREATE TYPE "message_status" AS ENUM('SENT', 'DELIVERED', 'READ', 'FAILED');

-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"description" text,
	"type" "conversation_type" DEFAULT 'DIRECT' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_message_at" timestamp with time zone,
	"last_message_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS "conversation_participants" (
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'MEMBER',
	"joined_at" timestamp with time zone DEFAULT now(),
	"left_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"last_read_at" timestamp with time zone,
	"last_read_message_id" integer,
	"notification_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_participants_pk" PRIMARY KEY("conversation_id","user_id")
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"content" text NOT NULL,
	"status" "message_status" DEFAULT 'SENT' NOT NULL,
	"parent_message_id" integer,
	"thread_id" integer,
	"metadata" jsonb,
	"edited_at" timestamp with time zone,
	"edited_by" integer,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"reactions_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create message attachments table
CREATE TABLE IF NOT EXISTS "message_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size" integer NOT NULL,
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"mime_type" varchar(100),
	"width" integer,
	"height" integer,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS "message_reactions" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_pk" PRIMARY KEY("message_id","user_id","emoji")
);

-- Create message mentions table
CREATE TABLE IF NOT EXISTS "message_mentions" (
	"message_id" integer NOT NULL,
	"mentioned_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_mentions_pk" PRIMARY KEY("message_id","mentioned_user_id")
);

-- Create message read receipts table
CREATE TABLE IF NOT EXISTS "message_read_receipts" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_read_receipts_pk" PRIMARY KEY("message_id","user_id")
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_messages_id_fk" FOREIGN KEY ("thread_id") REFERENCES "messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "conversations_created_by_idx" ON "conversations" ("created_by");
CREATE INDEX IF NOT EXISTS "conversations_type_idx" ON "conversations" ("type");
CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx" ON "conversations" ("last_message_at");
CREATE INDEX IF NOT EXISTS "conversation_participants_user_id_idx" ON "conversation_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "conversation_participants_conversation_id_idx" ON "conversation_participants" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" ("created_at");
CREATE INDEX IF NOT EXISTS "messages_type_idx" ON "messages" ("type");
CREATE INDEX IF NOT EXISTS "message_attachments_message_id_idx" ON "message_attachments" ("message_id");
CREATE INDEX IF NOT EXISTS "message_reactions_message_id_idx" ON "message_reactions" ("message_id");
CREATE INDEX IF NOT EXISTS "message_mentions_message_id_idx" ON "message_mentions" ("message_id");
CREATE INDEX IF NOT EXISTS "message_read_receipts_message_id_idx" ON "message_read_receipts" ("message_id");
