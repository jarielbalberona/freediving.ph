-- +goose Up
-- +goose StatementBegin
UPDATE groups
SET join_policy = 'invite_only'
WHERE visibility = 'private'
  AND join_policy = 'open';

ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_private_invite_only_check;

ALTER TABLE groups
  ADD CONSTRAINT groups_private_invite_only_check
    CHECK (visibility <> 'private' OR join_policy = 'invite_only');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE groups
  DROP CONSTRAINT IF EXISTS groups_private_invite_only_check;
-- +goose StatementEnd
