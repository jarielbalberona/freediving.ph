-- +goose Up
-- +goose StatementBegin
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_price_check;

ALTER TABLE events
  ADD CONSTRAINT events_price_check CHECK (price_amount IS NULL OR price_amount >= 0);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_price_check;

UPDATE events
SET price_amount = NULL
WHERE is_paid = FALSE;

UPDATE events
SET price_amount = 0
WHERE is_paid = TRUE
  AND price_amount IS NULL;

ALTER TABLE events
  ADD CONSTRAINT events_price_check CHECK (
    (is_paid = FALSE AND price_amount IS NULL)
    OR (is_paid = TRUE AND price_amount IS NOT NULL AND price_amount >= 0)
  );
-- +goose StatementEnd
