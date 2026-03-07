CREATE TYPE "public"."reaction_type" AS ENUM('1', '0');--> statement-breakpoint
ALTER TABLE "reactions" ALTER COLUMN "type" SET DATA TYPE reaction_type;