CREATE TABLE "dive_spot_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dive_spot_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dive_spot_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dive_spot_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dive_log_buddies" (
	"id" serial PRIMARY KEY NOT NULL,
	"dive_log_id" integer NOT NULL,
	"buddy_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dive_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"dive_spot_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"photo_url" text,
	"caption" text,
	"max_depth" integer,
	"dive_time" integer,
	"dive_date" timestamp,
	"dive_type" text DEFAULT 'fun',
	"water_conditions" text,
	"water_temperature" numeric(4, 1),
	"equipment_used" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"isPrivate" boolean DEFAULT false,
	"theme" text DEFAULT 'light',
	"notifications" boolean DEFAULT true,
	"language" text DEFAULT 'en',
	"privacy" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_socials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"twitter" text,
	"facebook" text,
	"instagram" text,
	"linkedin" text,
	"github" text,
	"tiktok" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "directions" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dive_spot_comments" ADD CONSTRAINT "dive_spot_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_comments" ADD CONSTRAINT "dive_spot_comments_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_comments" ADD CONSTRAINT "dive_spot_comments_parent_id_dive_spot_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dive_spot_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_ratings" ADD CONSTRAINT "dive_spot_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_spot_ratings" ADD CONSTRAINT "dive_spot_ratings_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_log_buddies" ADD CONSTRAINT "dive_log_buddies_dive_log_id_dive_logs_id_fk" FOREIGN KEY ("dive_log_id") REFERENCES "public"."dive_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_log_buddies" ADD CONSTRAINT "dive_log_buddies_buddy_id_users_id_fk" FOREIGN KEY ("buddy_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_socials" ADD CONSTRAINT "user_socials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;