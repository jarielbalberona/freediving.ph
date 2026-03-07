-- Add clerk_id column to users table
ALTER TABLE "users" ADD COLUMN "clerk_id" text;

-- Add unique constraint for clerk_id
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");

-- Remove password column (Clerk handles authentication)
ALTER TABLE "users" DROP COLUMN "password";

-- Create index for faster lookups
CREATE INDEX "idx_users_clerk_id" ON "users"("clerk_id");
