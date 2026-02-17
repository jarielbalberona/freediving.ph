ALTER TABLE "dive_spots" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_log_sessions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_post_comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_posts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "personal_bests" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile_activity_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "thread_category_modes_mode_thread_idx" ON "thread_category_modes" USING btree ("mode","thread_id");--> statement-breakpoint
CREATE INDEX "dive_spots_state_location_idx" ON "dive_spots" USING btree ("state","location_name");--> statement-breakpoint
CREATE INDEX "events_start_date_status_idx" ON "events" USING btree ("start_date","status");--> statement-breakpoint
CREATE INDEX "group_posts_group_created_at_idx" ON "group_posts" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_thread_created_at_idx" ON "comments" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_created_at_idx" ON "threads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "threads_user_created_at_idx" ON "threads" USING btree ("user_id","created_at");