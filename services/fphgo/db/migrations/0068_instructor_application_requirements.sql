-- +goose Up
-- +goose StatementBegin
ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS specialties TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_affiliation TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_links TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS safety_credentials TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attestation_accepted_at TIMESTAMPTZ;

ALTER TABLE instructor_certifications
  ADD COLUMN IF NOT EXISTS official_verification_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'instructor_certifications_proof_required_check'
      AND conrelid = 'instructor_certifications'::regclass
  ) THEN
    ALTER TABLE instructor_certifications
      ADD CONSTRAINT instructor_certifications_proof_required_check
      CHECK (
        proof_media_id IS NOT NULL
        OR length(trim(COALESCE(official_verification_url, ''))) > 0
      ) NOT VALID;
  END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE instructor_certifications
  DROP CONSTRAINT IF EXISTS instructor_certifications_proof_required_check,
  DROP COLUMN IF EXISTS official_verification_url;

ALTER TABLE instructor_profiles
  DROP COLUMN IF EXISTS attestation_accepted_at,
  DROP COLUMN IF EXISTS safety_credentials,
  DROP COLUMN IF EXISTS social_links,
  DROP COLUMN IF EXISTS website_url,
  DROP COLUMN IF EXISTS school_affiliation,
  DROP COLUMN IF EXISTS specialties;
-- +goose StatementEnd
