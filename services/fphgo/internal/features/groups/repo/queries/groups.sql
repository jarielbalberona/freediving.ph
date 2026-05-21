-- name: ListGroups :many
SELECT
  g.id,
  g.name,
  g.slug,
  COALESCE(g.bio, '') AS bio,
  COALESCE(g.description, '') AS description,
  g.visibility,
  g.status,
  g.join_policy,
  COALESCE(g.location, '') AS location,
  COALESCE(g.location_name, '') AS location_name,
  COALESCE(g.formatted_address, '') AS formatted_address,
  g.lat,
  g.lng,
  COALESCE(g.google_place_id, '') AS google_place_id,
  COALESCE(g.region_code, '') AS region_code,
  COALESCE(g.province_code, '') AS province_code,
  COALESCE(g.city_municipality_code, '') AS city_municipality_code,
  COALESCE(g.barangay_code, '') AS barangay_code,
  COALESCE(g.location_source, 'manual') AS location_source,
  COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::int AS member_count,
  COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::int AS event_count,
  COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::int AS post_count,
  g.created_by,
  g.created_at,
  g.updated_at,
  COALESCE(vm.role, '') AS viewer_role,
  COALESCE(vm.status, '') AS viewer_membership_status,
  vm.joined_at AS viewer_joined_at,
  vm.invited_at AS viewer_invited_at,
  COUNT(*) OVER()::int AS total_count
FROM groups g
LEFT JOIN group_memberships vm
  ON vm.group_id = g.id
 AND vm.user_id = sqlc.narg(viewer_user_id)::uuid
WHERE g.status = 'active'
  AND (
    CASE
      WHEN sqlc.arg(mine)::boolean THEN
        sqlc.narg(viewer_user_id)::uuid IS NOT NULL
        AND vm.status = 'active'
      ELSE
        g.visibility = 'public'
        OR (
          sqlc.narg(viewer_user_id)::uuid IS NOT NULL
          AND vm.status IN ('active', 'invited')
        )
    END
  )
  AND (
    sqlc.narg(visibility)::text IS NULL
    OR g.visibility = sqlc.narg(visibility)::text
  )
  AND (
    sqlc.narg(search)::text IS NULL
    OR lower(g.name) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
    OR lower(COALESCE(g.bio, '')) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
    OR lower(COALESCE(g.description, '')) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
    OR lower(COALESCE(g.location, '')) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
    OR lower(COALESCE(g.location_name, '')) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
    OR lower(COALESCE(g.formatted_address, '')) LIKE '%' || lower(sqlc.narg(search)::text) || '%'
  )
ORDER BY g.created_at DESC, g.id DESC
LIMIT sqlc.arg(limit_rows) OFFSET sqlc.arg(offset_rows);

-- name: GetGroupByID :one
SELECT
  g.id,
  g.name,
  g.slug,
  COALESCE(g.bio, '') AS bio,
  COALESCE(g.description, '') AS description,
  g.visibility,
  g.status,
  g.join_policy,
  COALESCE(g.location, '') AS location,
  COALESCE(g.location_name, '') AS location_name,
  COALESCE(g.formatted_address, '') AS formatted_address,
  g.lat,
  g.lng,
  COALESCE(g.google_place_id, '') AS google_place_id,
  COALESCE(g.region_code, '') AS region_code,
  COALESCE(g.province_code, '') AS province_code,
  COALESCE(g.city_municipality_code, '') AS city_municipality_code,
  COALESCE(g.barangay_code, '') AS barangay_code,
  COALESCE(g.location_source, 'manual') AS location_source,
  COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = g.id AND m.status = 'active'), 0)::int AS member_count,
  COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = g.id AND e.status = 'published'), 0)::int AS event_count,
  COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = g.id AND p.status = 'active'), 0)::int AS post_count,
  g.created_by,
  g.created_at,
  g.updated_at,
  COALESCE(vm.role, '') AS viewer_role,
  COALESCE(vm.status, '') AS viewer_membership_status,
  vm.joined_at AS viewer_joined_at,
  vm.invited_at AS viewer_invited_at
FROM groups g
LEFT JOIN group_memberships vm
  ON vm.group_id = g.id
 AND vm.user_id = sqlc.narg(viewer_user_id)::uuid
WHERE g.id = sqlc.arg(group_id)::uuid;

