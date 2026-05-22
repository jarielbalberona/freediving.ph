-- +goose Up
-- +goose StatementBegin
-- Runtime slug generation normalizes accents where supported. The SQL backfill
-- strips unsupported non-ASCII characters for deterministic migration safety,
-- so existing accented names may produce simpler ASCII slugs than new rows.
-- This migration rewrites existing group/event/Chika slugs and creates unique
-- indexes inside the goose transaction. Run during a maintenance window if
-- these tables have meaningful production write volume.
CREATE OR REPLACE FUNCTION fph_slug_raw(value TEXT, max_len INTEGER DEFAULT 80)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := lower(trim(both '-' from regexp_replace(coalesce(value, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  cleaned := regexp_replace(cleaned, '-+', '-', 'g');
  cleaned := trim(both '-' from cleaned);
  IF max_len > 0 AND length(cleaned) > max_len THEN
    cleaned := trim(both '-' from left(cleaned, max_len));
  END IF;
  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION fph_slug_append(base_value TEXT, suffix_value TEXT, max_len INTEGER DEFAULT 80)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_slug TEXT;
  suffix_slug TEXT;
  base_limit INTEGER;
BEGIN
  base_slug := fph_slug_raw(base_value, max_len);
  suffix_slug := fph_slug_raw(suffix_value, max_len);
  IF base_slug = '' THEN
    RETURN suffix_slug;
  END IF;
  IF suffix_slug = '' THEN
    RETURN base_slug;
  END IF;
  base_limit := max_len - length(suffix_slug) - 1;
  IF base_limit < 1 THEN
    base_limit := 1;
  END IF;
  base_slug := trim(both '-' from left(base_slug, base_limit));
  IF base_slug = '' THEN
    RETURN suffix_slug;
  END IF;
  RETURN base_slug || '-' || suffix_slug;
END;
$$;

CREATE OR REPLACE FUNCTION fph_slug_base(value TEXT, fallback TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidate TEXT;
  fallback_slug TEXT;
BEGIN
  candidate := fph_slug_raw(value, 80);
  fallback_slug := fph_slug_raw(fallback, 80);
  IF fallback_slug = '' THEN
    fallback_slug := 'item';
  END IF;
  IF candidate = '' THEN
    candidate := fallback_slug;
  END IF;
  IF candidate IN ('create', 'edit', 'new', 'settings', 'admin', 'api')
     OR candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    candidate := fph_slug_append(candidate, fallback_slug, 80);
  END IF;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION fph_slug_content_words(value TEXT, max_words INTEGER DEFAULT 3)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  token TEXT;
  tokens TEXT[];
  words TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF max_words <= 0 THEN
    RETURN '';
  END IF;
  tokens := string_to_array(fph_slug_raw(value, 240), '-');
  FOREACH token IN ARRAY tokens LOOP
    IF token = '' OR token = ANY(ARRAY[
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with'
    ]) THEN
      CONTINUE;
    END IF;
    words := array_append(words, token);
    IF array_length(words, 1) >= max_words THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN array_to_string(words, '-');
END;
$$;

CREATE TEMP TABLE fph_slug_assignments (
  entity TEXT NOT NULL,
  id UUID NOT NULL,
  slug TEXT NOT NULL,
  PRIMARY KEY (entity, id),
  UNIQUE (entity, slug)
) ON COMMIT DROP;

UPDATE groups
SET slug = fph_slug_append('group-migrate', substr(id::text, 1, 8), 80);

DO $$
DECLARE
  item RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  DELETE FROM fph_slug_assignments WHERE entity = 'groups';
  FOR item IN SELECT id, name FROM groups ORDER BY created_at ASC, id ASC LOOP
    base_slug := fph_slug_base(item.name, 'group');
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM fph_slug_assignments WHERE entity = 'groups' AND slug = candidate) LOOP
      candidate := fph_slug_append(base_slug, suffix::text, 80);
      suffix := suffix + 1;
    END LOOP;
    INSERT INTO fph_slug_assignments(entity, id, slug) VALUES ('groups', item.id, candidate);
  END LOOP;
END;
$$;

UPDATE groups g
SET slug = a.slug
FROM fph_slug_assignments a
WHERE a.entity = 'groups'
  AND a.id = g.id;

ALTER TABLE groups
  ALTER COLUMN slug SET NOT NULL;
DROP INDEX IF EXISTS idx_groups_slug;
CREATE UNIQUE INDEX idx_groups_slug ON groups (slug);

UPDATE events
SET slug = fph_slug_append('event-migrate', substr(id::text, 1, 8), 80);

DO $$
DECLARE
  item RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  DELETE FROM fph_slug_assignments WHERE entity = 'events';
  FOR item IN SELECT id, title FROM events ORDER BY created_at ASC, id ASC LOOP
    base_slug := fph_slug_base(item.title, 'event');
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM fph_slug_assignments WHERE entity = 'events' AND slug = candidate) LOOP
      candidate := fph_slug_append(base_slug, suffix::text, 80);
      suffix := suffix + 1;
    END LOOP;
    INSERT INTO fph_slug_assignments(entity, id, slug) VALUES ('events', item.id, candidate);
  END LOOP;
END;
$$;

UPDATE events e
SET slug = a.slug
FROM fph_slug_assignments a
WHERE a.entity = 'events'
  AND a.id = e.id;

DROP INDEX IF EXISTS idx_events_slug_unique;
ALTER TABLE events
  ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_events_slug_unique ON events (slug);

ALTER TABLE chika_threads
  ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  item RECORD;
  title_slug TEXT;
  content_words TEXT;
  base_slug TEXT;
  candidate TEXT;
  word_count INTEGER;
  suffix INTEGER;
BEGIN
  DELETE FROM fph_slug_assignments WHERE entity = 'chika';
  FOR item IN
    SELECT
      t.id,
      t.title,
      COALESCE(fp.content, '') AS content
    FROM chika_threads t
    LEFT JOIN LATERAL (
      SELECT cp.content
      FROM chika_posts cp
      WHERE cp.thread_id = t.id
        AND cp.deleted_at IS NULL
      ORDER BY cp.created_at ASC, cp.id ASC
      LIMIT 1
    ) fp ON TRUE
    ORDER BY t.created_at ASC, t.id ASC
  LOOP
    title_slug := fph_slug_base(item.title, 'chika');
    base_slug := title_slug;
    IF EXISTS (SELECT 1 FROM fph_slug_assignments WHERE entity = 'chika' AND slug = title_slug) THEN
      FOR word_count IN 1..3 LOOP
        content_words := fph_slug_content_words(item.content, word_count);
        IF content_words = '' THEN
          EXIT;
        END IF;
        candidate := fph_slug_append(title_slug, content_words, 80);
        base_slug := candidate;
        IF NOT EXISTS (SELECT 1 FROM fph_slug_assignments WHERE entity = 'chika' AND slug = candidate) THEN
          EXIT;
        END IF;
      END LOOP;
    END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM fph_slug_assignments WHERE entity = 'chika' AND slug = candidate) LOOP
      candidate := fph_slug_append(base_slug, suffix::text, 80);
      suffix := suffix + 1;
    END LOOP;
    INSERT INTO fph_slug_assignments(entity, id, slug) VALUES ('chika', item.id, candidate);
  END LOOP;
END;
$$;

UPDATE chika_threads t
SET slug = a.slug
FROM fph_slug_assignments a
WHERE a.entity = 'chika'
  AND a.id = t.id;

ALTER TABLE chika_threads
  ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chika_threads_slug_unique ON chika_threads (slug);

DROP FUNCTION IF EXISTS fph_slug_content_words(TEXT, INTEGER);
DROP FUNCTION IF EXISTS fph_slug_base(TEXT, TEXT);
DROP FUNCTION IF EXISTS fph_slug_append(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS fph_slug_raw(TEXT, INTEGER);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_chika_threads_slug_unique;
ALTER TABLE chika_threads
  DROP COLUMN IF EXISTS slug;

DROP INDEX IF EXISTS idx_events_slug_unique;
ALTER TABLE events
  ALTER COLUMN slug DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique
  ON events (slug)
  WHERE slug IS NOT NULL;
-- +goose StatementEnd
