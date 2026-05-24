-- +goose Up
-- +goose StatementBegin
ALTER TABLE media_objects
  DROP CONSTRAINT IF EXISTS media_objects_context_type_check,
  ADD CONSTRAINT media_objects_context_type_check CHECK (context_type IN (
    'profile_avatar',
    'profile_feed',
    'chika_attachment',
    'event_attachment',
    'payment_method_qr',
    'course_booking_receipt',
    'dive_spot_attachment',
    'group_cover',
    'instructor_certification_proof'
  ));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
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
-- +goose StatementEnd
