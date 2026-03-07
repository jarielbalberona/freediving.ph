BEGIN;

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "id_int" integer;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "clerk_id" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "alias" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "email_verified" timestamp with time zone;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "image" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "account_status" text DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "home_dive_area" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "experience_level" text;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'PUBLIC' NOT NULL;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "buddy_finder_visibility" text DEFAULT 'VISIBLE' NOT NULL;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "is_service_provider" boolean DEFAULT false;

UPDATE "app_users" AS "au"
SET
  "id_int" = COALESCE("au"."legacy_user_id", "u"."id"),
  "clerk_id" = COALESCE("au"."clerk_id", "u"."clerk_id", "au"."clerk_user_id"),
  "name" = COALESCE("au"."name", "u"."name"),
  "username" = COALESCE("au"."username", "u"."username"),
  "alias" = COALESCE("au"."alias", "u"."alias"),
  "email" = COALESCE("au"."email", "u"."email"),
  "email_verified" = COALESCE("au"."email_verified", "u"."email_verified"),
  "image" = COALESCE("au"."image", "u"."image"),
  "role" = COALESCE("au"."role", "u"."role"::text),
  "account_status" = COALESCE("au"."account_status", "u"."account_status"::text, 'ACTIVE'),
  "bio" = COALESCE("au"."bio", "u"."bio"),
  "location" = COALESCE("au"."location", "u"."location"),
  "phone" = COALESCE("au"."phone", "u"."phone"),
  "website" = COALESCE("au"."website", "u"."website"),
  "home_dive_area" = COALESCE("au"."home_dive_area", "u"."home_dive_area"),
  "experience_level" = COALESCE("au"."experience_level", "u"."experience_level"),
  "visibility" = COALESCE("au"."visibility", "u"."visibility"::text, 'PUBLIC'),
  "buddy_finder_visibility" = COALESCE("au"."buddy_finder_visibility", "u"."buddy_finder_visibility"::text, 'VISIBLE'),
  "is_service_provider" = COALESCE("au"."is_service_provider", "u"."is_service_provider")
FROM "users" AS "u"
WHERE "u"."clerk_id" = "au"."clerk_user_id";

CREATE SEQUENCE IF NOT EXISTS "app_users_id_seq" OWNED BY "app_users"."id_int";
SELECT setval('app_users_id_seq', GREATEST(COALESCE((SELECT MAX("id_int") FROM "app_users"), 0), 1), true);
UPDATE "app_users" SET "id_int" = nextval('app_users_id_seq') WHERE "id_int" IS NULL;
ALTER TABLE "app_users" ALTER COLUMN "id_int" SET NOT NULL;

ALTER TABLE "user_permission_overrides" ADD COLUMN IF NOT EXISTS "user_id_int" integer;
UPDATE "user_permission_overrides" AS "upo"
SET "user_id_int" = "au"."id_int"
FROM "app_users" AS "au"
WHERE "au"."id" = "upo"."user_id";

ALTER TABLE "group_memberships" ADD COLUMN IF NOT EXISTS "user_id_int" integer;
UPDATE "group_memberships" AS "gm"
SET "user_id_int" = "au"."id_int"
FROM "app_users" AS "au"
WHERE "au"."id" = "gm"."user_id";

ALTER TABLE "event_memberships" ADD COLUMN IF NOT EXISTS "user_id_int" integer;
UPDATE "event_memberships" AS "em"
SET "user_id_int" = "au"."id_int"
FROM "app_users" AS "au"
WHERE "au"."id" = "em"."user_id";

ALTER TABLE "app_blocks" ADD COLUMN IF NOT EXISTS "blocker_user_id_int" integer;
ALTER TABLE "app_blocks" ADD COLUMN IF NOT EXISTS "blocked_user_id_int" integer;
UPDATE "app_blocks" AS "ab"
SET
  "blocker_user_id_int" = "a1"."id_int",
  "blocked_user_id_int" = "a2"."id_int"
FROM "app_users" AS "a1", "app_users" AS "a2"
WHERE "a1"."id" = "ab"."blocker_user_id" AND "a2"."id" = "ab"."blocked_user_id";

ALTER TABLE "app_reports" ADD COLUMN IF NOT EXISTS "reporter_user_id_int" integer;
UPDATE "app_reports" AS "ar"
SET "reporter_user_id_int" = "au"."id_int"
FROM "app_users" AS "au"
WHERE "au"."id" = "ar"."reporter_user_id";

ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "actor_user_id_int" integer;
ALTER TABLE "moderation_actions" ADD COLUMN IF NOT EXISTS "target_user_id_int" integer;
UPDATE "moderation_actions" AS "ma"
SET
  "actor_user_id_int" = "a1"."id_int",
  "target_user_id_int" = "a2"."id_int"
FROM "app_users" AS "a1", "app_users" AS "a2"
WHERE "a1"."id" = "ma"."actor_user_id" AND "a2"."id" = "ma"."target_user_id";

ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_user_id_int" integer;
UPDATE "audit_log" AS "al"
SET "actor_user_id_int" = "au"."id_int"
FROM "app_users" AS "au"
WHERE "au"."id" = "al"."actor_user_id";

ALTER TABLE "app_users" DROP CONSTRAINT IF EXISTS "app_users_pkey";
ALTER TABLE "app_users" RENAME COLUMN "id" TO "id_uuid";
ALTER TABLE "app_users" RENAME COLUMN "id_int" TO "id";
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");
ALTER TABLE "app_users" ALTER COLUMN "id" SET DEFAULT nextval('app_users_id_seq');

ALTER TABLE "user_permission_overrides" DROP COLUMN "user_id";
ALTER TABLE "user_permission_overrides" RENAME COLUMN "user_id_int" TO "user_id";
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_app_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("user_id");

ALTER TABLE "group_memberships" DROP COLUMN "user_id";
ALTER TABLE "group_memberships" RENAME COLUMN "user_id_int" TO "user_id";
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_app_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "event_memberships" DROP COLUMN "user_id";
ALTER TABLE "event_memberships" RENAME COLUMN "user_id_int" TO "user_id";
ALTER TABLE "event_memberships" ADD CONSTRAINT "event_memberships_user_id_app_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "app_blocks" DROP COLUMN "blocker_user_id";
ALTER TABLE "app_blocks" DROP COLUMN "blocked_user_id";
ALTER TABLE "app_blocks" RENAME COLUMN "blocker_user_id_int" TO "blocker_user_id";
ALTER TABLE "app_blocks" RENAME COLUMN "blocked_user_id_int" TO "blocked_user_id";

ALTER TABLE "app_reports" DROP COLUMN "reporter_user_id";
ALTER TABLE "app_reports" RENAME COLUMN "reporter_user_id_int" TO "reporter_user_id";

ALTER TABLE "moderation_actions" DROP COLUMN "actor_user_id";
ALTER TABLE "moderation_actions" DROP COLUMN "target_user_id";
ALTER TABLE "moderation_actions" RENAME COLUMN "actor_user_id_int" TO "actor_user_id";
ALTER TABLE "moderation_actions" RENAME COLUMN "target_user_id_int" TO "target_user_id";

ALTER TABLE "audit_log" DROP COLUMN "actor_user_id";
ALTER TABLE "audit_log" RENAME COLUMN "actor_user_id_int" TO "actor_user_id";

ALTER TABLE "app_users" DROP COLUMN IF EXISTS "legacy_user_id";
ALTER TABLE "app_users" DROP COLUMN IF EXISTS "legacy_username";

COMMIT;
