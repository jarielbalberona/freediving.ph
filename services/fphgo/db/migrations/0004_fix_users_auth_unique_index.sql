-- +goose Up
-- +goose StatementBegin
-- Drop the partial unique index if it exists
DROP INDEX IF EXISTS idx_users_auth_provider_subject;

-- Create a regular unique index (PostgreSQL naturally allows multiple NULLs in unique indexes)
CREATE UNIQUE INDEX idx_users_auth_provider_subject ON users (auth_provider, auth_provider_user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_users_auth_provider_subject;

-- Restore the partial unique index
CREATE UNIQUE INDEX idx_users_auth_provider_subject ON users (auth_provider, auth_provider_user_id) WHERE auth_provider_user_id IS NOT NULL;
-- +goose StatementEnd
