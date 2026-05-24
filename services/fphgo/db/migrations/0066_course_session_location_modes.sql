-- +goose Up
ALTER TABLE courses ADD COLUMN IF NOT EXISTS location_mode TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS location_note TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS region_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS barangay_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS barangay_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS location_source TEXT;

ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS location_mode TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS location_note TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS region_name TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS province_name TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS city_code TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS barangay_code TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS barangay_name TEXT;
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS location_source TEXT;

UPDATE courses
SET location_mode = CASE
  WHEN NULLIF(trim(COALESCE(location_label, '')), '') IS NOT NULL THEN 'text_only'
  ELSE 'inherit_school'
END
WHERE location_mode IS NULL OR location_mode = '';

UPDATE course_sessions
SET location_mode = CASE
  WHEN NULLIF(trim(COALESCE(location_label, '')), '') IS NOT NULL THEN 'text_only'
  ELSE 'inherit_course'
END
WHERE location_mode IS NULL OR location_mode = '';

UPDATE courses SET location_source = 'manual' WHERE location_source IS NULL OR location_source = '';
UPDATE course_sessions SET location_source = 'manual' WHERE location_source IS NULL OR location_source = '';

ALTER TABLE courses ALTER COLUMN location_mode SET DEFAULT 'inherit_school';
ALTER TABLE courses ALTER COLUMN location_mode SET NOT NULL;
ALTER TABLE courses ALTER COLUMN location_source SET DEFAULT 'manual';
ALTER TABLE courses ALTER COLUMN location_source SET NOT NULL;

ALTER TABLE course_sessions ALTER COLUMN location_mode SET DEFAULT 'inherit_course';
ALTER TABLE course_sessions ALTER COLUMN location_mode SET NOT NULL;
ALTER TABLE course_sessions ALTER COLUMN location_source SET DEFAULT 'manual';
ALTER TABLE course_sessions ALTER COLUMN location_source SET NOT NULL;

-- +goose StatementBegin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_location_mode_check'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_location_mode_check
      CHECK (location_mode IN ('inherit_school', 'structured', 'text_only'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_sessions_location_mode_check'
  ) THEN
    ALTER TABLE course_sessions ADD CONSTRAINT course_sessions_location_mode_check
      CHECK (location_mode IN ('inherit_course', 'inherit_school', 'structured', 'text_only'));
  END IF;
END $$;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS idx_courses_location_mode ON courses(school_id, location_mode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_sessions_location_mode ON course_sessions(school_id, location_mode) WHERE deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_course_sessions_location_mode;
DROP INDEX IF EXISTS idx_courses_location_mode;

ALTER TABLE course_sessions DROP CONSTRAINT IF EXISTS course_sessions_location_mode_check;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_location_mode_check;

ALTER TABLE course_sessions DROP COLUMN IF EXISTS location_source;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS barangay_name;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS barangay_code;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS city_name;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS city_code;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS province_name;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS province_code;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS region_name;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS region_code;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS formatted_address;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS location_note;
ALTER TABLE course_sessions DROP COLUMN IF EXISTS location_mode;

ALTER TABLE courses DROP COLUMN IF EXISTS location_source;
ALTER TABLE courses DROP COLUMN IF EXISTS barangay_name;
ALTER TABLE courses DROP COLUMN IF EXISTS barangay_code;
ALTER TABLE courses DROP COLUMN IF EXISTS city_name;
ALTER TABLE courses DROP COLUMN IF EXISTS city_code;
ALTER TABLE courses DROP COLUMN IF EXISTS province_name;
ALTER TABLE courses DROP COLUMN IF EXISTS province_code;
ALTER TABLE courses DROP COLUMN IF EXISTS region_name;
ALTER TABLE courses DROP COLUMN IF EXISTS region_code;
ALTER TABLE courses DROP COLUMN IF EXISTS formatted_address;
ALTER TABLE courses DROP COLUMN IF EXISTS location_note;
ALTER TABLE courses DROP COLUMN IF EXISTS location_mode;
