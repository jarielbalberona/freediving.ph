-- name: ListDiveSites :many
SELECT id, name, location, moderation_state, created_at
FROM dive_sites
WHERE moderation_state = 'approved'
  AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR location ILIKE '%' || $1 || '%')
ORDER BY name ASC
LIMIT 100;
