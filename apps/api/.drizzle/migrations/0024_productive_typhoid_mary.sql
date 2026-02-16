CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."buddy_finder_visibility" AS ENUM('VISIBLE', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('PUBLIC', 'MEMBERS_ONLY');--> statement-breakpoint
CREATE TYPE "public"."buddy_relationship_state" AS ENUM('ACTIVE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."buddy_request_state" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."chika_category_mode" AS ENUM('NORMAL', 'PSEUDONYMOUS_CHIKA');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('DIVE_SESSION', 'TRAINING', 'COMPETITION', 'SOCIAL', 'WORKSHOP', 'MEETUP', 'TOURNAMENT', 'FUNDRAISER');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('PUBLIC', 'PRIVATE', 'GROUP_ONLY', 'INVITE_ONLY');--> statement-breakpoint
CREATE TYPE "public"."competitive_record_verification" AS ENUM('UNVERIFIED', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_listing_state" AS ENUM('ACTIVE', 'FLAGGED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."training_log_visibility" AS ENUM('PRIVATE', 'BUDDIES_ONLY', 'PUBLIC');--> statement-breakpoint
CREATE TYPE "public"."group_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."group_type" AS ENUM('PUBLIC', 'PRIVATE', 'INVITE_ONLY', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('DIRECT', 'GROUP', 'CHANNEL');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('SENT', 'DELIVERED', 'READ', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."block_scope" AS ENUM('PLATFORM', 'MESSAGING_ONLY');--> statement-breakpoint
CREATE TYPE "public"."report_reason_code" AS ENUM('SPAM', 'HARASSMENT', 'HATE', 'MISINFORMATION', 'SCAM', 'SAFETY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('USER', 'THREAD', 'POST', 'CONVERSATION', 'MESSAGE', 'GROUP', 'EVENT', 'DIVE_SITE', 'COMPETITIVE_RECORD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('UNREAD', 'READ', 'ARCHIVED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('SYSTEM', 'MESSAGE', 'EVENT', 'GROUP', 'SERVICE', 'BOOKING', 'REVIEW', 'MENTION', 'LIKE', 'COMMENT', 'FRIEND_REQUEST', 'GROUP_INVITE', 'EVENT_REMINDER', 'PAYMENT', 'SECURITY');--> statement-breakpoint
CREATE TYPE "public"."pb_discipline" AS ENUM('STA', 'DYN', 'DYNB', 'DNF', 'CWT', 'CWTB', 'FIM', 'CNF', 'VWT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."profile_item_visibility" AS ENUM('PUBLIC', 'MEMBERS_ONLY', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('BUDDY', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'INSTRUCTOR', 'GUIDE', 'EQUIPMENT_RENTAL', 'TRANSPORTATION');--> statement-breakpoint
CREATE TABLE "buddy_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id_a" integer NOT NULL,
	"user_id_b" integer NOT NULL,
	"state" "buddy_relationship_state" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buddy_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"state" "buddy_request_state" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chika_pseudonyms" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"display_handle" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_category_modes" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"mode" "chika_category_mode" DEFAULT 'NORMAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "event_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "awareness_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_user_id" integer,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"topic_type" varchar(50) NOT NULL,
	"source_url" text,
	"is_published" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_user_id" integer NOT NULL,
	"post_type" varchar(30) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"region" varchar(120),
	"specialty" varchar(120),
	"is_active" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitive_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"submitted_by_user_id" integer,
	"athlete_name" varchar(120) NOT NULL,
	"discipline" varchar(30) NOT NULL,
	"result_value" varchar(50) NOT NULL,
	"result_unit" varchar(20) NOT NULL,
	"event_name" varchar(200) NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"source_url" text,
	"verification_state" "competitive_record_verification" DEFAULT 'UNVERIFIED' NOT NULL,
	"verification_note" text,
	"verified_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_user_id" integer NOT NULL,
	"item" varchar(160) NOT NULL,
	"condition" varchar(50) NOT NULL,
	"price" varchar(40) NOT NULL,
	"region" varchar(100) NOT NULL,
	"description" text,
	"photos" text[],
	"state" "marketplace_listing_state" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" varchar(100) NOT NULL,
	"label" varchar(120) NOT NULL,
	"phone" varchar(60) NOT NULL,
	"source" text NOT NULL,
	"is_published" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_page_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"safety_page_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"updated_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"is_published" integer DEFAULT 0,
	"last_reviewed_at" timestamp with time zone,
	"updated_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "training_log_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"metric_key" varchar(80) NOT NULL,
	"metric_value" varchar(120) NOT NULL,
	"metric_unit" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_log_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"notes" text,
	"session_date" timestamp with time zone NOT NULL,
	"visibility" "training_log_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "group_post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
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
	CONSTRAINT "conversation_participants_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
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
--> statement-breakpoint
CREATE TABLE "message_attachments" (
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
--> statement-breakpoint
CREATE TABLE "message_mentions" (
	"message_id" integer NOT NULL,
	"mentioned_user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_mentions_message_id_mentioned_user_id_pk" PRIMARY KEY("message_id","mentioned_user_id")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_user_id_emoji_pk" PRIMARY KEY("message_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_read_receipts_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
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
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker_user_id" integer NOT NULL,
	"blocked_user_id" integer NOT NULL,
	"scope" "block_scope" DEFAULT 'PLATFORM' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_user_id" integer NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason_code" "report_reason_code" NOT NULL,
	"text" text,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"enabled" boolean DEFAULT true,
	"email_enabled" boolean DEFAULT true,
	"push_enabled" boolean DEFAULT true,
	"sms_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"priority" "notification_priority" DEFAULT 'NORMAL',
	"status" "notification_status" DEFAULT 'UNREAD',
	"related_user_id" integer,
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"image_url" text,
	"action_url" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_bests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"discipline" "pb_discipline" NOT NULL,
	"result_value" varchar(50) NOT NULL,
	"result_unit" varchar(20) NOT NULL,
	"recorded_at" timestamp with time zone,
	"visibility" "profile_item_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_activity_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(80) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(120) NOT NULL,
	"visibility" "profile_item_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"center_lat" numeric(10, 8),
	"center_lng" numeric(11, 8),
	"radius" integer,
	"is_primary" boolean DEFAULT false,
	"travel_fee" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'PHP',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggested_by" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"emoji" varchar(10) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'PENDING',
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50),
	"icon" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggested_by" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'PENDING',
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"booking_date" timestamp with time zone NOT NULL,
	"duration" integer,
	"location" text,
	"notes" text,
	"rate" numeric(10, 2),
	"total_amount" numeric(10, 2),
	"currency" text DEFAULT 'PHP',
	"status" text DEFAULT 'PENDING',
	"payment_status" text DEFAULT 'PENDING',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"booking_id" integer,
	"reviewer_id" integer NOT NULL,
	"reviewee_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"communication_rating" integer,
	"punctuality_rating" integer,
	"skill_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_type_id" integer NOT NULL,
	"is_available" boolean DEFAULT true,
	"title" text NOT NULL,
	"description" text,
	"rate" numeric(10, 2),
	"currency" text DEFAULT 'PHP',
	"rate_type" text,
	"experience_level" "experience_level" DEFAULT 'INTERMEDIATE',
	"years_experience" integer,
	"skills" text[],
	"certifications" text[],
	"specialties" text[],
	"max_travel_distance" integer,
	"default_travel_fee" numeric(10, 2),
	"max_depth" integer,
	"equipment_provided" boolean DEFAULT false,
	"equipment_details" text,
	"portfolio_url" text,
	"contact_info" jsonb,
	"available_days" text[],
	"available_times" text,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "account_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_dive_area" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "experience_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "visibility" "profile_visibility" DEFAULT 'PUBLIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "buddy_finder_visibility" "buddy_finder_visibility" DEFAULT 'VISIBLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_service_provider" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "visibility" text DEFAULT 'PUBLIC';--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "source" text DEFAULT 'COMMUNITY';--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "state" text DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "is_approved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "suggested_by" integer;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "usage_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "buddy_relationships" ADD CONSTRAINT "buddy_relationships_user_id_a_users_id_fk" FOREIGN KEY ("user_id_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_relationships" ADD CONSTRAINT "buddy_relationships_user_id_b_users_id_fk" FOREIGN KEY ("user_id_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD CONSTRAINT "buddy_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD CONSTRAINT "buddy_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chika_pseudonyms" ADD CONSTRAINT "chika_pseudonyms_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chika_pseudonyms" ADD CONSTRAINT "chika_pseudonyms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_category_modes" ADD CONSTRAINT "thread_category_modes_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awareness_posts" ADD CONSTRAINT "awareness_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_posts" ADD CONSTRAINT "collaboration_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitive_records" ADD CONSTRAINT "competitive_records_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitive_records" ADD CONSTRAINT "competitive_records_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_page_versions" ADD CONSTRAINT "safety_page_versions_safety_page_id_safety_pages_id_fk" FOREIGN KEY ("safety_page_id") REFERENCES "public"."safety_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_page_versions" ADD CONSTRAINT "safety_page_versions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_pages" ADD CONSTRAINT "safety_pages_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_log_metrics" ADD CONSTRAINT "training_log_metrics_session_id_training_log_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_log_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_log_sessions" ADD CONSTRAINT "training_log_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_post_id_group_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_post_id_group_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_bests" ADD CONSTRAINT "personal_bests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_activity_items" ADD CONSTRAINT "profile_activity_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_user_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."user_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_user_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."user_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_services" ADD CONSTRAINT "user_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_services" ADD CONSTRAINT "user_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buddy_relationships_user_pair_unique_idx" ON "buddy_relationships" USING btree ("user_id_a","user_id_b");--> statement-breakpoint
CREATE UNIQUE INDEX "buddy_requests_from_to_unique_idx" ON "buddy_requests" USING btree ("from_user_id","to_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chika_pseudonyms_thread_user_unique_idx" ON "chika_pseudonyms" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chika_pseudonyms_thread_handle_unique_idx" ON "chika_pseudonyms" USING btree ("thread_id","display_handle");--> statement-breakpoint
CREATE INDEX "awareness_posts_topic_idx" ON "awareness_posts" USING btree ("topic_type");--> statement-breakpoint
CREATE INDEX "collaboration_posts_author_idx" ON "collaboration_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "collaboration_posts_type_idx" ON "collaboration_posts" USING btree ("post_type");--> statement-breakpoint
CREATE INDEX "competitive_records_athlete_idx" ON "competitive_records" USING btree ("athlete_name");--> statement-breakpoint
CREATE INDEX "competitive_records_event_idx" ON "competitive_records" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "competitive_records_discipline_idx" ON "competitive_records" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "marketplace_listings_seller_idx" ON "marketplace_listings" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "marketplace_listings_state_region_idx" ON "marketplace_listings" USING btree ("state","region");--> statement-breakpoint
CREATE INDEX "training_log_sessions_user_date_idx" ON "training_log_sessions" USING btree ("user_id","session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_blocker_blocked_idx" ON "blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_user_thread_unique_idx" ON "reactions" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_user_comment_unique_idx" ON "reactions" USING btree ("user_id","comment_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");