-- name: CreateGroup :one
INSERT INTO groups (
  name,
  slug,
  bio,
  description,
  visibility,
  status,
  join_policy,
  location,
  location_name,
  formatted_address,
  lat,
  lng,
  google_place_id,
  region_code,
  province_code,
  city_municipality_code,
  barangay_code,
  location_source,
  created_by
)
VALUES (
  sqlc.arg(name),
  sqlc.arg(slug),
  sqlc.narg(bio),
  sqlc.narg(description),
  sqlc.arg(visibility),
  'active',
  sqlc.arg(join_policy),
  sqlc.narg(location),
  sqlc.narg(location_name),
  sqlc.narg(formatted_address),
  sqlc.narg(lat),
  sqlc.narg(lng),
  sqlc.narg(google_place_id),
  sqlc.narg(region_code),
  sqlc.narg(province_code),
  sqlc.narg(city_municipality_code),
  sqlc.narg(barangay_code),
  sqlc.arg(location_source),
  sqlc.arg(created_by)::uuid
)
RETURNING
  id,
  name,
  slug,
  COALESCE(bio, '') AS bio,
  COALESCE(description, '') AS description,
  visibility,
  status,
  join_policy,
  COALESCE(location, '') AS location,
  COALESCE(location_name, '') AS location_name,
  COALESCE(formatted_address, '') AS formatted_address,
  lat,
  lng,
  COALESCE(google_place_id, '') AS google_place_id,
  COALESCE(region_code, '') AS region_code,
  COALESCE(province_code, '') AS province_code,
  COALESCE(city_municipality_code, '') AS city_municipality_code,
  COALESCE(barangay_code, '') AS barangay_code,
  COALESCE(location_source, 'manual') AS location_source,
  0::int AS member_count,
  0::int AS event_count,
  0::int AS post_count,
  created_by,
  created_at,
  updated_at,
  ''::text AS viewer_role,
  ''::text AS viewer_membership_status,
  NULL::timestamptz AS viewer_joined_at,
  NULL::timestamptz AS viewer_invited_at;

-- name: UpdateGroup :one
UPDATE groups
SET
  name = CASE WHEN sqlc.arg(set_name)::boolean THEN sqlc.arg(name) ELSE name END,
  bio = CASE WHEN sqlc.arg(set_bio)::boolean THEN sqlc.narg(bio) ELSE bio END,
  description = CASE WHEN sqlc.arg(set_description)::boolean THEN sqlc.narg(description) ELSE description END,
  visibility = CASE WHEN sqlc.arg(set_visibility)::boolean THEN sqlc.arg(visibility) ELSE visibility END,
  status = CASE WHEN sqlc.arg(set_status)::boolean THEN sqlc.arg(status) ELSE status END,
  join_policy = CASE WHEN sqlc.arg(set_join_policy)::boolean THEN sqlc.arg(join_policy) ELSE join_policy END,
  location = CASE WHEN sqlc.arg(set_location)::boolean THEN sqlc.narg(location) ELSE location END,
  location_name = CASE WHEN sqlc.arg(set_location_name)::boolean THEN sqlc.narg(location_name) ELSE location_name END,
  formatted_address = CASE WHEN sqlc.arg(set_formatted_address)::boolean THEN sqlc.narg(formatted_address) ELSE formatted_address END,
  lat = CASE WHEN sqlc.arg(set_lat)::boolean THEN sqlc.narg(lat) ELSE lat END,
  lng = CASE WHEN sqlc.arg(set_lng)::boolean THEN sqlc.narg(lng) ELSE lng END,
  google_place_id = CASE WHEN sqlc.arg(set_google_place_id)::boolean THEN sqlc.narg(google_place_id) ELSE google_place_id END,
  region_code = CASE WHEN sqlc.arg(set_region_code)::boolean THEN sqlc.narg(region_code) ELSE region_code END,
  province_code = CASE WHEN sqlc.arg(set_province_code)::boolean THEN sqlc.narg(province_code) ELSE province_code END,
  city_municipality_code = CASE WHEN sqlc.arg(set_city_municipality_code)::boolean THEN sqlc.narg(city_municipality_code) ELSE city_municipality_code END,
  barangay_code = CASE WHEN sqlc.arg(set_barangay_code)::boolean THEN sqlc.narg(barangay_code) ELSE barangay_code END,
  location_source = CASE WHEN sqlc.arg(set_location_source)::boolean THEN sqlc.arg(location_source) ELSE location_source END,
  updated_at = NOW()
