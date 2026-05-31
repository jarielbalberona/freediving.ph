-- name: GetPassportSettings :one
SELECT
  user_id,
  show_map,
  show_badges,
  show_journey,
  show_memories,
  featured_badge_ids,
  created_at,
  updated_at
FROM passport_settings
WHERE user_id = $1;

-- name: UpsertPassportSettings :one
INSERT INTO passport_settings (
  user_id,
  show_map,
  show_badges,
  show_journey,
  show_memories,
  featured_badge_ids
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
ON CONFLICT (user_id) DO UPDATE
SET
  show_map = EXCLUDED.show_map,
  show_badges = EXCLUDED.show_badges,
  show_journey = EXCLUDED.show_journey,
  show_memories = EXCLUDED.show_memories,
  featured_badge_ids = EXCLUDED.featured_badge_ids,
  updated_at = NOW()
RETURNING
  user_id,
  show_map,
  show_badges,
  show_journey,
  show_memories,
  featured_badge_ids,
  created_at,
  updated_at;
