-- +goose Up
-- +goose StatementBegin
ALTER TABLE feed_impressions
  DROP CONSTRAINT IF EXISTS feed_impressions_mode_check,
  ADD CONSTRAINT feed_impressions_mode_check
    CHECK (mode IN ('latest', 'nearby', 'chika', 'dive-reports', 'events', 'following', 'training', 'spot-reports'));

ALTER TABLE feed_actions
  DROP CONSTRAINT IF EXISTS feed_actions_mode_check,
  ADD CONSTRAINT feed_actions_mode_check
    CHECK (mode IN ('latest', 'nearby', 'chika', 'dive-reports', 'events', 'following', 'training', 'spot-reports'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE feed_actions
  DROP CONSTRAINT IF EXISTS feed_actions_mode_check,
  ADD CONSTRAINT feed_actions_mode_check
    CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports'));

ALTER TABLE feed_impressions
  DROP CONSTRAINT IF EXISTS feed_impressions_mode_check,
  ADD CONSTRAINT feed_impressions_mode_check
    CHECK (mode IN ('following', 'nearby', 'training', 'spot-reports'));
-- +goose StatementEnd