WHERE id = sqlc.arg(group_id)::uuid
RETURNING
  id,
  name,
  slug,
  COALESCE(bio, '') AS bio,
  COALESCE(description, '') AS description,
  visibility,
  status,
  join_policy,
  COALESCE(location, '') AS location,
  COALESCE(location_name, '') AS location_name,
  COALESCE(formatted_address, '') AS formatted_address,
  lat,
  lng,
  COALESCE(google_place_id, '') AS google_place_id,
  COALESCE(region_code, '') AS region_code,
  COALESCE(province_code, '') AS province_code,
  COALESCE(city_municipality_code, '') AS city_municipality_code,
  COALESCE(barangay_code, '') AS barangay_code,
  COALESCE(location_source, 'manual') AS location_source,
  COALESCE((SELECT COUNT(*) FROM group_memberships m WHERE m.group_id = groups.id AND m.status = 'active'), 0)::int AS member_count,
  COALESCE((SELECT COUNT(*) FROM events e WHERE e.group_id = groups.id AND e.status = 'published'), 0)::int AS event_count,
  COALESCE((SELECT COUNT(*) FROM group_posts p WHERE p.group_id = groups.id AND p.status = 'active'), 0)::int AS post_count,
  created_by,
  created_at,
  updated_at,
  ''::text AS viewer_role,
  ''::text AS viewer_membership_status,
  NULL::timestamptz AS viewer_joined_at,
  NULL::timestamptz AS viewer_invited_at;

-- name: AddOwnerMembership :exec
INSERT INTO group_memberships (group_id, user_id, role, status, joined_at)
VALUES (sqlc.arg(group_id)::uuid, sqlc.arg(user_id)::uuid, 'owner', 'active', NOW())
ON CONFLICT (group_id, user_id)
DO UPDATE SET
  role = 'owner',
  status = 'active',
  joined_at = COALESCE(group_memberships.joined_at, NOW()),
  left_at = NULL,
  responded_at = NOW(),
  updated_at = NOW();

-- name: GetMembership :one
SELECT
  gm.group_id,
  gm.user_id,
  gm.role,
  gm.status,
  gm.invited_by,
  gm.invited_at,
  gm.responded_at,
  gm.joined_at,
  gm.left_at,
  gm.created_at,
  gm.updated_at,
  COALESCE(u.username, '') AS username,
  COALESCE(u.display_name, '') AS display_name,
  COALESCE(p.avatar_url, '') AS avatar_url
FROM group_memberships gm
LEFT JOIN users u ON u.id = gm.user_id
LEFT JOIN profiles p ON p.user_id = gm.user_id
WHERE gm.group_id = sqlc.arg(group_id)::uuid
  AND gm.user_id = sqlc.arg(user_id)::uuid;

-- name: UpsertMembership :one
INSERT INTO group_memberships (
  group_id,
  user_id,
  role,
  status,
  joined_at,
  left_at,
  responded_at
)
VALUES (
  sqlc.arg(group_id)::uuid,
  sqlc.arg(user_id)::uuid,
  sqlc.arg(role),
  sqlc.arg(status),
  CASE WHEN sqlc.arg(status) = 'active' THEN NOW() ELSE NULL END,
  NULL,
  CASE WHEN sqlc.arg(status) = 'active' THEN NOW() ELSE NULL END
)
ON CONFLICT (group_id, user_id)
DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  joined_at = CASE
    WHEN EXCLUDED.status = 'active' THEN COALESCE(group_memberships.joined_at, NOW())
    ELSE group_memberships.joined_at
  END,
  left_at = CASE
    WHEN EXCLUDED.status = 'active' THEN NULL
    ELSE group_memberships.left_at
  END,
  responded_at = CASE
    WHEN EXCLUDED.status = 'active' THEN NOW()
    ELSE group_memberships.responded_at
  END,
  updated_at = NOW()
WHERE group_memberships.status <> 'blocked'
RETURNING
  group_id,
  user_id,
  role,
  status,
  invited_by,
  invited_at,
  responded_at,
  joined_at,
  left_at,
  created_at,
  updated_at,
  ''::text AS username,
  ''::text AS display_name,
  ''::text AS avatar_url;

-- name: InviteMember :one
INSERT INTO group_memberships (
  group_id,
  user_id,
  role,
  status,
  invited_by,
  invited_at,
  responded_at,
  joined_at,
  left_at
)
VALUES (
  sqlc.arg(group_id)::uuid,
  sqlc.arg(user_id)::uuid,
  'member',
  'invited',
  sqlc.arg(invited_by)::uuid,
  NOW(),
  NULL,
  NULL,
  NULL
)
ON CONFLICT (group_id, user_id)
DO UPDATE SET
  role = CASE
    WHEN group_memberships.role = 'owner' THEN group_memberships.role
    ELSE 'member'
  END,
  status = 'invited',
  invited_by = CASE
    WHEN group_memberships.status = 'invited' THEN group_memberships.invited_by
    ELSE EXCLUDED.invited_by
  END,
  invited_at = CASE
    WHEN group_memberships.status = 'invited' THEN group_memberships.invited_at
    ELSE NOW()
  END,
  responded_at = NULL,
  joined_at = NULL,
  left_at = NULL,
  updated_at = NOW()
