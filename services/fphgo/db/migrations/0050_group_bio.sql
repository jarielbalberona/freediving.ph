-- +goose Up
-- +goose StatementBegin
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS bio TEXT;

UPDATE groups
SET bio = NULLIF(BTRIM(LEFT(description, 280)), '')
WHERE (bio IS NULL OR BTRIM(bio) = '')
  AND description IS NOT NULL
  AND BTRIM(description) <> '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE groups
  DROP COLUMN IF EXISTS bio;
-- +goose StatementEnd
