-- +goose Up
-- +goose StatementBegin
WITH role_grants AS (
  SELECT
    u.id AS user_id,
    CASE u.global_role
      WHEN 'member' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'moderator' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'admin' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'super_admin' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      ELSE '{}'::jsonb
    END AS grants
  FROM users u
)
INSERT INTO user_permission_overrides (user_id, overrides, updated_at)
SELECT user_id, grants, NOW()
FROM role_grants
WHERE grants <> '{}'::jsonb
ON CONFLICT (user_id) DO NOTHING;

WITH role_grants AS (
  SELECT
    u.id AS user_id,
    CASE u.global_role
      WHEN 'member' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'moderator' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'admin' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      WHEN 'super_admin' THEN jsonb_build_object(
        'messaging.read', true,
        'messaging.write', true,
        'chika.read', true,
        'chika.write', true,
        'chika.moderate', true,
        'explore.read', true,
        'explore.submit', true,
        'profiles.read', true,
        'profiles.write', true
      )
      ELSE '{}'::jsonb
    END AS grants
  FROM users u
)
UPDATE user_permission_overrides up
SET
  overrides = up.overrides || rg.grants,
  updated_at = NOW()
FROM role_grants rg
WHERE up.user_id = rg.user_id
  AND rg.grants <> '{}'::jsonb;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE user_permission_overrides
SET
  overrides = overrides
    - 'messaging.read'
    - 'messaging.write'
    - 'chika.read'
    - 'chika.write'
    - 'chika.moderate'
    - 'explore.read'
    - 'explore.submit'
    - 'profiles.read'
    - 'profiles.write',
  updated_at = NOW()
WHERE overrides ?| ARRAY[
  'messaging.read',
  'messaging.write',
  'chika.read',
  'chika.write',
  'chika.moderate',
  'explore.read',
  'explore.submit',
  'profiles.read',
  'profiles.write'
];
-- +goose StatementEnd
