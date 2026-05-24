-- +goose Up
-- +goose StatementBegin
ALTER TABLE event_payment_methods
  ADD COLUMN IF NOT EXISTS qr_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL;

ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check,
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'payment_method_qr',
    'dive_spot_attachment',
    'group_cover',
    'instructor_certification_proof'
  ));

ALTER TABLE event_payment_methods
  DROP CONSTRAINT IF EXISTS event_payment_methods_type_check;

UPDATE event_payment_methods
SET type = CASE
  WHEN type = 'MANUAL_QR' THEN 'manual_qr'
  WHEN type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
  ELSE type
END;

ALTER TABLE event_payment_methods
  ADD CONSTRAINT event_payment_methods_type_check CHECK (type IN ('manual_qr', 'bank_transfer'));

UPDATE event_payment_methods
SET is_active = FALSE
WHERE is_active = TRUE
  AND (
    (type = 'manual_qr' AND qr_media_id IS NULL AND NULLIF(trim(COALESCE(qr_image_url, '')), '') IS NULL)
    OR
    (type = 'bank_transfer' AND (
      NULLIF(trim(COALESCE(bank_name, '')), '') IS NULL
      OR NULLIF(trim(COALESCE(account_name, '')), '') IS NULL
      OR NULLIF(trim(COALESCE(account_number, '')), '') IS NULL
    ))
  );

ALTER TABLE event_payment_methods
  DROP CONSTRAINT IF EXISTS event_payment_methods_active_details_check,
  ADD CONSTRAINT event_payment_methods_active_details_check CHECK (
    NOT is_active
    OR (
      type = 'manual_qr'
      AND (qr_media_id IS NOT NULL OR NULLIF(trim(COALESCE(qr_image_url, '')), '') IS NOT NULL)
    )
    OR (
      type = 'bank_transfer'
      AND NULLIF(trim(COALESCE(bank_name, '')), '') IS NOT NULL
      AND NULLIF(trim(COALESCE(account_name, '')), '') IS NOT NULL
      AND NULLIF(trim(COALESCE(account_number, '')), '') IS NOT NULL
    )
  );

