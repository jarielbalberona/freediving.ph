DROP TABLE IF EXISTS "reviews" CASCADE;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."rating_enum";
--> statement-breakpoint
UPDATE "events" e
SET "dive_spot_id" = ds."id"
FROM "dive_spots" ds
WHERE e."dive_spot_id" IS NULL
  AND ds."state" = 'PUBLISHED'
  AND ds."deleted_at" IS NULL
  AND (
    e."location" ILIKE '%' || ds."name" || '%'
    OR (
      ds."location_name" IS NOT NULL
      AND e."location" ILIKE '%' || ds."location_name" || '%'
    )
  );
--> statement-breakpoint
UPDATE "competitive_records" cr
SET "dive_spot_id" = ds."id"
FROM "dive_spots" ds
WHERE cr."dive_spot_id" IS NULL
  AND ds."state" = 'PUBLISHED'
  AND ds."deleted_at" IS NULL
  AND (
    cr."event_name" ILIKE '%' || ds."name" || '%'
    OR (
      ds."location_name" IS NOT NULL
      AND cr."event_name" ILIKE '%' || ds."location_name" || '%'
    )
  );
