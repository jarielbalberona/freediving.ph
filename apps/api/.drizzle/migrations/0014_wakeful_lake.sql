ALTER TABLE "dive_logs" RENAME COLUMN "photo_url" TO "image_url";--> statement-breakpoint
ALTER TABLE "dive_spot_comments" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "dive_spot_ratings" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "image_url" text;