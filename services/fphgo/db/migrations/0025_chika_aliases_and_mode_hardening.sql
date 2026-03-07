-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS chika_thread_aliases (
  thread_id UUID NOT NULL REFERENCES chika_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id),
  UNIQUE (thread_id, pseudonym)
);

CREATE INDEX IF NOT EXISTS idx_chika_thread_aliases_user
  ON chika_thread_aliases (user_id, created_at DESC);

INSERT INTO chika_thread_aliases (thread_id, user_id, pseudonym)
SELECT DISTINCT c.thread_id, c.author_user_id, c.pseudonym
FROM chika_comments c
WHERE c.deleted_at IS NULL
ON CONFLICT (thread_id, user_id) DO UPDATE
SET pseudonym = EXCLUDED.pseudonym,
    updated_at = NOW();

INSERT INTO chika_thread_aliases (thread_id, user_id, pseudonym)
SELECT DISTINCT p.thread_id, p.author_user_id, p.pseudonym
FROM chika_posts p
WHERE p.deleted_at IS NULL
ON CONFLICT (thread_id, user_id) DO UPDATE
SET pseudonym = EXCLUDED.pseudonym,
    updated_at = NOW();

ALTER TABLE chika_threads
  DROP CONSTRAINT IF EXISTS chika_threads_mode_check;

ALTER TABLE chika_threads
  ADD CONSTRAINT chika_threads_mode_check
  CHECK (mode IN ('normal', 'pseudonymous', 'locked_pseudonymous'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE chika_threads
  DROP CONSTRAINT IF EXISTS chika_threads_mode_check;

ALTER TABLE chika_threads
  ADD CONSTRAINT chika_threads_mode_check
  CHECK (mode IN ('normal', 'pseudonymous'));

DROP INDEX IF EXISTS idx_chika_thread_aliases_user;
DROP TABLE IF EXISTS chika_thread_aliases;
-- +goose StatementEnd
