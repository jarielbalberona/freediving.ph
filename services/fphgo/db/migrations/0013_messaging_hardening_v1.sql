-- +goose Up
-- +goose StatementBegin
ALTER TABLE messages ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key
  ON messages (conversation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_messages_idempotency_key;
ALTER TABLE messages DROP COLUMN IF EXISTS idempotency_key;
-- +goose StatementEnd
