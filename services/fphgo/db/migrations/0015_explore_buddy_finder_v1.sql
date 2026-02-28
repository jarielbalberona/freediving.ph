-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_area TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cert_level TEXT;

ALTER TABLE dive_sites
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS entry_difficulty TEXT,
  ADD COLUMN IF NOT EXISTS depth_min_m NUMERIC,
  ADD COLUMN IF NOT EXISTS depth_max_m NUMERIC,
  ADD COLUMN IF NOT EXISTS hazards TEXT[],
  ADD COLUMN IF NOT EXISTS best_season TEXT,
  ADD COLUMN IF NOT EXISTS typical_conditions TEXT,
  ADD COLUMN IF NOT EXISTS access TEXT,
  ADD COLUMN IF NOT EXISTS fees TEXT,
  ADD COLUMN IF NOT EXISTS contact_info TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS verified_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE dive_sites
SET
  area = COALESCE(NULLIF(area, ''), NULLIF(location, ''), 'Philippines'),
  slug = COALESCE(
    NULLIF(slug, ''),
    lower(
      regexp_replace(
        trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')),
        '-+',
        '-',
        'g'
      )
    ) || '-' || substr(id::text, 1, 8)
  ),
  entry_difficulty = COALESCE(NULLIF(entry_difficulty, ''), 'moderate'),
  last_updated_at = COALESCE(last_updated_at, created_at)
WHERE area IS NULL
   OR area = ''
   OR slug IS NULL
   OR slug = ''
   OR entry_difficulty IS NULL
   OR entry_difficulty = '';

