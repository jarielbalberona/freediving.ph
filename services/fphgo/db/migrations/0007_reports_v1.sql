-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  details TEXT,
  evidence_urls JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_type IN ('user', 'message', 'chika_thread', 'chika_comment')),
  CHECK (reason_code IN ('spam', 'harassment', 'impersonation', 'unsafe', 'other')),
  CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_type IN ('created', 'status_changed', 'note_added'))
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_app_user ON reports (reporter_app_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_lookup ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_report_events_report_id ON report_events (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_events_actor_app_user ON report_events (actor_app_user_id, created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_report_events_actor_app_user;
DROP INDEX IF EXISTS idx_report_events_report_id;
DROP INDEX IF EXISTS idx_reports_target_lookup;
DROP INDEX IF EXISTS idx_reports_reporter_app_user;
DROP INDEX IF EXISTS idx_reports_status_created_at;

DROP TABLE IF EXISTS report_events;
DROP TABLE IF EXISTS reports;
-- +goose StatementEnd
