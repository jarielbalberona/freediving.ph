-- +goose Up
-- +goose StatementBegin
ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check;

ALTER TABLE media_objects
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'event_logo',
    'event_cover',
    'school_logo',
    'school_cover',
    'payment_method_qr',
    'course_booking_receipt',
    'dive_spot_attachment',
    'group_logo',
    'group_cover',
    'instructor_certification_proof',
    'badge_proof'
  ));

CREATE TABLE IF NOT EXISTS badge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  value_type TEXT NOT NULL,
  unit TEXT,
  icon TEXT,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (category IN ('personal_best', 'certification', 'experience', 'auto_stat')),
  CHECK (value_type IN ('time', 'distance', 'number', 'text', 'none')),
  CHECK (length(trim(slug)) > 0),
  CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_template_id UUID NOT NULL REFERENCES badge_templates(id) ON DELETE RESTRICT,
  value_text TEXT,
  value_number NUMERIC(12, 2),
  value_minutes INTEGER,
  value_seconds INTEGER,
  reference_label TEXT,
  reference_value TEXT,
  proof_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  CHECK (value_minutes IS NULL OR value_minutes >= 0),
  CHECK (value_seconds IS NULL OR (value_seconds >= 0 AND value_seconds <= 59)),
  CHECK (value_number IS NULL OR value_number >= 0),
  CHECK (
    (verification_status = 'verified' AND verified_at IS NOT NULL)
    OR
    (verification_status <> 'verified')
  )
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_created_at
  ON user_badges (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_badges_template
  ON user_badges (badge_template_id);

INSERT INTO badge_templates (slug, name, category, value_type, unit, icon, description, is_system)
VALUES
  ('pb-static-apnea', 'PB Static Apnea', 'personal_best', 'time', NULL, 'timer', 'Personal best static apnea hold.', FALSE),
  ('pb-dynamic-no-fins', 'PB Dynamic No Fins', 'personal_best', 'distance', 'm', 'ruler', 'Personal best dynamic apnea without fins.', FALSE),
  ('pb-dynamic-bi-fins', 'PB Dynamic Bi-Fins', 'personal_best', 'distance', 'm', 'ruler', 'Personal best dynamic apnea with bi-fins.', FALSE),
  ('pb-dynamic-monofin', 'PB Dynamic Monofin', 'personal_best', 'distance', 'm', 'ruler', 'Personal best dynamic apnea with monofin.', FALSE),
  ('pb-constant-weight', 'PB Constant Weight', 'personal_best', 'distance', 'm', 'waves', 'Personal best constant weight dive.', FALSE),
  ('pb-constant-weight-bi-fins', 'PB Constant Weight Bi-Fins', 'personal_best', 'distance', 'm', 'waves', 'Personal best constant weight dive with bi-fins.', FALSE),
  ('pb-constant-weight-no-fins', 'PB Constant Weight No Fins', 'personal_best', 'distance', 'm', 'waves', 'Personal best constant weight dive without fins.', FALSE),
  ('pb-free-immersion', 'PB Free Immersion', 'personal_best', 'distance', 'm', 'waves', 'Personal best free immersion dive.', FALSE),
  ('molchanovs-lap-1', 'Molchanovs Lap 1', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-lap-2', 'Molchanovs Lap 2', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-wave-1', 'Molchanovs Wave 1', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-wave-2', 'Molchanovs Wave 2', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-wave-3', 'Molchanovs Wave 3', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-wave-4', 'Molchanovs Wave 4', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('molchanovs-instructor', 'Molchanovs Instructor', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('aida-1', 'AIDA 1', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('aida-2', 'AIDA 2', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('aida-3', 'AIDA 3', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('aida-4', 'AIDA 4', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('aida-instructor', 'AIDA Instructor', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('ssi-freediver', 'SSI Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('ssi-advanced-freediver', 'SSI Advanced Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('ssi-performance-freediver', 'SSI Performance Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('ssi-instructor', 'SSI Instructor', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('padi-freediver', 'PADI Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('padi-advanced-freediver', 'PADI Advanced Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('padi-master-freediver', 'PADI Master Freediver', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('padi-instructor', 'PADI Instructor', 'certification', 'none', NULL, 'badge-check', NULL, FALSE),
  ('safety-diver', 'Safety Diver', 'experience', 'none', NULL, 'shield-check', NULL, FALSE),
  ('competition-athlete', 'Competition Athlete', 'experience', 'none', NULL, 'trophy', NULL, FALSE),
  ('instructor', 'Instructor', 'experience', 'none', NULL, 'badge-check', NULL, FALSE),
  ('dive-guide', 'Dive Guide', 'experience', 'none', NULL, 'map', NULL, FALSE),
  ('underwater-photographer', 'Underwater Photographer', 'experience', 'none', NULL, 'camera', NULL, FALSE),
  ('marine-conservation-volunteer', 'Marine Conservation Volunteer', 'experience', 'none', NULL, 'leaf', NULL, FALSE),
  ('spearfisher', 'Spearfisher', 'experience', 'none', NULL, 'fish', NULL, FALSE),
  ('boat-captain', 'Boat Captain', 'experience', 'none', NULL, 'ship', NULL, FALSE),
  ('coach', 'Coach', 'experience', 'none', NULL, 'clipboard-check', NULL, FALSE),
  ('rescue-team-member', 'Rescue Team Member', 'experience', 'none', NULL, 'life-buoy', NULL, FALSE),
  ('dive-sites-visited', 'Dive Sites Visited', 'auto_stat', 'number', NULL, 'map-pinned', 'Distinct approved dive sites tagged in media posts and reports.', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  value_type = EXCLUDED.value_type,
  unit = EXCLUDED.unit,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badge_templates;

ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check;

ALTER TABLE media_objects
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'event_logo',
    'event_cover',
    'school_logo',
    'school_cover',
    'payment_method_qr',
    'course_booking_receipt',
    'dive_spot_attachment',
    'group_logo',
    'group_cover',
    'instructor_certification_proof'
  ));
-- +goose StatementEnd
