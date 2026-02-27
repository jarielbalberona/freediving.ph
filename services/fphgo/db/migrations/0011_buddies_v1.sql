-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS buddy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requester_app_user_id <> target_app_user_id),
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS buddies (
  app_user_id_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_user_id_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_user_id_a, app_user_id_b),
  CHECK (app_user_id_a < app_user_id_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buddy_requests_pending_pair
  ON buddy_requests (requester_app_user_id, target_app_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_buddy_requests_target_pending
  ON buddy_requests (target_app_user_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_buddy_requests_requester_pending
  ON buddy_requests (requester_app_user_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_buddies_user_a_created
  ON buddies (app_user_id_a, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buddies_user_b_created
  ON buddies (app_user_id_b, created_at DESC);

INSERT INTO buddies (app_user_id_a, app_user_id_b, created_at)
SELECT
  LEAST(br.user_id, br.buddy_id) AS app_user_id_a,
  GREATEST(br.user_id, br.buddy_id) AS app_user_id_b,
  MIN(br.created_at) AS created_at
FROM buddy_relationships br
WHERE br.status = 'accepted'
GROUP BY LEAST(br.user_id, br.buddy_id), GREATEST(br.user_id, br.buddy_id)
ON CONFLICT (app_user_id_a, app_user_id_b) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_buddies_user_b_created;
DROP INDEX IF EXISTS idx_buddies_user_a_created;
DROP INDEX IF EXISTS idx_buddy_requests_requester_pending;
DROP INDEX IF EXISTS idx_buddy_requests_target_pending;
DROP INDEX IF EXISTS idx_buddy_requests_pending_pair;
DROP TABLE IF EXISTS buddies;
DROP TABLE IF EXISTS buddy_requests;
-- +goose StatementEnd