WHERE group_memberships.status IN ('invited', 'left', 'declined')
RETURNING
  group_id,
  user_id,
  role,
  status,
  invited_by,
  invited_at,
  responded_at,
  joined_at,
  left_at,
  created_at,
  updated_at,
  ''::text AS username,
  ''::text AS display_name,
  ''::text AS avatar_url;

-- name: AcceptInvite :one
UPDATE group_memberships
SET
  status = 'active',
  joined_at = COALESCE(joined_at, NOW()),
  responded_at = NOW(),
  left_at = NULL,
  updated_at = NOW()
WHERE group_id = sqlc.arg(group_id)::uuid
  AND user_id = sqlc.arg(user_id)::uuid
  AND status = 'invited'
RETURNING
  group_id,
  user_id,
  role,
  status,
  invited_by,
  invited_at,
  responded_at,
  joined_at,
  left_at,
  created_at,
  updated_at,
  ''::text AS username,
  ''::text AS display_name,
  ''::text AS avatar_url;

-- name: RejectInvite :one
UPDATE group_memberships
SET
  status = 'declined',
  responded_at = NOW(),
  updated_at = NOW()
WHERE group_id = sqlc.arg(group_id)::uuid
  AND user_id = sqlc.arg(user_id)::uuid
  AND status = 'invited'
RETURNING
  group_id,
  user_id,
  role,
  status,
  invited_by,
  invited_at,
  responded_at,
  joined_at,
  left_at,
  created_at,
  updated_at,
  ''::text AS username,
  ''::text AS display_name,
  ''::text AS avatar_url;

-- name: LeaveGroup :exec
UPDATE group_memberships
SET
  status = 'left',
  left_at = NOW(),
  updated_at = NOW()
WHERE group_id = sqlc.arg(group_id)::uuid
  AND user_id = sqlc.arg(user_id)::uuid
  AND status = 'active';

-- name: ListMembers :many
SELECT
  gm.group_id,
  gm.user_id,
  gm.role,
  gm.status,
  gm.invited_by,
  gm.invited_at,
  gm.responded_at,
  gm.joined_at,
  gm.left_at,
  gm.created_at,
  gm.updated_at,
  COALESCE(u.username, '') AS username,
  COALESCE(u.display_name, '') AS display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  COUNT(*) OVER()::int AS total_count
FROM group_memberships gm
LEFT JOIN users u ON u.id = gm.user_id
LEFT JOIN profiles p ON p.user_id = gm.user_id
WHERE gm.group_id = sqlc.arg(group_id)::uuid
  AND gm.status = 'active'
ORDER BY gm.joined_at DESC NULLS LAST, gm.created_at DESC, gm.user_id DESC
LIMIT sqlc.arg(limit_rows) OFFSET sqlc.arg(offset_rows);

-- name: ListPosts :many
SELECT
  p.id,
  p.group_id,
  p.author_user_id,
  COALESCE(p.title, '') AS title,
  p.content,
  p.status,
  p.like_count,
  p.comment_count,
  p.created_at,
  p.updated_at,
  COALESCE(u.display_name, '') AS author_name,
  COALESCE(u.username, '') AS author_username,
  COALESCE(pr.avatar_url, '') AS author_avatar_url,
  COUNT(*) OVER()::int AS total_count
FROM group_posts p
LEFT JOIN users u ON u.id = p.author_user_id
LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
WHERE p.group_id = sqlc.arg(group_id)::uuid
  AND p.status = 'active'
ORDER BY p.created_at DESC, p.id DESC
LIMIT sqlc.arg(limit_rows) OFFSET sqlc.arg(offset_rows);

-- name: CreatePost :one
INSERT INTO group_posts (group_id, author_user_id, title, content, status)
VALUES (
  sqlc.arg(group_id)::uuid,
  sqlc.arg(author_user_id)::uuid,
  NULLIF(sqlc.arg(title), ''),
  sqlc.arg(content),
  'active'
)
RETURNING
  id,
  group_id,
  author_user_id,
  COALESCE(title, '') AS title,
  content,
  status,
  like_count,
  comment_count,
  created_at,
  updated_at,
  ''::text AS author_name,
  ''::text AS author_username,
  ''::text AS author_avatar_url,
  0::int AS total_count;

-- name: UserIsActive :one
SELECT EXISTS (
  SELECT 1
  FROM users
  WHERE id = sqlc.arg(user_id)::uuid
    AND account_status = 'active'
)::boolean;