ALTER TABLE dive_sites
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN area SET NOT NULL,
  ALTER COLUMN entry_difficulty SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dive_sites_entry_difficulty_check'
  ) THEN
    ALTER TABLE dive_sites
      ADD CONSTRAINT dive_sites_entry_difficulty_check
      CHECK (entry_difficulty IN ('easy', 'moderate', 'hard'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dive_sites_verification_status_check'
  ) THEN
    ALTER TABLE dive_sites
      ADD CONSTRAINT dive_sites_verification_status_check
      CHECK (verification_status IN ('community', 'instructor', 'moderator', 'verified'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS dive_site_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  condition_visibility_m NUMERIC,
  condition_current TEXT,
  condition_waves TEXT,
  condition_temp_c NUMERIC,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state TEXT NOT NULL DEFAULT 'active',
  CHECK (condition_current IS NULL OR condition_current IN ('none', 'mild', 'strong')),
  CHECK (condition_waves IS NULL OR condition_waves IN ('calm', 'moderate', 'rough')),
  CHECK (state IN ('active', 'hidden'))
);

CREATE TABLE IF NOT EXISTS dive_site_saves (
  app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_user_id, dive_site_id)
);

CREATE TABLE IF NOT EXISTS buddy_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  intent_type TEXT NOT NULL,
  time_window TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'members',
  state TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (intent_type IN ('training', 'fun_dive', 'depth', 'pool', 'line_training')),
  CHECK (time_window IN ('today', 'weekend', 'specific_date')),
  CHECK (visibility IN ('members')),
  CHECK (state IN ('active', 'hidden', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_dive_sites_slug ON dive_sites (slug);
CREATE INDEX IF NOT EXISTS idx_dive_sites_area ON dive_sites (area);
CREATE INDEX IF NOT EXISTS idx_dive_sites_verification_status ON dive_sites (verification_status);
CREATE INDEX IF NOT EXISTS idx_dive_sites_updated_id ON dive_sites (last_updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_site_updates_site_occurred_at ON dive_site_updates (dive_site_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_site_updates_author_created_at ON dive_site_updates (author_app_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_area_created_at ON buddy_intents (area, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_expires_at ON buddy_intents (expires_at);
CREATE INDEX IF NOT EXISTS idx_buddy_intents_author_created_at ON buddy_intents (author_app_user_id, created_at DESC);

INSERT INTO users (id, username, display_name, auth_provider, email_verified, phone_verified)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'coachrisa', 'Coach Risa', 'seed', TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000102', 'diveharry', 'Harry Santos', 'seed', TRUE, FALSE),
  ('00000000-0000-0000-0000-000000000103', 'anika', 'Anika Cruz', 'seed', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (user_id, bio, location, home_area, interests, cert_level)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Instructor-curated seed account.', 'Mabini, Batangas', 'Mabini, Batangas', ARRAY['reef', 'training'], 'Instructor'),
  ('00000000-0000-0000-0000-000000000102', 'Active community diver for seed data.', 'Dauin, Negros Oriental', 'Dauin, Negros Oriental', ARRAY['fun_dive', 'photography'], 'AIDA 3'),
  ('00000000-0000-0000-0000-000000000103', 'Buddy Finder sample member.', 'Moalboal, Cebu', 'Moalboal, Cebu', ARRAY['line_training', 'weekend_trips'], 'Molchanovs Wave 2')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_permission_overrides (user_id, overrides)
VALUES
  ('00000000-0000-0000-0000-000000000101', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000102', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000103', '{}'::jsonb)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO dive_sites (
  id, name, slug, area, latitude, longitude, entry_difficulty, depth_min_m, depth_max_m, hazards,
  best_season, typical_conditions, access, fees, contact_info, verification_status, verified_by_app_user_id,
  moderation_state, last_updated_at, created_at
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Twin Rocks', 'twin-rocks-anilao', 'Mabini, Batangas', 13.7564, 120.9078, 'easy', 5, 18, ARRAY['boat traffic'], 'November to May', 'Usually protected with fair to good visibility and mild current.', 'Boat access from Anilao resorts.', 'Marine fees vary by resort.', 'Coordinate with your resort boatman.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000002', 'Cathedral', 'cathedral-anilao', 'Mabini, Batangas', 13.7561, 120.9091, 'moderate', 8, 28, ARRAY['current'], 'November to May', 'Can shift quickly; visibility is best on calm mornings.', 'Boat drop with short surface swim.', 'Marine fees vary by operator.', 'Local guides recommended for first visit.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000003', 'Secret Bay', 'secret-bay-anilao', 'Mabini, Batangas', 13.7541, 120.9002, 'easy', 4, 16, ARRAY['boat traffic'], 'November to May', 'Sheltered macro site with calm entry most mornings.', 'Boat access; suited for easy half-day trips.', 'Check with resort packages.', 'Ask for a macro guide.', 'instructor', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000004', 'Sombrero Island', 'sombrero-island-batangas', 'Tingloy, Batangas', 13.6409, 120.8855, 'moderate', 7, 30, ARRAY['current', 'waves'], 'November to May', 'Exposed site; visibility improves when swell stays down.', 'Boat only; no reliable shore setup.', 'Boat and sanctuary fees may apply.', 'Best with local guide and calm weather window.', 'community', NULL, 'approved', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000005', 'Mainit Point', 'mainit-point-puerto-galera', 'Puerto Galera, Oriental Mindoro', 13.5016, 120.9456, 'hard', 12, 36, ARRAY['current'], 'November to June', 'Strong current potential; timing matters more than anything.', 'Boat drop; negative entry may be required.', 'Operator fees vary.', 'Go with current-aware guide team.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '14 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000006', 'Canyons', 'canyons-puerto-galera', 'Puerto Galera, Oriental Mindoro', 13.5034, 120.9508, 'hard', 14, 38, ARRAY['current', 'boat traffic'], 'November to June', 'Fast water is common; only good when current lines are understood.', 'Boat-only technical drift style site.', 'Operator fees vary.', 'Not a beginner site. Use experienced briefing and guide.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000007', 'Turtle Point', 'turtle-point-dauin', 'Dauin, Negros Oriental', 9.1910, 123.2645, 'easy', 5, 20, ARRAY['boat traffic'], 'October to June', 'Usually calm with solid visibility on morning runs.', 'Boat or shore depending on operator and tide.', 'Sanctuary fees may apply.', 'Great for mixed-skill buddy days.', 'instructor', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000008', 'House Reef', 'house-reef-dauin', 'Dauin, Negros Oriental', 9.1868, 123.2661, 'easy', 3, 16, ARRAY['waves'], 'October to June', 'Shore entry depends on tide and small surf.', 'Shore entry from local resorts.', 'Usually part of day-pass or resort access.', 'Best at mid to high tide.', 'community', NULL, 'approved', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000009', 'Chapel Point', 'chapel-point-apo-island', 'Apo Island, Negros Oriental', 9.0714, 123.2712, 'moderate', 6, 24, ARRAY['current'], 'October to June', 'Healthy reef, often clear, with manageable but present current.', 'Boat drop from Dauin or Apo.', 'Marine sanctuary fees apply.', 'Briefing matters because drift can build.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '9 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000010', 'Rock Point West', 'rock-point-west-apo-island', 'Apo Island, Negros Oriental', 9.0740, 123.2698, 'hard', 10, 32, ARRAY['current'], 'October to June', 'Usually stronger current than Chapel Point with better pelagic chance.', 'Boat only.', 'Marine sanctuary fees apply.', 'Use experienced local guide.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '11 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000011', 'Gato Island', 'gato-island-malapascua', 'Malapascua, Cebu', 11.3279, 124.1210, 'moderate', 8, 30, ARRAY['current', 'waves'], 'November to May', 'Surface can be choppy; underwater usually moderate current and clear water.', 'Boat only from Malapascua.', 'Boat and marine fees vary.', 'Best with guide who knows tunnel traffic.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000012', 'Monad Shoal', 'monad-shoal-malapascua', 'Malapascua, Cebu', 11.3395, 124.1174, 'hard', 18, 32, ARRAY['current', 'waves'], 'November to May', 'Early departure, open-sea conditions, and deeper profile.', 'Boat only; dawn runs are standard.', 'Operator fees vary.', 'Not for casual first-day diving.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000013', 'Black Forest', 'black-forest-balicasag', 'Balicasag, Bohol', 9.5148, 123.6842, 'moderate', 8, 30, ARRAY['current'], 'November to June', 'Visibility often strong; current can move you quickly along the wall.', 'Boat only from Panglao/Balicasag.', 'Marine fees apply.', 'Stay disciplined on depth and current.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000014', 'Napaling Reef', 'napaling-reef-panglao', 'Panglao, Bohol', 9.6202, 123.7702, 'easy', 4, 18, ARRAY['waves'], 'November to June', 'Shore site with varying wave action and reliable shallow reef life.', 'Shore entry by stairs and rocky platform.', 'Site access fees vary.', 'Check swell before committing.', 'community', NULL, 'approved', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000015', 'Lusong Gunboat', 'lusong-gunboat-coron', 'Coron, Palawan', 11.9995, 120.1932, 'easy', 4, 12, ARRAY['boat traffic'], 'October to June', 'Popular shallow wreck with usually easy conditions.', 'Boat access from Coron town.', 'Park and operator fees vary.', 'Good first-day wreck orientation.', 'instructor', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000016', 'East Tangat Wreck', 'east-tangat-wreck-coron', 'Coron, Palawan', 11.9923, 120.1810, 'moderate', 6, 24, ARRAY['boat traffic'], 'October to June', 'Usually accessible with decent visibility and light current.', 'Boat only.', 'Park and operator fees vary.', 'Watch overhead environment discipline.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '16 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000017', 'Barracuda Lake', 'barracuda-lake-coron', 'Coron, Palawan', 11.9868, 120.2026, 'moderate', 4, 30, ARRAY['boat traffic'], 'October to June', 'Thermoclines are the main event; surface is usually calm.', 'Boat access plus ladder entry.', 'Lake fees apply.', 'Hydrate and expect temperature layering.', 'community', NULL, 'approved', NOW() - INTERVAL '3 days', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000018', 'Siete Pecados', 'siete-pecados-coron-bay', 'Coron Bay, Palawan', 11.9979, 120.2242, 'easy', 3, 14, ARRAY['boat traffic'], 'October to June', 'Easy reef option with variable crowding but usually forgiving conditions.', 'Short boat ride from Coron town.', 'Marine fees apply.', 'Good fallback if weather turns.', 'community', NULL, 'approved', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000019', 'Sardine Run', 'sardine-run-moalboal', 'Moalboal, Cebu', 9.9435, 123.3763, 'easy', 3, 18, ARRAY['boat traffic'], 'November to June', 'Accessible and usually calm with excellent value for quick sessions.', 'Shore entry from Panagsama area.', 'Local access fees may apply.', 'Early mornings are cleaner and less crowded.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000020', 'Pescador East', 'pescador-east-moalboal', 'Moalboal, Cebu', 9.9126, 123.3571, 'moderate', 8, 28, ARRAY['current', 'waves'], 'November to June', 'Can be excellent, but swell and current decide if it is fun or stupid.', 'Boat only.', 'Boat fees vary.', 'Do not oversell this to beginners.', 'verified', '00000000-0000-0000-0000-000000000101', 'approved', NOW() - INTERVAL '15 hours', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  area = EXCLUDED.area,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  entry_difficulty = EXCLUDED.entry_difficulty,
  depth_min_m = EXCLUDED.depth_min_m,
  depth_max_m = EXCLUDED.depth_max_m,
  hazards = EXCLUDED.hazards,
  best_season = EXCLUDED.best_season,
  typical_conditions = EXCLUDED.typical_conditions,
  access = EXCLUDED.access,
  fees = EXCLUDED.fees,
  contact_info = EXCLUDED.contact_info,
  verification_status = EXCLUDED.verification_status,
  verified_by_app_user_id = EXCLUDED.verified_by_app_user_id,
  moderation_state = EXCLUDED.moderation_state,
  last_updated_at = EXCLUDED.last_updated_at;

INSERT INTO dive_site_updates (
  id, dive_site_id, author_app_user_id, note, condition_visibility_m,
  condition_current, condition_waves, condition_temp_c, occurred_at, created_at, state
)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Flat morning surface, easy warm-up, and decent fish life on the shallows.', 12, 'mild', 'calm', 28, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', 'active'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000101', 'Current started light then built before noon. Good only if the team is briefed.', 15, 'strong', 'moderate', 27, NOW() - INTERVAL '14 hours', NOW() - INTERVAL '13 hours', 'active'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000102', 'Visibility held up well and turtles were active near the reef edge.', 18, 'mild', 'calm', 29, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '6 hours', 'active'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000102', 'Reef looked healthy. Current was manageable on descent, stronger on ascent line.', 20, 'mild', 'calm', 28, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '8 hours', 'active'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000103', 'Good clarity. Surface traffic was busy but underwater conditions stayed pleasant.', 16, 'mild', 'moderate', 28, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '11 hours', 'active'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000103', 'Shallow wreck was straightforward and beginner-friendly today.', 14, 'none', 'calm', 30, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '19 hours', 'active'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000103', 'Easy shore entry before the crowd showed up. Sardines were stacked in close.', 22, 'none', 'calm', 29, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', 'active'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000101', 'Still divable, but swell and current were enough to make weak teams regret the booking.', 14, 'strong', 'moderate', 28, NOW() - INTERVAL '15 hours', NOW() - INTERVAL '14 hours', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO buddy_intents (
  id, author_app_user_id, area, intent_type, time_window, date_start, date_end, note, visibility, state, created_at, expires_at
)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'Dauin, Negros Oriental', 'fun_dive', 'weekend', CURRENT_DATE + 1, CURRENT_DATE + 2, 'Looking for relaxed reef dives and a punctual buddy.', 'members', 'active', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '3 days'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000103', 'Moalboal, Cebu', 'training', 'today', CURRENT_DATE, CURRENT_DATE, 'Morning line training or easy ocean session.', 'members', 'active', NOW() - INTERVAL '5 hours', NOW() + INTERVAL '1 day'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101', 'Mabini, Batangas', 'pool', 'specific_date', CURRENT_DATE + 4, CURRENT_DATE + 4, 'Pool equalization session, beginner-friendly pace.', 'members', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM buddy_intents WHERE id IN (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003'
);

DELETE FROM dive_site_updates WHERE id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000008'
);

DELETE FROM dive_sites WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000013',
  '10000000-0000-0000-0000-000000000014',
  '10000000-0000-0000-0000-000000000015',
  '10000000-0000-0000-0000-000000000016',
  '10000000-0000-0000-0000-000000000017',
  '10000000-0000-0000-0000-000000000018',
  '10000000-0000-0000-0000-000000000019',
  '10000000-0000-0000-0000-000000000020'
);

DELETE FROM user_permission_overrides WHERE user_id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);

DELETE FROM profiles WHERE user_id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);

DELETE FROM users WHERE id IN (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103'
);

DROP INDEX IF EXISTS idx_buddy_intents_author_created_at;
DROP INDEX IF EXISTS idx_buddy_intents_expires_at;
DROP INDEX IF EXISTS idx_buddy_intents_area_created_at;
DROP INDEX IF EXISTS idx_dive_site_updates_author_created_at;
DROP INDEX IF EXISTS idx_dive_site_updates_site_occurred_at;
DROP INDEX IF EXISTS idx_dive_sites_updated_id;
DROP INDEX IF EXISTS idx_dive_sites_verification_status;
DROP INDEX IF EXISTS idx_dive_sites_area;
DROP INDEX IF EXISTS idx_dive_sites_slug;

DROP TABLE IF EXISTS buddy_intents;
DROP TABLE IF EXISTS dive_site_saves;
DROP TABLE IF EXISTS dive_site_updates;

ALTER TABLE dive_sites
  DROP CONSTRAINT IF EXISTS dive_sites_verification_status_check,
  DROP CONSTRAINT IF EXISTS dive_sites_entry_difficulty_check,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS entry_difficulty,
  DROP COLUMN IF EXISTS depth_min_m,
  DROP COLUMN IF EXISTS depth_max_m,
  DROP COLUMN IF EXISTS hazards,
  DROP COLUMN IF EXISTS best_season,
  DROP COLUMN IF EXISTS typical_conditions,
  DROP COLUMN IF EXISTS access,
  DROP COLUMN IF EXISTS fees,
  DROP COLUMN IF EXISTS contact_info,
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS verified_by_app_user_id,
  DROP COLUMN IF EXISTS last_updated_at;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS home_area,
  DROP COLUMN IF EXISTS interests,
  DROP COLUMN IF EXISTS cert_level;

ALTER TABLE users
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS phone_verified;
-- +goose StatementEnd
