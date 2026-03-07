ALTER TABLE "reactions" ADD CONSTRAINT "check_thread_or_comment" CHECK ("reactions"."thread_id" IS NOT NULL OR "reactions"."comment_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "public"."reactions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."reaction_type";--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('1', '0');--> statement-breakpoint
ALTER TABLE "public"."reactions" ALTER COLUMN "type" SET DATA TYPE "public"."reaction_type" USING "type"::"public"."reaction_type";