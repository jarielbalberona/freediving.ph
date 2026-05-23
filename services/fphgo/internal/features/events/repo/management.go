package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var ErrLastOrganizer = errors.New("event must keep at least one organizer")

type EventCompetition struct {
	ID                  string
	EventID             string
	Name                string
	DescriptionMarkdown string
	RulesMarkdown       string
	CoverPhotoURL       string
	SortOrder           int
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type CreateCompetitionInput struct {
	Name                string
	DescriptionMarkdown string
	RulesMarkdown       string
	CoverPhotoURL       string
	SortOrder           int
}

type UpdateCompetitionInput struct {
	CompetitionID       string
	Name                *string
	DescriptionMarkdown *string
	RulesMarkdown       *string
	CoverPhotoURL       *string
	SortOrder           *int
}

type EventPrize struct {
	ID                  string
	EventID             string
	CompetitionID       string
	Title               string
	DescriptionMarkdown string
	PhotoURL            string
	Placement           string
	PlacementLabel      string
	PrizeType           string
	Amount              *float64
	Currency            string
	SponsorID           string
	SortOrder           int
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type CreatePrizeInput struct {
	CompetitionID       string
	Title               string
	DescriptionMarkdown string
	PhotoURL            string
	Placement           string
	PlacementLabel      string
	PrizeType           string
	Amount              *float64
	Currency            string
	SponsorID           string
	SortOrder           int
}

type UpdatePrizeInput struct {
	PrizeID             string
	CompetitionID       *string
	Title               *string
	DescriptionMarkdown *string
	PhotoURL            *string
	Placement           *string
	PlacementLabel      *string
	PrizeType           *string
	Amount              *float64
	Currency            *string
	SponsorID           *string
	SortOrder           *int
}

type EventSponsor struct {
	ID           string
	EventID      string
	Name         string
	Tier         string
	Description  string
	LogoMediaID  string
	LogoURL      string
	WebsiteURL   string
	SocialURL    string
	ContactName  string
	ContactEmail string
	SortOrder    int
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateSponsorInput struct {
	Name         string
	Tier         string
	Description  string
	LogoMediaID  string
	WebsiteURL   string
	SocialURL    string
	ContactName  string
	ContactEmail string
	SortOrder    int
	IsActive     bool
}

type UpdateSponsorInput struct {
	SponsorID    string
	Name         *string
	Tier         *string
	Description  *string
	LogoMediaID  *string
	WebsiteURL   *string
	SocialURL    *string
	ContactName  *string
	ContactEmail *string
	SortOrder    *int
	IsActive     *bool
}

type EventPost struct {
	ID                string
	EventID           string
	AuthorUserID      string
	PostType          string
	Title             string
	BodyMarkdown      string
	Status            string
	IsPinned          bool
	FishReactionCount int
	ViewerFishReacted bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
	AuthorDisplayName string
	AuthorUsername    string
	AuthorAvatarURL   string
}

type CreatePostInput struct {
	PostType     string
	Title        string
	BodyMarkdown string
	IsPinned     bool
}

type UpdatePostInput struct {
	PostID       string
	PostType     *string
	Title        *string
	BodyMarkdown *string
	Status       *string
	IsPinned     *bool
}

type EventPostReactionState struct {
	PostID            string
	FishReactionCount int
	ViewerFishReacted bool
}

func IsLastOrganizer(err error) bool {
	return errors.Is(err, ErrLastOrganizer)
}

func (r *Repo) ListCompetitions(ctx context.Context, eventID string) ([]EventCompetition, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, event_id::text, name, coalesce(description_markdown, ''),
			coalesce(rules_markdown, ''), coalesce(cover_photo_url, ''), sort_order, created_at, updated_at
		FROM event_competitions
		WHERE event_id = $1::uuid AND deleted_at IS NULL
		ORDER BY sort_order ASC, created_at ASC, id ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []EventCompetition{}
	for rows.Next() {
		var item EventCompetition
		if err := scanCompetition(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateCompetition(ctx context.Context, eventID string, input CreateCompetitionInput) (EventCompetition, error) {
	var item EventCompetition
	err := scanCompetition(r.pool.QueryRow(ctx, `
		INSERT INTO event_competitions (
			event_id, name, description_markdown, rules_markdown, cover_photo_url, sort_order
		) VALUES (
			$1::uuid, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), $6
		)
		RETURNING id::text, event_id::text, name, coalesce(description_markdown, ''),
			coalesce(rules_markdown, ''), coalesce(cover_photo_url, ''), sort_order, created_at, updated_at
	`, eventID, input.Name, input.DescriptionMarkdown, input.RulesMarkdown, input.CoverPhotoURL, input.SortOrder), &item)
	return item, err
}

func (r *Repo) UpdateCompetition(ctx context.Context, eventID string, input UpdateCompetitionInput) (EventCompetition, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addStringPatch(&set, &args, &idx, "name", input.Name, false)
	addStringPatch(&set, &args, &idx, "description_markdown", input.DescriptionMarkdown, true)
	addStringPatch(&set, &args, &idx, "rules_markdown", input.RulesMarkdown, true)
	addStringPatch(&set, &args, &idx, "cover_photo_url", input.CoverPhotoURL, true)
	addIntPatch(&set, &args, &idx, "sort_order", input.SortOrder)
	args = append(args, eventID, input.CompetitionID)
	q := fmt.Sprintf(`
		UPDATE event_competitions
		SET %s
		WHERE event_id = $%d::uuid AND id = $%d::uuid AND deleted_at IS NULL
		RETURNING id::text, event_id::text, name, coalesce(description_markdown, ''),
			coalesce(rules_markdown, ''), coalesce(cover_photo_url, ''), sort_order, created_at, updated_at
	`, strings.Join(set, ", "), idx, idx+1)
	var item EventCompetition
	err := scanCompetition(r.pool.QueryRow(ctx, q, args...), &item)
	return item, err
}

func (r *Repo) DeleteCompetition(ctx context.Context, eventID, competitionID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)

	res, err := tx.Exec(ctx, `
		UPDATE event_competitions
		SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
	`, eventID, competitionID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if _, err := tx.Exec(ctx, `
		UPDATE event_prizes
		SET competition_id = NULL, updated_at = NOW()
		WHERE event_id = $1::uuid AND competition_id = $2::uuid AND deleted_at IS NULL
	`, eventID, competitionID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) ListPrizes(ctx context.Context, eventID string) ([]EventPrize, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, event_id::text, coalesce(competition_id::text, ''), title,
			coalesce(description_markdown, ''), coalesce(photo_url, ''), placement, coalesce(placement_label, ''),
			coalesce(prize_type, ''), amount::float8, coalesce(currency, 'PHP'),
			coalesce(sponsor_id::text, ''), sort_order, created_at, updated_at
		FROM event_prizes
		WHERE event_id = $1::uuid AND deleted_at IS NULL
		ORDER BY sort_order ASC, created_at ASC, id ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []EventPrize{}
	for rows.Next() {
		var item EventPrize
		if err := scanPrize(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreatePrize(ctx context.Context, eventID string, input CreatePrizeInput) (EventPrize, error) {
	var item EventPrize
	err := scanPrize(r.pool.QueryRow(ctx, `
		INSERT INTO event_prizes (
			event_id, competition_id, title, description_markdown, placement,
			placement_label, prize_type, amount, currency, sponsor_id, photo_url, sort_order
		) VALUES (
			$1::uuid, nullif($2, '')::uuid, $3, nullif($4, ''), $5,
			nullif($6, ''), nullif($7, ''), $8, $9, nullif($10, '')::uuid, nullif($11, ''), $12
		)
		RETURNING id::text, event_id::text, coalesce(competition_id::text, ''), title,
			coalesce(description_markdown, ''), coalesce(photo_url, ''), placement, coalesce(placement_label, ''),
			coalesce(prize_type, ''), amount::float8, coalesce(currency, 'PHP'),
			coalesce(sponsor_id::text, ''), sort_order, created_at, updated_at
	`, eventID, input.CompetitionID, input.Title, input.DescriptionMarkdown, input.Placement,
		input.PlacementLabel, input.PrizeType, input.Amount, input.Currency, input.SponsorID, input.PhotoURL, input.SortOrder), &item)
	return item, err
}

func (r *Repo) UpdatePrize(ctx context.Context, eventID string, input UpdatePrizeInput) (EventPrize, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addUUIDStringPatch(&set, &args, &idx, "competition_id", input.CompetitionID)
	addStringPatch(&set, &args, &idx, "title", input.Title, false)
	addStringPatch(&set, &args, &idx, "description_markdown", input.DescriptionMarkdown, true)
	addStringPatch(&set, &args, &idx, "photo_url", input.PhotoURL, true)
	addStringPatch(&set, &args, &idx, "placement", input.Placement, false)
	addStringPatch(&set, &args, &idx, "placement_label", input.PlacementLabel, true)
	addStringPatch(&set, &args, &idx, "prize_type", input.PrizeType, true)
	addFloatPatch(&set, &args, &idx, "amount", input.Amount)
	addStringPatch(&set, &args, &idx, "currency", input.Currency, false)
	addUUIDStringPatch(&set, &args, &idx, "sponsor_id", input.SponsorID)
	addIntPatch(&set, &args, &idx, "sort_order", input.SortOrder)
	args = append(args, eventID, input.PrizeID)
	q := fmt.Sprintf(`
		UPDATE event_prizes
		SET %s
		WHERE event_id = $%d::uuid AND id = $%d::uuid AND deleted_at IS NULL
		RETURNING id::text, event_id::text, coalesce(competition_id::text, ''), title,
			coalesce(description_markdown, ''), coalesce(photo_url, ''), placement, coalesce(placement_label, ''),
			coalesce(prize_type, ''), amount::float8, coalesce(currency, 'PHP'),
			coalesce(sponsor_id::text, ''), sort_order, created_at, updated_at
	`, strings.Join(set, ", "), idx, idx+1)
	var item EventPrize
	err := scanPrize(r.pool.QueryRow(ctx, q, args...), &item)
	return item, err
}

func (r *Repo) DeletePrize(ctx context.Context, eventID, prizeID string) error {
	res, err := r.pool.Exec(ctx, `
		UPDATE event_prizes
		SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
	`, eventID, prizeID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) CompetitionBelongsToEvent(ctx context.Context, eventID, competitionID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM event_competitions
			WHERE event_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
		)
	`, eventID, competitionID).Scan(&exists)
	return exists, err
}

func (r *Repo) SponsorBelongsToEvent(ctx context.Context, eventID, sponsorID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM event_sponsors
			WHERE event_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
		)
	`, eventID, sponsorID).Scan(&exists)
	return exists, err
}

func (r *Repo) ListSponsors(ctx context.Context, eventID string) ([]EventSponsor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT s.id::text, s.event_id::text, s.name, coalesce(s.tier, ''),
			coalesce(s.description, ''), coalesce(s.logo_media_id::text, ''),
			coalesce(mo.object_key, ''), coalesce(s.website_url, ''),
			coalesce(s.social_url, ''), coalesce(s.contact_name, ''),
			coalesce(s.contact_email, ''), s.sort_order, s.is_active, s.created_at, s.updated_at
		FROM event_sponsors s
		LEFT JOIN media_objects mo ON mo.id = s.logo_media_id
			AND mo.context_type = 'event_attachment'
			AND mo.context_id = s.event_id
			AND mo.state = 'active'
		WHERE s.event_id = $1::uuid AND s.deleted_at IS NULL
		ORDER BY s.sort_order ASC, s.created_at ASC, s.id ASC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []EventSponsor{}
	for rows.Next() {
		var item EventSponsor
		if err := scanSponsor(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateSponsor(ctx context.Context, eventID string, input CreateSponsorInput) (EventSponsor, error) {
	var item EventSponsor
	err := scanSponsor(r.pool.QueryRow(ctx, `
		INSERT INTO event_sponsors (
			event_id, name, tier, description, logo_media_id, website_url, social_url,
			contact_name, contact_email, sort_order, is_active
		) VALUES (
			$1::uuid, $2, nullif($3, ''), nullif($4, ''), nullif($5, '')::uuid,
			nullif($6, ''), nullif($7, ''), nullif($8, ''), nullif($9, ''), $10, $11
		)
		RETURNING id::text, event_id::text, name, coalesce(tier, ''),
			coalesce(description, ''), coalesce(logo_media_id::text, ''),
			'', coalesce(website_url, ''), coalesce(social_url, ''),
			coalesce(contact_name, ''), coalesce(contact_email, ''), sort_order,
			is_active, created_at, updated_at
	`, eventID, input.Name, input.Tier, input.Description, input.LogoMediaID,
		input.WebsiteURL, input.SocialURL, input.ContactName, input.ContactEmail, input.SortOrder, input.IsActive), &item)
	return item, err
}

func (r *Repo) UpdateSponsor(ctx context.Context, eventID string, input UpdateSponsorInput) (EventSponsor, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addStringPatch(&set, &args, &idx, "name", input.Name, false)
	addStringPatch(&set, &args, &idx, "tier", input.Tier, true)
	addStringPatch(&set, &args, &idx, "description", input.Description, true)
	addUUIDStringPatch(&set, &args, &idx, "logo_media_id", input.LogoMediaID)
	addStringPatch(&set, &args, &idx, "website_url", input.WebsiteURL, true)
	addStringPatch(&set, &args, &idx, "social_url", input.SocialURL, true)
	addStringPatch(&set, &args, &idx, "contact_name", input.ContactName, true)
	addStringPatch(&set, &args, &idx, "contact_email", input.ContactEmail, true)
	addIntPatch(&set, &args, &idx, "sort_order", input.SortOrder)
	addBoolPatch(&set, &args, &idx, "is_active", input.IsActive)
	args = append(args, eventID, input.SponsorID)
	q := fmt.Sprintf(`
		UPDATE event_sponsors s
		SET %s
		WHERE s.event_id = $%d::uuid AND s.id = $%d::uuid AND s.deleted_at IS NULL
		RETURNING s.id::text, s.event_id::text, s.name, coalesce(s.tier, ''),
			coalesce(s.description, ''), coalesce(s.logo_media_id::text, ''),
			coalesce((
				SELECT mo.object_key
				FROM media_objects mo
				WHERE mo.id = s.logo_media_id
					AND mo.context_type = 'event_attachment'
					AND mo.context_id = s.event_id
					AND mo.state = 'active'
			), ''),
			coalesce(s.website_url, ''), coalesce(s.social_url, ''),
			coalesce(s.contact_name, ''), coalesce(s.contact_email, ''),
			s.sort_order, s.is_active, s.created_at, s.updated_at
	`, strings.Join(set, ", "), idx, idx+1)
	var item EventSponsor
	err := scanSponsor(r.pool.QueryRow(ctx, q, args...), &item)
	return item, err
}

func (r *Repo) DeleteSponsor(ctx context.Context, eventID, sponsorID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)

	res, err := tx.Exec(ctx, `
		UPDATE event_sponsors
		SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
	`, eventID, sponsorID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if _, err := tx.Exec(ctx, `
		UPDATE event_prizes
		SET sponsor_id = NULL, updated_at = NOW()
		WHERE event_id = $1::uuid AND sponsor_id = $2::uuid AND deleted_at IS NULL
	`, eventID, sponsorID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) MediaBelongsToEvent(ctx context.Context, eventID, mediaID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM media_objects
			WHERE id = $2::uuid
				AND context_type = 'event_attachment'
				AND context_id = $1::uuid
				AND state = 'active'
		)
	`, eventID, mediaID).Scan(&exists)
	return exists, err
}

func (r *Repo) ListPosts(ctx context.Context, eventID, viewerUserID string, includeHidden bool) ([]EventPost, error) {
	where := "p.event_id = $1::uuid AND p.deleted_at IS NULL AND p.status <> 'deleted'"
	if !includeHidden {
		where += " AND p.status = 'published'"
	}
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT p.id::text, p.event_id::text, p.author_user_id::text,
			coalesce(p.post_type, 'general'), coalesce(p.title, ''), p.body_markdown, p.status, p.is_pinned,
			coalesce(fr.fish_count, 0)::int,
			($2 <> '' AND EXISTS (
				SELECT 1 FROM event_update_reactions vr
				WHERE vr.event_update_id = p.id
					AND vr.user_id = nullif($2, '')::uuid
					AND vr.reaction_type = 'fish'
			)),
			p.created_at, p.updated_at, coalesce(u.display_name, ''),
			coalesce(u.username, ''), coalesce(pr.avatar_url, '')
		FROM event_posts p
		LEFT JOIN users u ON u.id = p.author_user_id
		LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
		LEFT JOIN (
			SELECT event_update_id, count(*) AS fish_count
			FROM event_update_reactions
			WHERE reaction_type = 'fish'
			GROUP BY event_update_id
		) fr ON fr.event_update_id = p.id
		WHERE %s
		ORDER BY p.is_pinned DESC, p.created_at DESC, p.id DESC
	`, where), eventID, viewerUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []EventPost{}
	for rows.Next() {
		var item EventPost
		if err := scanPost(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetPost(ctx context.Context, eventID, postID string) (EventPost, error) {
	var item EventPost
	err := scanPost(r.pool.QueryRow(ctx, `
		SELECT p.id::text, p.event_id::text, p.author_user_id::text,
			coalesce(p.post_type, 'general'), coalesce(p.title, ''), p.body_markdown, p.status, p.is_pinned,
			coalesce(fr.fish_count, 0)::int, false,
			p.created_at, p.updated_at, coalesce(u.display_name, ''),
			coalesce(u.username, ''), coalesce(pr.avatar_url, '')
		FROM event_posts p
		LEFT JOIN users u ON u.id = p.author_user_id
		LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
		LEFT JOIN (
			SELECT event_update_id, count(*) AS fish_count
			FROM event_update_reactions
			WHERE reaction_type = 'fish'
			GROUP BY event_update_id
		) fr ON fr.event_update_id = p.id
		WHERE p.event_id = $1::uuid AND p.id = $2::uuid
			AND p.deleted_at IS NULL AND p.status <> 'deleted'
	`, eventID, postID), &item)
	return item, err
}

func (r *Repo) CreatePost(ctx context.Context, eventID, authorUserID string, input CreatePostInput) (EventPost, error) {
	var item EventPost
	err := scanPost(r.pool.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO event_posts (
				event_id, author_user_id, post_type, title, body_markdown, status, is_pinned
			) VALUES (
				$1::uuid, $2::uuid, $3, nullif($4, ''), $5, 'published', $6
			)
			RETURNING *
		)
		SELECT p.id::text, p.event_id::text, p.author_user_id::text,
			coalesce(p.post_type, 'general'), coalesce(p.title, ''), p.body_markdown, p.status, p.is_pinned,
			0, false,
			p.created_at, p.updated_at, coalesce(u.display_name, ''),
			coalesce(u.username, ''), coalesce(pr.avatar_url, '')
		FROM inserted p
		LEFT JOIN users u ON u.id = p.author_user_id
		LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
	`, eventID, authorUserID, input.PostType, input.Title, input.BodyMarkdown, input.IsPinned), &item)
	return item, err
}

func (r *Repo) UpdatePost(ctx context.Context, eventID string, input UpdatePostInput) (EventPost, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addStringPatch(&set, &args, &idx, "post_type", input.PostType, false)
	addStringPatch(&set, &args, &idx, "title", input.Title, true)
	addStringPatch(&set, &args, &idx, "body_markdown", input.BodyMarkdown, false)
	addStringPatch(&set, &args, &idx, "status", input.Status, false)
	addBoolPatch(&set, &args, &idx, "is_pinned", input.IsPinned)
	args = append(args, eventID, input.PostID)
	q := fmt.Sprintf(`
		WITH updated AS (
			UPDATE event_posts
			SET %s
			WHERE event_id = $%d::uuid AND id = $%d::uuid
				AND deleted_at IS NULL AND status <> 'deleted'
			RETURNING *
		)
		SELECT p.id::text, p.event_id::text, p.author_user_id::text,
			coalesce(p.post_type, 'general'), coalesce(p.title, ''), p.body_markdown, p.status, p.is_pinned,
			coalesce(fr.fish_count, 0)::int, false,
			p.created_at, p.updated_at, coalesce(u.display_name, ''),
			coalesce(u.username, ''), coalesce(pr.avatar_url, '')
		FROM updated p
		LEFT JOIN users u ON u.id = p.author_user_id
		LEFT JOIN profiles pr ON pr.user_id = p.author_user_id
		LEFT JOIN (
			SELECT event_update_id, count(*) AS fish_count
			FROM event_update_reactions
			WHERE reaction_type = 'fish'
			GROUP BY event_update_id
		) fr ON fr.event_update_id = p.id
	`, strings.Join(set, ", "), idx, idx+1)
	var item EventPost
	err := scanPost(r.pool.QueryRow(ctx, q, args...), &item)
	return item, err
}

func (r *Repo) AddPostFishReaction(ctx context.Context, eventID, postID, userID string) (EventPostReactionState, error) {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO event_update_reactions (event_update_id, user_id, reaction_type)
		SELECT p.id, $3::uuid, 'fish'
		FROM event_posts p
		WHERE p.event_id = $1::uuid
			AND p.id = $2::uuid
			AND p.deleted_at IS NULL
			AND p.status = 'published'
		ON CONFLICT (event_update_id, user_id, reaction_type) DO NOTHING
	`, eventID, postID, userID)
	if err != nil {
		return EventPostReactionState{}, err
	}
	return r.GetPostReactionState(ctx, eventID, postID, userID)
}

func (r *Repo) DeletePostFishReaction(ctx context.Context, eventID, postID, userID string) (EventPostReactionState, error) {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM event_update_reactions r
		USING event_posts p
		WHERE r.event_update_id = p.id
			AND p.event_id = $1::uuid
			AND p.id = $2::uuid
			AND r.user_id = $3::uuid
			AND r.reaction_type = 'fish'
			AND p.deleted_at IS NULL
			AND p.status = 'published'
	`, eventID, postID, userID)
	if err != nil {
		return EventPostReactionState{}, err
	}
	return r.GetPostReactionState(ctx, eventID, postID, userID)
}

func (r *Repo) GetPostReactionState(ctx context.Context, eventID, postID, userID string) (EventPostReactionState, error) {
	var state EventPostReactionState
	err := r.pool.QueryRow(ctx, `
		SELECT p.id::text,
			coalesce(fr.fish_count, 0)::int,
			($3 <> '' AND EXISTS (
				SELECT 1 FROM event_update_reactions vr
				WHERE vr.event_update_id = p.id
					AND vr.user_id = nullif($3, '')::uuid
					AND vr.reaction_type = 'fish'
			))
		FROM event_posts p
		LEFT JOIN (
			SELECT event_update_id, count(*) AS fish_count
			FROM event_update_reactions
			WHERE reaction_type = 'fish'
			GROUP BY event_update_id
		) fr ON fr.event_update_id = p.id
		WHERE p.event_id = $1::uuid
			AND p.id = $2::uuid
			AND p.deleted_at IS NULL
			AND p.status = 'published'
	`, eventID, postID, userID).Scan(&state.PostID, &state.FishReactionCount, &state.ViewerFishReacted)
	return state, err
}

func (r *Repo) DeletePost(ctx context.Context, eventID, postID string) error {
	res, err := r.pool.Exec(ctx, `
		UPDATE event_posts
		SET status = 'deleted', deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND id = $2::uuid
			AND deleted_at IS NULL AND status <> 'deleted'
	`, eventID, postID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) UpdateParticipantRole(ctx context.Context, eventID, participantID, role, actorID string) (EventParticipant, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return EventParticipant{}, err
	}
	defer rollbackTx(ctx, tx)

	var participant EventParticipant
	if err := tx.QueryRow(ctx, `
		SELECT id::text, event_id::text, user_id::text, role, status
		FROM event_participations
		WHERE event_id = $1::uuid AND id = $2::uuid
		FOR UPDATE
	`, eventID, participantID).Scan(
		&participant.ID,
		&participant.EventID,
		&participant.UserID,
		&participant.Role,
		&participant.Status,
	); err != nil {
		return EventParticipant{}, err
	}
	if role == "organizer" && participant.Status != "confirmed" {
		return EventParticipant{}, ErrForbidden
	}
	if participant.Role == "organizer" && role == "participant" {
		var otherOrganizerCount int
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*)::int
			FROM event_participations
			WHERE event_id = $1::uuid
				AND id <> $2::uuid
				AND role = 'organizer'
				AND status = 'confirmed'
		`, eventID, participantID).Scan(&otherOrganizerCount); err != nil {
			return EventParticipant{}, err
		}
		if otherOrganizerCount == 0 {
			return EventParticipant{}, ErrLastOrganizer
		}

		var organizerUserID string
		if err := tx.QueryRow(ctx, `
			SELECT coalesce(organizer_user_id::text, '')
			FROM events
			WHERE id = $1::uuid
			FOR UPDATE
		`, eventID).Scan(&organizerUserID); err != nil {
			return EventParticipant{}, err
		}
		if organizerUserID == participant.UserID {
			var replacementUserID string
			if err := tx.QueryRow(ctx, `
				SELECT user_id::text
				FROM event_participations
				WHERE event_id = $1::uuid
					AND id <> $2::uuid
					AND role = 'organizer'
					AND status = 'confirmed'
				ORDER BY approved_at ASC NULLS LAST, created_at ASC
				LIMIT 1
			`, eventID, participantID).Scan(&replacementUserID); err != nil {
				return EventParticipant{}, err
			}
			if _, err := tx.Exec(ctx, `
				UPDATE events
				SET organizer_user_id = $2::uuid, updated_at = NOW()
				WHERE id = $1::uuid
			`, eventID, replacementUserID); err != nil {
				return EventParticipant{}, err
			}
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE event_participations
		SET role = $3, updated_at = NOW()
		WHERE event_id = $1::uuid AND id = $2::uuid
	`, eventID, participantID, role); err != nil {
		return EventParticipant{}, err
	}

	membershipRole := "attendee"
	if role == "organizer" {
		membershipRole = "organizer"
	}
	if _, err := tx.Exec(ctx, `
		UPDATE event_memberships
		SET role = $3, updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid
	`, eventID, participant.UserID, membershipRole); err != nil {
		return EventParticipant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return EventParticipant{}, err
	}
	return r.GetParticipant(ctx, eventID, participant.UserID)
}

func scanCompetition(row eventScanner, item *EventCompetition) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.Name,
		&item.DescriptionMarkdown,
		&item.RulesMarkdown,
		&item.CoverPhotoURL,
		&item.SortOrder,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return nil
}

func scanPrize(row eventScanner, item *EventPrize) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.CompetitionID,
		&item.Title,
		&item.DescriptionMarkdown,
		&item.PhotoURL,
		&item.Placement,
		&item.PlacementLabel,
		&item.PrizeType,
		&item.Amount,
		&item.Currency,
		&item.SponsorID,
		&item.SortOrder,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return nil
}

func scanSponsor(row eventScanner, item *EventSponsor) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.Name,
		&item.Tier,
		&item.Description,
		&item.LogoMediaID,
		&item.LogoURL,
		&item.WebsiteURL,
		&item.SocialURL,
		&item.ContactName,
		&item.ContactEmail,
		&item.SortOrder,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return nil
}

func scanPost(row eventScanner, item *EventPost) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.AuthorUserID,
		&item.PostType,
		&item.Title,
		&item.BodyMarkdown,
		&item.Status,
		&item.IsPinned,
		&item.FishReactionCount,
		&item.ViewerFishReacted,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.AuthorDisplayName,
		&item.AuthorUsername,
		&item.AuthorAvatarURL,
	); err != nil {
		return err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return nil
}

func addStringPatch(set *[]string, args *[]any, idx *int, column string, value *string, nullEmpty bool) {
	if value == nil {
		return
	}
	*args = append(*args, strings.TrimSpace(*value))
	if nullEmpty {
		*set = append(*set, fmt.Sprintf("%s = nullif($%d, '')", column, *idx))
	} else {
		*set = append(*set, fmt.Sprintf("%s = $%d", column, *idx))
	}
	*idx = *idx + 1
}

func addUUIDStringPatch(set *[]string, args *[]any, idx *int, column string, value *string) {
	if value == nil {
		return
	}
	*args = append(*args, strings.TrimSpace(*value))
	*set = append(*set, fmt.Sprintf("%s = nullif($%d, '')::uuid", column, *idx))
	*idx = *idx + 1
}

func addIntPatch(set *[]string, args *[]any, idx *int, column string, value *int) {
	if value == nil {
		return
	}
	*args = append(*args, *value)
	*set = append(*set, fmt.Sprintf("%s = $%d", column, *idx))
	*idx = *idx + 1
}

func addFloatPatch(set *[]string, args *[]any, idx *int, column string, value *float64) {
	if value == nil {
		return
	}
	*args = append(*args, *value)
	*set = append(*set, fmt.Sprintf("%s = $%d", column, *idx))
	*idx = *idx + 1
}

func addBoolPatch(set *[]string, args *[]any, idx *int, column string, value *bool) {
	if value == nil {
		return
	}
	*args = append(*args, *value)
	*set = append(*set, fmt.Sprintf("%s = $%d", column, *idx))
	*idx = *idx + 1
}