CREATE TABLE IF NOT EXISTS school_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
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
  CHECK (type IN ('manual_qr', 'bank_transfer')),
  CHECK (length(trim(name)) > 0),
  CHECK (
    NOT is_active
    OR (type = 'manual_qr' AND qr_media_id IS NOT NULL)
    OR (
      type = 'bank_transfer'
      AND NULLIF(trim(COALESCE(bank_name, '')), '') IS NOT NULL
      AND NULLIF(trim(COALESCE(account_name, '')), '') IS NOT NULL
      AND NULLIF(trim(COALESCE(account_number, '')), '') IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_school_payment_methods_school_active
  ON school_payment_methods (school_id, is_active)
  WHERE deleted_at IS NULL;

WITH normalized_course_methods AS (
  SELECT DISTINCT ON (
    c.school_id,
    CASE
      WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
      WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
      ELSE cpm.type
    END,
    cpm.name,
    COALESCE(cpm.instructions, ''),
    COALESCE(cpm.qr_media_id::text, ''),
    COALESCE(cpm.bank_name, ''),
    COALESCE(cpm.account_name, ''),
    COALESCE(cpm.account_number, '')
  )
    c.school_id,
    CASE
      WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
      WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
      ELSE cpm.type
    END AS type,
    cpm.name,
    cpm.instructions,
    cpm.qr_media_id,
    cpm.bank_name,
    cpm.account_name,
    cpm.account_number,
    cpm.is_active
      AND (
        (
          CASE
            WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
            WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
            ELSE cpm.type
          END = 'manual_qr'
          AND cpm.qr_media_id IS NOT NULL
        )
        OR (
          CASE
            WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
            WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
            ELSE cpm.type
          END = 'bank_transfer'
          AND NULLIF(trim(COALESCE(cpm.bank_name, '')), '') IS NOT NULL
          AND NULLIF(trim(COALESCE(cpm.account_name, '')), '') IS NOT NULL
          AND NULLIF(trim(COALESCE(cpm.account_number, '')), '') IS NOT NULL
        )
      ) AS is_active,
    cpm.created_at,
    cpm.updated_at
  FROM course_payment_methods cpm
  JOIN courses c ON c.id = cpm.course_id
  WHERE cpm.deleted_at IS NULL
  ORDER BY
    c.school_id,
    CASE
      WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
      WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
      ELSE cpm.type
    END,
    cpm.name,
    COALESCE(cpm.instructions, ''),
    COALESCE(cpm.qr_media_id::text, ''),
    COALESCE(cpm.bank_name, ''),
    COALESCE(cpm.account_name, ''),
    COALESCE(cpm.account_number, ''),
    cpm.created_at ASC
)
INSERT INTO school_payment_methods (
  school_id, type, name, instructions, qr_media_id, bank_name,
  account_name, account_number, is_active, created_at, updated_at
)
SELECT
  school_id, type, name, instructions, qr_media_id, bank_name,
  account_name, account_number, is_active, created_at, updated_at
FROM normalized_course_methods;

ALTER TABLE course_booking_payments
  DROP CONSTRAINT IF EXISTS course_booking_payments_payment_method_id_fkey;

WITH method_mapping AS (
  SELECT DISTINCT ON (cpm.id)
    cpm.id AS old_method_id,
    spm.id AS new_method_id
  FROM course_payment_methods cpm
  JOIN courses c ON c.id = cpm.course_id
  JOIN school_payment_methods spm
    ON spm.school_id = c.school_id
    AND spm.type = CASE
      WHEN cpm.type = 'MANUAL_QR' THEN 'manual_qr'
      WHEN cpm.type = 'MANUAL_BANK_TRANSFER' THEN 'bank_transfer'
      ELSE cpm.type
    END
    AND spm.name = cpm.name
    AND COALESCE(spm.instructions, '') = COALESCE(cpm.instructions, '')
    AND COALESCE(spm.qr_media_id::text, '') = COALESCE(cpm.qr_media_id::text, '')
    AND COALESCE(spm.bank_name, '') = COALESCE(cpm.bank_name, '')
    AND COALESCE(spm.account_name, '') = COALESCE(cpm.account_name, '')
    AND COALESCE(spm.account_number, '') = COALESCE(cpm.account_number, '')
  WHERE cpm.deleted_at IS NULL
  ORDER BY cpm.id, spm.created_at ASC
)
UPDATE course_booking_payments bp
SET payment_method_id = method_mapping.new_method_id
FROM method_mapping
WHERE bp.payment_method_id = method_mapping.old_method_id;

UPDATE course_booking_payments bp
SET payment_method_id = NULL
WHERE bp.payment_method_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM school_payment_methods spm WHERE spm.id = bp.payment_method_id
  );

ALTER TABLE course_booking_payments
  ADD CONSTRAINT course_booking_payments_payment_method_id_fkey
    FOREIGN KEY (payment_method_id) REFERENCES school_payment_methods(id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE course_booking_payments
  DROP CONSTRAINT IF EXISTS course_booking_payments_payment_method_id_fkey,
  ALTER COLUMN payment_method_id DROP NOT NULL;

UPDATE course_booking_payments bp
SET payment_method_id = NULL
WHERE payment_method_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_payment_methods cpm WHERE cpm.id = bp.payment_method_id
  );

ALTER TABLE course_booking_payments
  ADD CONSTRAINT course_booking_payments_payment_method_id_fkey
    FOREIGN KEY (payment_method_id) REFERENCES course_payment_methods(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_school_payment_methods_school_active;
DROP TABLE IF EXISTS school_payment_methods;

ALTER TABLE event_payment_methods
  DROP CONSTRAINT IF EXISTS event_payment_methods_active_details_check,
  DROP CONSTRAINT IF EXISTS event_payment_methods_type_check,
  ADD CONSTRAINT event_payment_methods_type_check CHECK (type IN ('MANUAL_QR', 'MANUAL_BANK_TRANSFER'));

UPDATE event_payment_methods
SET type = CASE
  WHEN type = 'manual_qr' THEN 'MANUAL_QR'
  WHEN type = 'bank_transfer' THEN 'MANUAL_BANK_TRANSFER'
  ELSE type
END;

ALTER TABLE event_payment_methods
  DROP COLUMN IF EXISTS qr_media_id;

ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check,
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'dive_spot_attachment',
    'group_cover',
    'instructor_certification_proof'
  ));
-- +goose StatementEnd
