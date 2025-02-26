ALTER TABLE "account" RENAME TO "accounts";--> statement-breakpoint
ALTER TABLE "session" RENAME TO "sessions";--> statement-breakpoint
ALTER TABLE "user" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "verification_token" RENAME TO "verification_tokens";--> statement-breakpoint
ALTER TABLE "dive_shop" RENAME TO "dive_shops";--> statement-breakpoint
ALTER TABLE "dive_spot" RENAME TO "dive_spots";--> statement-breakpoint
ALTER TABLE "dive_tour" RENAME TO "dive_tours";--> statement-breakpoint
ALTER TABLE "comment" RENAME TO "commenst";--> statement-breakpoint
ALTER TABLE "reaction" RENAME TO "reactions";--> statement-breakpoint
ALTER TABLE "thread" RENAME TO "threads";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "session_session_id_unique";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "session_session_cookie_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "user_username_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "user_alias_unique";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_tours" DROP CONSTRAINT "dive_tour_shop_id_dive_shop_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_tours" DROP CONSTRAINT "dive_tour_location_id_dive_spot_id_fk";
--> statement-breakpoint
ALTER TABLE "review" DROP CONSTRAINT "review_spot_id_dive_spot_id_fk";
--> statement-breakpoint
ALTER TABLE "review" DROP CONSTRAINT "review_shop_id_dive_shop_id_fk";
--> statement-breakpoint
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "commenst" DROP CONSTRAINT "comment_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "commenst" DROP CONSTRAINT "comment_thread_id_thread_id_fk";
--> statement-breakpoint
ALTER TABLE "commenst" DROP CONSTRAINT "comment_parent_id_comment_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_thread_id_thread_id_fk";
--> statement-breakpoint
ALTER TABLE "reactions" DROP CONSTRAINT "reaction_comment_id_comment_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "thread_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD CONSTRAINT "dive_tours_shop_id_dive_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."dive_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD CONSTRAINT "dive_tours_location_id_dive_spots_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."dive_spots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_spot_id_dive_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_shop_id_dive_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."dive_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commenst" ADD CONSTRAINT "commenst_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commenst" ADD CONSTRAINT "commenst_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commenst" ADD CONSTRAINT "commenst_parent_id_commenst_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commenst"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_commenst_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."commenst"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_cookie_unique" UNIQUE("session_cookie");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_alias_unique" UNIQUE("alias");