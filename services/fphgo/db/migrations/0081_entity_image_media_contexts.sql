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
    'dive_spot_attachment',
    'group_logo',
    'group_cover',
    'payment_method_qr',
    'course_booking_receipt',
    'instructor_certification_proof'
  ));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check;

ALTER TABLE media_objects
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'dive_spot_attachment',
    'group_cover'
  ));
-- +goose StatementEnd
