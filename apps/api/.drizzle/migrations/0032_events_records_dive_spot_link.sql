ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "dive_spot_id" integer;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_dive_spot_idx" ON "events" USING btree ("dive_spot_id");
--> statement-breakpoint
ALTER TABLE "competitive_records" ADD COLUMN IF NOT EXISTS "dive_spot_id" integer;
--> statement-breakpoint
ALTER TABLE "competitive_records" ADD CONSTRAINT "competitive_records_dive_spot_id_dive_spots_id_fk" FOREIGN KEY ("dive_spot_id") REFERENCES "public"."dive_spots"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitive_records_dive_spot_idx" ON "competitive_records" USING btree ("dive_spot_id");
