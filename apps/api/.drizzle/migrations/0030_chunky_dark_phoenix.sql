ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "buddy_relationships" DROP CONSTRAINT "buddy_relationships_user_id_a_users_id_fk";
--> statement-breakpoint
ALTER TABLE "buddy_relationships" DROP CONSTRAINT "buddy_relationships_user_id_b_users_id_fk";
--> statement-breakpoint
ALTER TABLE "buddy_requests" DROP CONSTRAINT "buddy_requests_from_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "buddy_requests" DROP CONSTRAINT "buddy_requests_to_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "chika_pseudonyms" DROP CONSTRAINT "chika_pseudonyms_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_spot_comments" DROP CONSTRAINT "dive_spot_comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_spot_ratings" DROP CONSTRAINT "dive_spot_ratings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_log_buddies" DROP CONSTRAINT "dive_log_buddies_buddy_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_logs" DROP CONSTRAINT "dive_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_attendees" DROP CONSTRAINT "event_attendees_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_attendees" DROP CONSTRAINT "event_attendees_checked_in_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_comments" DROP CONSTRAINT "event_comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_likes" DROP CONSTRAINT "event_likes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "event_waitlist" DROP CONSTRAINT "event_waitlist_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "awareness_posts" DROP CONSTRAINT "awareness_posts_author_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "collaboration_posts" DROP CONSTRAINT "collaboration_posts_author_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "competitive_records" DROP CONSTRAINT "competitive_records_submitted_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "competitive_records" DROP CONSTRAINT "competitive_records_verified_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "marketplace_listings" DROP CONSTRAINT "marketplace_listings_seller_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "safety_page_versions" DROP CONSTRAINT "safety_page_versions_updated_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "safety_pages" DROP CONSTRAINT "safety_pages_updated_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "training_log_sessions" DROP CONSTRAINT "training_log_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "group_members" DROP CONSTRAINT "group_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "group_members" DROP CONSTRAINT "group_members_invited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "group_post_comments" DROP CONSTRAINT "group_post_comments_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "group_post_likes" DROP CONSTRAINT "group_post_likes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "group_posts" DROP CONSTRAINT "group_posts_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_mentions" DROP CONSTRAINT "message_mentions_mentioned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_reactions" DROP CONSTRAINT "message_reactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "message_read_receipts" DROP CONSTRAINT "message_read_receipts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_edited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_blocker_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "blocks" DROP CONSTRAINT "blocks_blocked_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reviewed_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "thread_moderation_states" DROP CONSTRAINT "thread_moderation_states_acted_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" DROP CONSTRAINT "user_feature_restrictions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" DROP CONSTRAINT "user_feature_restrictions_acted_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_settings" DROP CONSTRAINT "notification_settings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_related_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "personal_bests" DROP CONSTRAINT "personal_bests_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "profile_activity_items" DROP CONSTRAINT "profile_activity_items_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "app_users" DROP CONSTRAINT "app_users_legacy_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_areas" DROP CONSTRAINT "service_areas_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_suggestions" DROP CONSTRAINT "service_suggestions_suggested_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_suggestions" DROP CONSTRAINT "service_suggestions_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tag_suggestions" DROP CONSTRAINT "tag_suggestions_suggested_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tag_suggestions" DROP CONSTRAINT "tag_suggestions_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_suggested_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_approved_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "threads_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_bookings" DROP CONSTRAINT "service_bookings_client_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_bookings" DROP CONSTRAINT "service_bookings_provider_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_reviews" DROP CONSTRAINT "service_reviews_reviewer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_reviews" DROP CONSTRAINT "service_reviews_reviewee_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_services" DROP CONSTRAINT "user_services_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_socials" DROP CONSTRAINT "user_socials_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "app_blocks" ALTER COLUMN "blocker_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "app_blocks" ALTER COLUMN "blocked_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "app_reports" ALTER COLUMN "reporter_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "actor_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "event_memberships" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "group_memberships" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "moderation_actions" ALTER COLUMN "actor_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "moderation_actions" ALTER COLUMN "target_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "clerk_id" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "alias" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "email_verified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "account_status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "home_dive_area" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "experience_level" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "visibility" text DEFAULT 'PUBLIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "buddy_finder_visibility" text DEFAULT 'VISIBLE' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "is_service_provider" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_relationships" ADD CONSTRAINT "buddy_relationships_user_id_a_app_users_id_fk" FOREIGN KEY ("user_id_a") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_relationships" ADD CONSTRAINT "buddy_relationships_user_id_b_app_users_id_fk" FOREIGN KEY ("user_id_b") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD CONSTRAINT "buddy_requests_from_user_id_app_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buddy_requests" ADD CONSTRAINT "buddy_requests_to_user_id_app_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chika_pseudonyms" ADD CONSTRAINT "chika_pseudonyms_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_comments" ADD CONSTRAINT "dive_spot_comments_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_ratings" ADD CONSTRAINT "dive_spot_ratings_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_log_buddies" ADD CONSTRAINT "dive_log_buddies_buddy_id_app_users_id_fk" FOREIGN KEY ("buddy_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_checked_in_by_app_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_likes" ADD CONSTRAINT "event_likes_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awareness_posts" ADD CONSTRAINT "awareness_posts_author_user_id_app_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_posts" ADD CONSTRAINT "collaboration_posts_author_user_id_app_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitive_records" ADD CONSTRAINT "competitive_records_submitted_by_user_id_app_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitive_records" ADD CONSTRAINT "competitive_records_verified_by_user_id_app_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_user_id_app_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_page_versions" ADD CONSTRAINT "safety_page_versions_updated_by_user_id_app_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_pages" ADD CONSTRAINT "safety_pages_updated_by_user_id_app_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_log_sessions" ADD CONSTRAINT "training_log_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_app_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD CONSTRAINT "group_post_comments_author_id_app_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_post_likes" ADD CONSTRAINT "group_post_likes_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_posts" ADD CONSTRAINT "group_posts_author_id_app_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_mentioned_user_id_app_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_app_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_edited_by_app_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_app_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_app_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_app_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_user_id_app_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_moderation_states" ADD CONSTRAINT "thread_moderation_states_acted_by_user_id_app_users_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" ADD CONSTRAINT "user_feature_restrictions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_restrictions" ADD CONSTRAINT "user_feature_restrictions_acted_by_user_id_app_users_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_app_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_bests" ADD CONSTRAINT "personal_bests_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_activity_items" ADD CONSTRAINT "profile_activity_items_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_suggested_by_app_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_reviewed_by_app_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_suggested_by_app_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_reviewed_by_app_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_suggested_by_app_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_approved_by_app_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_id_app_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_provider_id_app_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewer_id_app_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewee_id_app_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_services" ADD CONSTRAINT "user_services_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_socials" ADD CONSTRAINT "user_socials_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" DROP COLUMN "legacy_user_id";--> statement-breakpoint
ALTER TABLE "app_users" DROP COLUMN "legacy_username";--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_clerk_id_unique" UNIQUE("clerk_id");--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_alias_unique" UNIQUE("alias");