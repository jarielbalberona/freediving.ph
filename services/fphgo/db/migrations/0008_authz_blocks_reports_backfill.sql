-- +goose Up
-- +goose StatementBegin
WITH role_grants AS (
  SELECT
    u.id AS user_id,
    CASE u.global_role
      WHEN 'member' THEN jsonb_build_object(
        'blocks.read', true,
        'blocks.write', true,
        'reports.write', true
      )
      WHEN 'moderator' THEN jsonb_build_object(
        'blocks.read', true,
        'blocks.write', true,
        'reports.read', true,
        'reports.write', true,
        'reports.moderate', true
      )
      WHEN 'admin' THEN jsonb_build_object(
        'blocks.read', true,
        'blocks.write', true,
        'reports.read', true,
        'reports.write', true,
        'reports.moderate', true
      )
      WHEN 'super_admin' THEN jsonb_build_object(
        'blocks.read', true,
        'blocks.write', true,
        'reports.read', true,
        'reports.write', true,
        'reports.moderate', true
      )
      ELSE '{}'::jsonb
    END AS grants
  FROM users u
)
INSERT INTO user_permission_overrides (user_id, overrides, updated_at)
SELECT user_id, grants, NOW()
FROM role_grants
WHERE grants <> '{}'::jsonb
ON CONFLICT (user_id) DO UPDATE
SET
  overrides = EXCLUDED.overrides || user_permission_overrides.overrides,
  updated_at = NOW();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE user_permission_overrides
SET
  overrides = overrides
    - 'blocks.read'
    - 'blocks.write'
    - 'reports.read'
    - 'reports.write'
    - 'reports.moderate',
  updated_at = NOW()
WHERE overrides ?| ARRAY[
  'blocks.read',
  'blocks.write',
  'reports.read',
  'reports.write',
  'reports.moderate'
];
-- +goose StatementEnd
