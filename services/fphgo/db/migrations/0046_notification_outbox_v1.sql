-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON notification_outbox (status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_aggregate
  ON notification_outbox (aggregate_type, aggregate_id);
-- +goose StatementEnd
