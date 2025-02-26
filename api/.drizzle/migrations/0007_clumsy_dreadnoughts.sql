ALTER TABLE "review" RENAME TO "reviews";--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "review_spot_id_dive_spots_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "review_shop_id_dive_shops_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_spot_id_dive_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shop_id_dive_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."dive_shops"("id") ON DELETE cascade ON UPDATE no action;