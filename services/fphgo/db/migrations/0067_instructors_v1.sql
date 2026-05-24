-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS instructor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  teaching_since DATE,
  home_location_label TEXT NOT NULL DEFAULT '',
  specialties TEXT NOT NULL DEFAULT '',
  school_affiliation TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  social_links TEXT NOT NULL DEFAULT '',
  safety_credentials TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'draft',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  attestation_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status IN ('draft', 'pending', 'verified', 'rejected', 'suspended'))
);

CREATE TABLE IF NOT EXISTS instructor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_profile_id UUID NOT NULL REFERENCES instructor_profiles(id) ON DELETE CASCADE,
  agency TEXT NOT NULL,
  agency_other_name TEXT,
  certification_level TEXT NOT NULL,
  certification_number TEXT,
  issued_at DATE,
  expires_at DATE,
  proof_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  official_verification_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (agency IN ('molchanovs', 'padi', 'aida', 'ssi', 'raid', 'apnea_academy', 'other')),
  CHECK (length(trim(certification_level)) > 0),
  CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at),
  CONSTRAINT instructor_certifications_proof_required_check
    CHECK (proof_media_id IS NOT NULL OR length(trim(COALESCE(official_verification_url, ''))) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_status ON instructor_profiles (verification_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_certifications_profile ON instructor_certifications (instructor_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_certifications_agency ON instructor_certifications (agency);

ALTER TABLE school_members DROP CONSTRAINT IF EXISTS school_members_role_check;
ALTER TABLE school_members
  ADD CONSTRAINT school_members_role_check
  CHECK (role IN ('owner', 'admin', 'instructor', 'coach', 'staff'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE school_members DROP CONSTRAINT IF EXISTS school_members_role_check;
ALTER TABLE school_members
  ADD CONSTRAINT school_members_role_check
  CHECK (role IN ('owner', 'admin', 'instructor'));

DROP INDEX IF EXISTS idx_instructor_certifications_agency;
DROP INDEX IF EXISTS idx_instructor_certifications_profile;
DROP INDEX IF EXISTS idx_instructor_profiles_status;
DROP INDEX IF EXISTS idx_instructor_profiles_user_id;

DROP TABLE IF EXISTS instructor_certifications;
DROP TABLE IF EXISTS instructor_profiles;
-- +goose StatementEnd
