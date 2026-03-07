-- +goose Up
-- +goose NO TRANSACTION
ALTER TYPE message_inbox_category ADD VALUE IF NOT EXISTS 'transactions';

UPDATE message_thread_members
SET inbox_category = 'transactions'::message_inbox_category
WHERE inbox_category::text = 'general';

-- +goose Down
UPDATE message_thread_members
SET inbox_category = 'general'::message_inbox_category
WHERE inbox_category::text = 'transactions';
