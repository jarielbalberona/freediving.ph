-- Create service type enum
CREATE TYPE "public"."service_type" AS ENUM('BUDDY', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'INSTRUCTOR', 'GUIDE', 'EQUIPMENT_RENTAL', 'TRANSPORTATION');

-- Create experience level enum
CREATE TYPE "public"."experience_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- Create user_services table
CREATE TABLE "user_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_type" "service_type" NOT NULL,
	"is_available" boolean DEFAULT true,
	"title" text NOT NULL,
	"description" text,
	"rate" numeric(10, 2),
	"currency" text DEFAULT 'PHP',
	"experience_level" "experience_level" DEFAULT 'INTERMEDIATE',
	"years_experience" integer,
	"specialties" text[],
	"certifications" text[],
	"service_location" text,
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"max_depth" integer,
	"equipment_provided" boolean DEFAULT false,
	"portfolio_url" text,
	"contact_info" jsonb,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create service_reviews table
CREATE TABLE "service_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create service_bookings table
CREATE TABLE "service_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"booking_date" timestamp with time zone NOT NULL,
	"duration" integer,
	"location" text,
	"status" text DEFAULT 'PENDING',
	"notes" text,
	"total_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "user_services" ADD CONSTRAINT "user_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_user_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."user_services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_user_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."user_services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
