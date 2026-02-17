ALTER TABLE "app_users" ADD COLUMN "legacy_user_id" integer;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "legacy_username" text;--> statement-breakpoint
UPDATE "app_users" AS "au"
SET
  "legacy_user_id" = "u"."id",
  "legacy_username" = "u"."username"
FROM "users" AS "u"
WHERE "u"."clerk_id" = "au"."clerk_user_id";--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_legacy_user_id_users_id_fk" FOREIGN KEY ("legacy_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
