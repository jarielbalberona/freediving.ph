ALTER TABLE "dive_shops" RENAME COLUMN "location" TO "latitude";--> statement-breakpoint
ALTER TABLE "dive_spots" RENAME COLUMN "location" TO "latitude";--> statement-breakpoint
ALTER TABLE "dive_tours" RENAME COLUMN "location_id" TO "dive_spot_id";--> statement-breakpoint
ALTER TABLE "dive_tours" DROP CONSTRAINT "dive_tours_location_id_dive_spots_id_fk";
--> statement-breakpoint
ALTER TABLE "dive_shops" ADD COLUMN "longitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_shops" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "longitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_spots" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD COLUMN "latitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD COLUMN "longitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD COLUMN "latitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD COLUMN "longitude" numeric;--> statement-breakpoint
ALTER TABLE "dive_logs" ADD COLUMN "location_name" text;--> statement-breakpoint
ALTER TABLE "dive_tours" ADD CONSTRAINT "dive_tours_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE set null ON UPDATE no action;