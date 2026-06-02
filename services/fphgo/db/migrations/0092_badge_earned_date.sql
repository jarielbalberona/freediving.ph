-- +goose Up
-- +goose StatementBegin
ALTER TABLE user_badges
  ADD COLUMN IF NOT EXISTS earned_date DATE;

UPDATE user_badges
SET earned_date = COALESCE(earned_date, earned_at::date, created_at::date)
WHERE earned_date IS NULL;

ALTER TABLE user_badges
  ALTER COLUMN earned_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN earned_date SET NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE user_badges
  ALTER COLUMN earned_date DROP NOT NULL,
  ALTER COLUMN earned_date DROP DEFAULT;

ALTER TABLE user_badges
  DROP COLUMN IF EXISTS earned_date;
-- +goose StatementEnd
