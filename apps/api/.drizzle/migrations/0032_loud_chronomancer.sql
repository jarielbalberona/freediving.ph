CREATE INDEX "dive_spot_comments_spot_id_idx" ON "dive_spot_comments" USING btree ("dive_spot_id");--> statement-breakpoint
CREATE INDEX "dive_spot_ratings_spot_id_idx" ON "dive_spot_ratings" USING btree ("dive_spot_id");--> statement-breakpoint
CREATE INDEX "dive_spots_state_deleted_lat_lng_idx" ON "dive_spots" USING btree ("state","deleted_at","lat","lng");