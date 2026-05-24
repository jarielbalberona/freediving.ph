-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description_markdown TEXT NOT NULL DEFAULT '',
  logo_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  cover_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  base_location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(slug)) > 0),
  CHECK (length(trim(name)) > 0),
  CHECK (status IN ('draft', 'published', 'suspended'))
);

CREATE TABLE IF NOT EXISTS school_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (role IN ('owner', 'admin', 'instructor')),
  CHECK (status IN ('active', 'invited', 'removed'))
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description_markdown TEXT NOT NULL DEFAULT '',
  course_type TEXT NOT NULL DEFAULT 'custom',
  level TEXT,
  duration_label TEXT,
  price_amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  payment_required BOOLEAN NOT NULL DEFAULT FALSE,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  location_label TEXT,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  included_markdown TEXT,
  prerequisites_markdown TEXT,
  equipment_markdown TEXT,
  cancellation_policy_markdown TEXT,
  availability_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(slug)) > 0),
  CHECK (length(trim(title)) > 0),
  CHECK (course_type IN ('intro', 'pool_training', 'line_training', 'depth_training', 'certification', 'coaching', 'workshop', 'trip_course', 'custom')),
  CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  CHECK (price_amount IS NULL OR price_amount >= 0)
);

CREATE TABLE IF NOT EXISTS course_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT,
  qr_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (type IN ('MANUAL_QR', 'MANUAL_BANK_TRANSFER')),
  CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  location_label TEXT,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  instructor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  notes_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(slug)) > 0),
  CHECK (length(trim(title)) > 0),
  CHECK (ends_at > starts_at),
  CHECK (capacity IS NULL OR capacity > 0),
  CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS course_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL,
  student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT,
  preferred_date DATE NOT NULL,
  alternate_date DATE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  student_note TEXT,
  experience_level TEXT,
  certification_level TEXT,
  equipment_needs TEXT,
  answers_json JSONB,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (status IN ('pending_review', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled', 'reschedule_requested'))
);

CREATE TABLE IF NOT EXISTS course_booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES course_booking_requests(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES course_payment_methods(id) ON DELETE SET NULL,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  proof_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'not_required',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (booking_id),
  CHECK (amount IS NULL OR amount >= 0),
  CHECK (status IN ('not_required', 'pending_upload', 'submitted', 'verified', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_slug_active ON schools (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schools_owner_user_id ON schools (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_members_school_user_active ON school_members (school_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_school_members_school_user ON school_members (school_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_school_slug_active ON courses (school_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_school_status ON courses (school_id, status);
CREATE INDEX IF NOT EXISTS idx_course_payment_methods_course_active ON course_payment_methods (course_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_sessions_school_status ON course_sessions (school_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_sessions_course_starts ON course_sessions (course_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_sessions_school_starts ON course_sessions (school_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_sessions_slug ON course_sessions (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_sessions_school_slug_active ON course_sessions (school_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_requests_school_status ON course_booking_requests (school_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_requests_course_status ON course_booking_requests (course_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_requests_session_status ON course_booking_requests (session_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_requests_preferred_date ON course_booking_requests (preferred_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_payments_booking ON course_booking_payments (booking_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_booking_payments_school_status ON course_booking_payments (school_id, status) WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_course_booking_payments_school_status;
DROP INDEX IF EXISTS idx_course_booking_payments_booking;
DROP INDEX IF EXISTS idx_course_booking_requests_preferred_date;
DROP INDEX IF EXISTS idx_course_booking_requests_session_status;
DROP INDEX IF EXISTS idx_course_booking_requests_course_status;
DROP INDEX IF EXISTS idx_course_booking_requests_school_status;
DROP INDEX IF EXISTS idx_course_sessions_school_slug_active;
DROP INDEX IF EXISTS idx_course_sessions_slug;
DROP INDEX IF EXISTS idx_course_sessions_school_starts;
DROP INDEX IF EXISTS idx_course_sessions_course_starts;
DROP INDEX IF EXISTS idx_course_sessions_school_status;
DROP INDEX IF EXISTS idx_course_payment_methods_course_active;
DROP INDEX IF EXISTS idx_courses_school_status;
DROP INDEX IF EXISTS idx_courses_school_slug_active;
DROP INDEX IF EXISTS idx_school_members_school_user;
DROP INDEX IF EXISTS idx_school_members_school_user_active;
DROP INDEX IF EXISTS idx_schools_status;
DROP INDEX IF EXISTS idx_schools_owner_user_id;
DROP INDEX IF EXISTS idx_schools_slug_active;

DROP TABLE IF EXISTS course_booking_payments;
DROP TABLE IF EXISTS course_booking_requests;
DROP TABLE IF EXISTS course_sessions;
DROP TABLE IF EXISTS course_payment_methods;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS school_members;
DROP TABLE IF EXISTS schools;
-- +goose StatementEnd
