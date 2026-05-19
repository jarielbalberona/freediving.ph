-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS dive_site_edit_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
  submitted_by_app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  moderation_reason TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  proposed_name TEXT NOT NULL,
  proposed_description TEXT NOT NULL,
  proposed_entry_difficulty TEXT NOT NULL,
  proposed_depth_min_m NUMERIC,
  proposed_depth_max_m NUMERIC,
  proposed_hazards TEXT[] NOT NULL DEFAULT '{}',
  proposed_best_season TEXT NOT NULL DEFAULT '',
  proposed_typical_conditions TEXT NOT NULL DEFAULT '',
  proposed_access TEXT NOT NULL DEFAULT '',
  proposed_fees TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (state IN ('pending', 'applied', 'rejected')),
  CHECK (proposed_entry_difficulty IN ('easy', 'moderate', 'hard'))
);

CREATE INDEX IF NOT EXISTS idx_dive_site_edit_proposals_state_created
  ON dive_site_edit_proposals (state, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_dive_site_edit_proposals_site_created
  ON dive_site_edit_proposals (dive_site_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_dive_site_edit_proposals_submitter_created
  ON dive_site_edit_proposals (submitted_by_app_user_id, created_at DESC, id DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_dive_site_edit_proposals_submitter_created;
DROP INDEX IF EXISTS idx_dive_site_edit_proposals_site_created;
DROP INDEX IF EXISTS idx_dive_site_edit_proposals_state_created;
DROP TABLE IF EXISTS dive_site_edit_proposals;
-- +goose StatementEnd
