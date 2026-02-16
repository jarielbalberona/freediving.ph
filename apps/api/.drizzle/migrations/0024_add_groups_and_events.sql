-- Create group types enum
CREATE TYPE "public"."group_type" AS ENUM('PUBLIC', 'PRIVATE', 'INVITE_ONLY', 'CLOSED');

-- Create group status enum
CREATE TYPE "public"."group_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- Create event types enum
CREATE TYPE "public"."event_type" AS ENUM('DIVE_SESSION', 'TRAINING', 'COMPETITION', 'SOCIAL', 'WORKSHOP', 'MEETUP', 'TOURNAMENT', 'FUNDRAISER');

-- Create event status enum
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED');

-- Create event visibility enum
CREATE TYPE "public"."event_visibility" AS ENUM('PUBLIC', 'PRIVATE', 'GROUP_ONLY', 'INVITE_ONLY');

-- Create groups table
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) UNIQUE NOT NULL,
	"description" text,
	"short_description" varchar(255),
	"type" "group_type" DEFAULT 'PUBLIC',
	"status" "group_status" DEFAULT 'ACTIVE',
	"is_public" boolean DEFAULT true,
	"allow_member_invites" boolean DEFAULT true,
	"cover_image" text,
	"avatar" text,
	"website" text,
	"location" text,
	"lat" text,
	"lng" text,
	"member_count" integer DEFAULT 0,
	"event_count" integer DEFAULT 0,
	"post_count" integer DEFAULT 0,
	"max_members" integer,
	"join_approval_required" boolean DEFAULT false,
	"allow_member_posts" boolean DEFAULT true,
	"allow_member_events" boolean DEFAULT true,
	"rules" text,
	"tags" text[],
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_members table
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"status" text DEFAULT 'active',
	"can_post" boolean DEFAULT true,
	"can_create_events" boolean DEFAULT true,
	"can_invite_members" boolean DEFAULT false,
	"can_moderate" boolean DEFAULT false,
	"joined_at" text,
	"invited_by" integer,
	"left_at" text,
	"notification_settings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_posts table
CREATE TABLE "group_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"title" varchar(200),
	"content" text NOT NULL,
	"post_type" text DEFAULT 'text',
	"is_pinned" boolean DEFAULT false,
	"is_announcement" boolean DEFAULT false,
	"allow_comments" boolean DEFAULT true,
	"like_count" integer DEFAULT 0,
	"comment_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"media_urls" text[],
	"link_preview" text,
	"visibility" text DEFAULT 'public',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_post_comments table
CREATE TABLE "group_post_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"like_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create group_post_likes table
CREATE TABLE "group_post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) UNIQUE NOT NULL,
	"description" text,
	"short_description" varchar(500),
	"type" "event_type" DEFAULT 'DIVE_SESSION',
	"status" "event_status" DEFAULT 'DRAFT',
	"visibility" "event_visibility" DEFAULT 'PUBLIC',
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"registration_deadline" timestamp with time zone,
	"timezone" varchar(50) DEFAULT 'Asia/Manila',
	"location" text NOT NULL,
	"address" text,
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"venue_name" varchar(100),
	"max_attendees" integer,
	"current_attendees" integer DEFAULT 0,
	"waitlist_enabled" boolean DEFAULT false,
	"waitlist_count" integer DEFAULT 0,
	"is_free" boolean DEFAULT true,
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'PHP',
	"early_bird_price" numeric(10, 2),
	"early_bird_deadline" timestamp with time zone,
	"skill_level" text,
	"equipment_required" text,
	"certification_required" text,
	"age_restriction" text,
	"cover_image" text,
	"images" text[],
	"video_url" text,
	"allow_waitlist" boolean DEFAULT true,
	"require_approval" boolean DEFAULT false,
	"allow_cancellation" boolean DEFAULT true,
	"cancellation_deadline" timestamp with time zone,
	"like_count" integer DEFAULT 0,
	"share_count" integer DEFAULT 0,
	"comment_count" integer DEFAULT 0,
	"tags" text[],
	"category" text,
	"contact_email" text,
	"contact_phone" text,
	"website" text,
	"social_links" text,
	"organizer_type" text NOT NULL,
	"organizer_id" integer NOT NULL,
	"group_id" integer,
	"settings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create event_attendees table
CREATE TABLE "event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'registered',
	"registration_date" timestamp with time zone DEFAULT now(),
	"amount_paid" numeric(10, 2),
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"emergency_contact" text,
	"dietary_restrictions" text,
	"medical_conditions" text,
	"notes" text,
	"checked_in" boolean DEFAULT false,
	"checked_in_at" timestamp with time zone,
	"checked_in_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create event_waitlist table
CREATE TABLE "event_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"position" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now(),
	"notified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create event_comments table
CREATE TABLE "event_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create event_likes table
CREATE TABLE "event_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_post_id_group_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_parent_id_group_post_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."group_post_comments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_post_id_group_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_parent_id_event_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event_comments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
