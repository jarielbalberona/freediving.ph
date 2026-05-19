-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS activity_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,

  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  visibility TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',

  area TEXT,
  dive_site_id UUID REFERENCES dive_sites(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  occurred_at TIMESTAMPTZ NOT NULL,
  source_created_at TIMESTAMPTZ,

  title TEXT,
  body TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source_module, source_type, source_id, type),

  CHECK (visibility IN ('public', 'members', 'followers', 'group_members', 'private')),
  CHECK (state IN ('active', 'hidden', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_activity_items_public_cursor
  ON activity_items (occurred_at DESC, id DESC)
  WHERE state = 'active' AND visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_activity_items_visibility_cursor
  ON activity_items (visibility, occurred_at DESC, id DESC)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_activity_items_actor_cursor
  ON activity_items (actor_user_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_items_group_cursor
  ON activity_items (group_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_items_dive_site_cursor
  ON activity_items (dive_site_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND dive_site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_items_event_cursor
  ON activity_items (event_id, occurred_at DESC, id DESC)
  WHERE state = 'active' AND event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_items_source_lookup
  ON activity_items (source_module, source_type, source_id, type);

INSERT INTO activity_items (
  type,
  source_module,
  source_type,
  source_id,
  actor_user_id,
  target_type,
  target_id,
  visibility,
  state,
  occurred_at,
  source_created_at,
  title,
  stats,
  metadata
)
SELECT
  'chika_thread_created',
  'chika',
  'thread',
  t.id,
  t.created_by_user_id,
  'chika_thread',
  t.id,
  'public',
  'active',
  t.created_at,
  t.created_at,
  t.title,
  jsonb_build_object(
    'replies', COALESCE(reply_counts.count, 0),
    'reactions', COALESCE(reaction_counts.count, 0)
  ),
  jsonb_build_object(
    'mode', t.mode,
    'categorySlug', c.slug,
    'categoryName', c.name,
    'categoryPseudonymous', c.pseudonymous,
    'actorPseudonym', COALESCE(a.pseudonym, '')
  )
FROM chika_threads t
JOIN chika_categories c ON c.id = t.category_id
JOIN users u ON u.id = t.created_by_user_id AND u.account_status = 'active'
LEFT JOIN chika_thread_aliases a ON a.thread_id = t.id AND a.user_id = t.created_by_user_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS count
  FROM chika_posts p
  WHERE p.thread_id = t.id AND p.deleted_at IS NULL
) reply_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS count
  FROM chika_thread_reactions r
  WHERE r.thread_id = t.id
) reaction_counts ON true
WHERE t.hidden_at IS NULL
  AND t.deleted_at IS NULL
ON CONFLICT (source_module, source_type, source_id, type) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  visibility = EXCLUDED.visibility,
  state = EXCLUDED.state,
  occurred_at = EXCLUDED.occurred_at,
  source_created_at = EXCLUDED.source_created_at,
  title = EXCLUDED.title,
  stats = EXCLUDED.stats,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO activity_items (
  type,
  source_module,
  source_type,
  source_id,
  actor_user_id,
  target_type,
  target_id,
  visibility,
  state,
  area,
  dive_site_id,
  occurred_at,
  source_created_at,
  title,
  body,
  metadata
)
SELECT
  'dive_site_update_added',
  'explore',
  'dive_site_update',
  dsu.id,
  dsu.author_app_user_id,
  'dive_site',
  ds.id,
  'public',
  'active',
  ds.area,
  ds.id,
  dsu.occurred_at,
  dsu.created_at,
  ds.name,
  dsu.note,
  jsonb_build_object(
    'diveSiteSlug', ds.slug,
    'diveSiteName', ds.name,
    'current', COALESCE(dsu.condition_current, ''),
    'waves', COALESCE(dsu.condition_waves, ''),
    'visibilityMeters', dsu.condition_visibility_m,
    'tempC', dsu.condition_temp_c
  )
FROM dive_site_updates dsu
JOIN dive_sites ds ON ds.id = dsu.dive_site_id AND ds.moderation_state = 'approved'
JOIN users u ON u.id = dsu.author_app_user_id AND u.account_status = 'active'
WHERE dsu.state = 'active'
ON CONFLICT (source_module, source_type, source_id, type) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  visibility = EXCLUDED.visibility,
  state = EXCLUDED.state,
  area = EXCLUDED.area,
  dive_site_id = EXCLUDED.dive_site_id,
  occurred_at = EXCLUDED.occurred_at,
  source_created_at = EXCLUDED.source_created_at,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO activity_items (
  type,
  source_module,
  source_type,
  source_id,
  actor_user_id,
  target_type,
  target_id,
  visibility,
  state,
  area,
  group_id,
  event_id,
  occurred_at,
  source_created_at,
  title,
  body,
  metadata
)
SELECT
  'event_published',
  'events',
  'event',
  e.id,
  e.organizer_user_id,
  'event',
  e.id,
  CASE WHEN e.visibility = 'group_members' THEN 'group_members' ELSE 'public' END,
  'active',
  COALESCE(NULLIF(e.location_name, ''), NULLIF(e.formatted_address, ''), ''),
  e.group_id,
  e.id,
  COALESCE(e.starts_at, e.created_at),
  e.created_at,
  e.title,
  e.description,
  jsonb_build_object(
    'sourceVisibility', e.visibility,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'eventType', e.event_type,
    'difficulty', e.difficulty
  )
FROM events e
LEFT JOIN users u ON u.id = e.organizer_user_id
LEFT JOIN groups g ON g.id = e.group_id
WHERE e.status = 'published'
  AND e.visibility IN ('public', 'group_members')
  AND (e.organizer_user_id IS NULL OR u.account_status = 'active')
  AND (e.group_id IS NULL OR g.status = 'active')
ON CONFLICT (source_module, source_type, source_id, type) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  visibility = EXCLUDED.visibility,
  state = EXCLUDED.state,
  area = EXCLUDED.area,
  group_id = EXCLUDED.group_id,
  event_id = EXCLUDED.event_id,
  occurred_at = EXCLUDED.occurred_at,
  source_created_at = EXCLUDED.source_created_at,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO activity_items (
  type,
  source_module,
  source_type,
  source_id,
  actor_user_id,
  target_type,
  target_id,
  visibility,
  state,
  area,
  dive_site_id,
  occurred_at,
  source_created_at,
  title,
  body,
  metadata
)
SELECT
  'buddy_intent_created',
  'buddy_finder',
  'buddy_intent',
  bi.id,
  bi.author_app_user_id,
  'buddy_intent',
  bi.id,
  'members',
  'active',
  bi.area,
  bi.dive_site_id,
  bi.created_at,
  bi.created_at,
  bi.intent_type,
  COALESCE(bi.note, ''),
  jsonb_build_object(
    'intentType', bi.intent_type,
    'timeWindow', bi.time_window,
    'expiresAt', bi.expires_at
  )
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id AND u.account_status = 'active'
LEFT JOIN dive_sites ds ON ds.id = bi.dive_site_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND (bi.dive_site_id IS NULL OR ds.moderation_state = 'approved')
ON CONFLICT (source_module, source_type, source_id, type) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  visibility = EXCLUDED.visibility,
  state = EXCLUDED.state,
  area = EXCLUDED.area,
  dive_site_id = EXCLUDED.dive_site_id,
  occurred_at = EXCLUDED.occurred_at,
  source_created_at = EXCLUDED.source_created_at,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO activity_items (
  type,
  source_module,
  source_type,
  source_id,
  actor_user_id,
  target_type,
  target_id,
  visibility,
  state,
  area,
  dive_site_id,
  occurred_at,
  source_created_at,
  title,
  body,
  media,
  stats,
  metadata
)
SELECT
  'media_post_created',
  'media',
  'media_post',
  mp.id,
  mp.author_app_user_id,
  'media_post',
  mp.id,
  'public',
  'active',
  ds.area,
  ds.id,
  mp.created_at,
  mp.created_at,
  COALESCE(ds.name, 'Photo post'),
  COALESCE(mp.post_caption, ''),
  COALESCE(media_items.items, '[]'::jsonb),
  jsonb_build_object('mediaCount', COALESCE(media_items.count, 0)),
  jsonb_build_object(
    'diveSiteSlug', ds.slug,
    'diveSiteName', ds.name
  )
FROM media_posts mp
JOIN users u ON u.id = mp.author_app_user_id AND u.account_status = 'active'
JOIN dive_sites ds ON ds.id = mp.dive_site_id AND ds.moderation_state = 'approved'
JOIN LATERAL (
  SELECT
    COUNT(*)::int AS count,
    jsonb_agg(
      jsonb_build_object(
        'id', mi.id,
        'mediaObjectId', mi.media_object_id,
        'width', mi.width,
        'height', mi.height,
        'mimeType', mi.mime_type,
        'sortOrder', mi.sort_order
      )
      ORDER BY mi.sort_order ASC, mi.created_at ASC
    ) AS items
  FROM media_items mi
  JOIN media_objects mo ON mo.id = mi.media_object_id AND mo.state = 'active'
  WHERE mi.post_id = mp.id
    AND mi.status = 'active'
    AND mi.deleted_at IS NULL
) media_items ON media_items.count > 0
WHERE mp.deleted_at IS NULL
ON CONFLICT (source_module, source_type, source_id, type) DO UPDATE SET
  actor_user_id = EXCLUDED.actor_user_id,
  target_type = EXCLUDED.target_type,
  target_id = EXCLUDED.target_id,
  visibility = EXCLUDED.visibility,
  state = EXCLUDED.state,
  area = EXCLUDED.area,
  dive_site_id = EXCLUDED.dive_site_id,
  occurred_at = EXCLUDED.occurred_at,
  source_created_at = EXCLUDED.source_created_at,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  media = EXCLUDED.media,
  stats = EXCLUDED.stats,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Forward-only migration. Keep the activity ledger table once created.
SELECT 1;
-- +goose StatementEnd
