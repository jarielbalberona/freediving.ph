-- +goose Up
-- +goose StatementBegin
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS allow_session_booking BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_preferred_date_request BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE courses
SET allow_session_booking = FALSE,
    allow_preferred_date_request = TRUE
WHERE allow_session_booking IS DISTINCT FROM FALSE
   OR allow_preferred_date_request IS DISTINCT FROM TRUE;

ALTER TABLE course_booking_requests
  ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'preferred_date';

UPDATE course_booking_requests
SET booking_mode = CASE
  WHEN session_id IS NOT NULL AND preferred_date IS NULL THEN 'session'
  ELSE 'preferred_date'
END
WHERE booking_mode IS NULL OR booking_mode = '';

ALTER TABLE course_booking_requests
  ALTER COLUMN preferred_date DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS course_booking_requests_booking_mode_check,
  ADD CONSTRAINT course_booking_requests_booking_mode_check
    CHECK (booking_mode IN ('session', 'preferred_date'));

CREATE INDEX IF NOT EXISTS idx_course_sessions_course_status_starts
  ON course_sessions (course_id, status, starts_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_booking_requests_session_status
  ON course_booking_requests (session_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_booking_requests_booking_mode
  ON course_booking_requests (school_id, booking_mode)
  WHERE deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_course_booking_requests_booking_mode;
DROP INDEX IF EXISTS idx_course_sessions_course_status_starts;

UPDATE course_booking_requests
SET preferred_date = CURRENT_DATE
WHERE preferred_date IS NULL;

ALTER TABLE course_booking_requests
  DROP CONSTRAINT IF EXISTS course_booking_requests_booking_mode_check,
  ALTER COLUMN preferred_date SET NOT NULL,
  DROP COLUMN IF EXISTS booking_mode;

ALTER TABLE courses
  DROP COLUMN IF EXISTS allow_preferred_date_request,
  DROP COLUMN IF EXISTS allow_session_booking;
-- +goose StatementEnd
