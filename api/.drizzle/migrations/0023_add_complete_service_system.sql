-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN "bio" text;
ALTER TABLE "users" ADD COLUMN "location" text;
ALTER TABLE "users" ADD COLUMN "phone" text;
ALTER TABLE "users" ADD COLUMN "website" text;
ALTER TABLE "users" ADD COLUMN "is_service_provider" boolean DEFAULT false;

-- Update tags table with approval workflow
ALTER TABLE "tags" ADD COLUMN "is_approved" boolean DEFAULT false;
ALTER TABLE "tags" ADD COLUMN "suggested_by" integer;
ALTER TABLE "tags" ADD COLUMN "approved_by" integer;
ALTER TABLE "tags" ADD COLUMN "usage_count" integer DEFAULT 0;
ALTER TABLE "tags" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Create service_types table
CREATE TABLE "service_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) UNIQUE NOT NULL,
	"description" text,
	"emoji" varchar(10) NOT NULL,
	"is_approved" boolean DEFAULT false,
	"suggested_by" integer,
	"approved_by" integer,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create service_areas table
CREATE TABLE "service_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"name" text NOT NULL,
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"is_primary" boolean DEFAULT false,
	"travel_fee" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create tag_suggestions table
CREATE TABLE "tag_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggested_by" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'PENDING',
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create service_suggestions table
CREATE TABLE "service_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"suggested_by" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"emoji" varchar(10) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'PENDING',
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Update user_services table
ALTER TABLE "user_services" ADD COLUMN "service_type_id" integer;
ALTER TABLE "user_services" ADD COLUMN "rate_type" text;
ALTER TABLE "user_services" ADD COLUMN "max_travel_distance" integer;
ALTER TABLE "user_services" ADD COLUMN "default_travel_fee" numeric(10, 2);
ALTER TABLE "user_services" ADD COLUMN "equipment_details" text;
ALTER TABLE "user_services" ADD COLUMN "available_days" text[];
ALTER TABLE "user_services" ADD COLUMN "available_times" text;

-- Update service_bookings table
ALTER TABLE "service_bookings" ADD COLUMN "provider_id" integer;
ALTER TABLE "service_bookings" ADD COLUMN "rate" numeric(10, 2);
ALTER TABLE "service_bookings" ADD COLUMN "currency" text DEFAULT 'PHP';
ALTER TABLE "service_bookings" ADD COLUMN "payment_status" text DEFAULT 'PENDING';

-- Update service_reviews table
ALTER TABLE "service_reviews" ADD COLUMN "booking_id" integer;
ALTER TABLE "service_reviews" ADD COLUMN "reviewee_id" integer;
ALTER TABLE "service_reviews" ADD COLUMN "communication_rating" integer;
ALTER TABLE "service_reviews" ADD COLUMN "punctuality_rating" integer;
ALTER TABLE "service_reviews" ADD COLUMN "skill_rating" integer;

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_types" ADD CONSTRAINT "service_types_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_types" ADD CONSTRAINT "service_types_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_service_id_user_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."user_services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "tag_suggestions" ADD CONSTRAINT "tag_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_suggestions" ADD CONSTRAINT "service_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_services" ADD CONSTRAINT "user_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_booking_id_service_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."service_bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
