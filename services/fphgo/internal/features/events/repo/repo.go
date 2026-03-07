package repo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Event struct {
	ID               string
	Title            string
	Description      string
	Location         string
	LocationName     string
	FormattedAddress string
	Latitude         *float64
	Longitude        *float64
	GooglePlaceID    string
	RegionCode       string
	ProvinceCode     string
	CityCode         string
	BarangayCode     string
	LocationSource   string
	StartsAt         *time.Time
	EndsAt           *time.Time
	Status           string
	Visibility       string
	EventType        string
	Difficulty       string
	MaxAttendees     *int
	CurrentAttendees int
	OrganizerUserID  string
	GroupID          string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	ViewerJoined     bool
}

type EventAttendee struct {
	EventID     string
	UserID      string
	Role        string
	Status      string
	JoinedAt    *time.Time
	Notes       string
	DisplayName string
	Username    string
	AvatarURL   string
}

type ListEventsInput struct {
	ViewerUserID string
	Search       string
	Status       string
	Page         int
	Limit        int
	GroupID      string
}

type CreateEventInput struct {
	Title            string
	Description      string
	Location         string
	LocationName     string
	FormattedAddress string
	Latitude         *float64
	Longitude        *float64
	GooglePlaceID    string
	RegionCode       string
	ProvinceCode     string
	CityCode         string
	BarangayCode     string
	LocationSource   string
	StartsAt         *time.Time
	EndsAt           *time.Time
	Status           string
	Visibility       string
	EventType        string
	Difficulty       string
	MaxAttendees     *int
	OrganizerUserID  string
	GroupID          *string
}

type UpdateEventInput struct {
	EventID          string
	Title            *string
	Description      *string
	Location         *string
	LocationName     *string
	FormattedAddress *string
	Latitude         *float64
	Longitude        *float64
	GooglePlaceID    *string
	RegionCode       *string
	ProvinceCode     *string
	CityCode         *string
	BarangayCode     *string
	LocationSource   *string
	StartsAt         *time.Time
	EndsAt           *time.Time
	Status           *string
	Visibility       *string
	EventType        *string
	Difficulty       *string
	MaxAttendees     *int
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) ListEvents(ctx context.Context, input ListEventsInput) ([]Event, int, error) {
	where := []string{"e.status IN ('published', 'draft')"}
	args := []any{}
	idx := 1

	if strings.TrimSpace(input.ViewerUserID) == "" {
		where = append(where, "e.visibility = 'public'")
	} else {
		args = append(args, input.ViewerUserID)
		where = append(where, fmt.Sprintf(`(
			e.visibility = 'public'
			OR EXISTS (
				SELECT 1 FROM event_memberships em
				WHERE em.event_id = e.id AND em.user_id = $%d::uuid AND em.status = 'active'
			)
			OR (
				e.group_id IS NOT NULL AND EXISTS (
					SELECT 1 FROM group_memberships gm
					WHERE gm.group_id = e.group_id AND gm.user_id = $%d::uuid AND gm.status = 'active'
				)
			)
		)`, idx, idx))
		idx++
	}

	if value := strings.TrimSpace(input.Search); value != "" {
		args = append(args, "%"+strings.ToLower(value)+"%")
		where = append(where, fmt.Sprintf("(lower(e.title) LIKE $%d OR lower(coalesce(e.description, '')) LIKE $%d)", idx, idx))
		idx++
	}
	if value := strings.TrimSpace(input.Status); value != "" {
		args = append(args, strings.ToLower(value))
		where = append(where, fmt.Sprintf("e.status = $%d", idx))
		idx++
	}
	if value := strings.TrimSpace(input.GroupID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.group_id = $%d::uuid", idx))
		idx++
	}

	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 {
		input.Limit = 20
	}
	offset := (input.Page - 1) * input.Limit
	args = append(args, input.Limit, offset)
	limitArg := idx
	offsetArg := idx + 1

	joinedExpr := "false"
	if strings.TrimSpace(input.ViewerUserID) != "" {
		joinedExpr = fmt.Sprintf("EXISTS(SELECT 1 FROM event_memberships em WHERE em.event_id = e.id AND em.user_id = $1::uuid AND em.status = 'active')")
	}

	q := fmt.Sprintf(`
		SELECT
			e.id::text,
			e.title,
			coalesce(e.description, ''),
			coalesce(e.location, ''),
			coalesce(e.location_name, ''),
			coalesce(e.formatted_address, ''),
			e.latitude,
			e.longitude,
			coalesce(e.google_place_id, ''),
			coalesce(e.region_code, ''),
			coalesce(e.province_code, ''),
			coalesce(e.city_municipality_code, ''),
			coalesce(e.barangay_code, ''),
			coalesce(e.location_source, 'manual'),
			e.starts_at,
			e.ends_at,
			e.status,
			e.visibility,
			e.event_type,
			e.difficulty,
			e.max_attendees,
			coalesce((SELECT COUNT(*) FROM event_memberships em WHERE em.event_id = e.id AND em.status = 'active'), 0)::int,
			coalesce(e.organizer_user_id::text, ''),
			coalesce(e.group_id::text, ''),
			e.created_at,
			e.updated_at,
			%s AS viewer_joined,
			COUNT(*) OVER()::int AS total_count
		FROM events e
		WHERE %s
		ORDER BY coalesce(e.starts_at, e.created_at) DESC, e.id DESC
		LIMIT $%d OFFSET $%d
	`, joinedExpr, strings.Join(where, " AND "), limitArg, offsetArg)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]Event, 0)
	total := 0
	for rows.Next() {
		var item Event
		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Description,
			&item.Location,
			&item.LocationName,
			&item.FormattedAddress,
			&item.Latitude,
			&item.Longitude,
			&item.GooglePlaceID,
			&item.RegionCode,
			&item.ProvinceCode,
			&item.CityCode,
			&item.BarangayCode,
			&item.LocationSource,
			&item.StartsAt,
			&item.EndsAt,
			&item.Status,
			&item.Visibility,
			&item.EventType,
			&item.Difficulty,
			&item.MaxAttendees,
			&item.CurrentAttendees,
			&item.OrganizerUserID,
			&item.GroupID,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.ViewerJoined,
			&total,
		); err != nil {
			return nil, 0, err
		}
		normalizeEventTimes(&item)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) GetEventByID(ctx context.Context, eventID, viewerUserID string) (Event, error) {
	joinedExpr := "false"
	args := []any{eventID}
	if strings.TrimSpace(viewerUserID) != "" {
		joinedExpr = "EXISTS(SELECT 1 FROM event_memberships em WHERE em.event_id = e.id AND em.user_id = $2::uuid AND em.status = 'active')"
		args = append(args, viewerUserID)
	}
	q := fmt.Sprintf(`
		SELECT
			e.id::text,
			e.title,
			coalesce(e.description, ''),
			coalesce(e.location, ''),
			coalesce(e.location_name, ''),
			coalesce(e.formatted_address, ''),
			e.latitude,
			e.longitude,
			coalesce(e.google_place_id, ''),
			coalesce(e.region_code, ''),
			coalesce(e.province_code, ''),
			coalesce(e.city_municipality_code, ''),
			coalesce(e.barangay_code, ''),
			coalesce(e.location_source, 'manual'),
			e.starts_at,
			e.ends_at,
			e.status,
			e.visibility,
			e.event_type,
			e.difficulty,
			e.max_attendees,
			coalesce((SELECT COUNT(*) FROM event_memberships em WHERE em.event_id = e.id AND em.status = 'active'), 0)::int,
			coalesce(e.organizer_user_id::text, ''),
			coalesce(e.group_id::text, ''),
			e.created_at,
			e.updated_at,
			%s AS viewer_joined
		FROM events e
		WHERE e.id = $1::uuid
	`, joinedExpr)
	var item Event
	if err := r.pool.QueryRow(ctx, q, args...).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.Location,
		&item.LocationName,
		&item.FormattedAddress,
		&item.Latitude,
		&item.Longitude,
		&item.GooglePlaceID,
		&item.RegionCode,
		&item.ProvinceCode,
		&item.CityCode,
		&item.BarangayCode,
		&item.LocationSource,
		&item.StartsAt,
		&item.EndsAt,
		&item.Status,
		&item.Visibility,
		&item.EventType,
		&item.Difficulty,
		&item.MaxAttendees,
		&item.CurrentAttendees,
		&item.OrganizerUserID,
		&item.GroupID,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ViewerJoined,
	); err != nil {
		return Event{}, err
	}
	normalizeEventTimes(&item)
	return item, nil
}

func (r *Repo) CreateEvent(ctx context.Context, input CreateEventInput) (Event, error) {
	const q = `
		INSERT INTO events (
			title, description, location, starts_at, ends_at,
			location_name, formatted_address, latitude, longitude, google_place_id,
			region_code, province_code, city_municipality_code, barangay_code, location_source,
			status, visibility, event_type, difficulty, max_attendees,
			organizer_user_id, group_id
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, nullif($10, ''),
			nullif($11, ''), nullif($12, ''), nullif($13, ''), nullif($14, ''), $15,
			$16, $17, $18, $19, $20,
			$21::uuid, $22::uuid
		)
		RETURNING id::text, title, coalesce(description, ''), coalesce(location, ''), coalesce(location_name, ''), coalesce(formatted_address, ''), latitude, longitude, coalesce(google_place_id, ''), coalesce(region_code, ''), coalesce(province_code, ''), coalesce(city_municipality_code, ''), coalesce(barangay_code, ''), coalesce(location_source, 'manual'), starts_at, ends_at, status, visibility, event_type, difficulty, max_attendees, current_attendees, coalesce(organizer_user_id::text, ''), coalesce(group_id::text, ''), created_at, updated_at
	`
	var groupID any = nil
	if input.GroupID != nil {
		trimmed := strings.TrimSpace(*input.GroupID)
		if trimmed != "" {
			groupID = trimmed
		}
	}
	var item Event
	if err := r.pool.QueryRow(ctx, q,
		input.Title,
		input.Description,
		input.Location,
		input.StartsAt,
		input.EndsAt,
		input.LocationName,
		input.FormattedAddress,
		input.Latitude,
		input.Longitude,
		input.GooglePlaceID,
		input.RegionCode,
		input.ProvinceCode,
		input.CityCode,
		input.BarangayCode,
		input.LocationSource,
		input.Status,
		input.Visibility,
		input.EventType,
		input.Difficulty,
		input.MaxAttendees,
		input.OrganizerUserID,
		groupID,
	).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.Location,
		&item.LocationName,
		&item.FormattedAddress,
		&item.Latitude,
		&item.Longitude,
		&item.GooglePlaceID,
		&item.RegionCode,
		&item.ProvinceCode,
		&item.CityCode,
		&item.BarangayCode,
		&item.LocationSource,
		&item.StartsAt,
		&item.EndsAt,
		&item.Status,
		&item.Visibility,
		&item.EventType,
		&item.Difficulty,
		&item.MaxAttendees,
		&item.CurrentAttendees,
		&item.OrganizerUserID,
		&item.GroupID,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Event{}, err
	}
	normalizeEventTimes(&item)
	return item, nil
}

func (r *Repo) AddOrganizerMembership(ctx context.Context, eventID, userID string) error {
	const q = `
		INSERT INTO event_memberships (event_id, user_id, role, status, invited_by, joined_at)
		VALUES ($1::uuid, $2::uuid, 'organizer', 'active', $2::uuid, NOW())
		ON CONFLICT (event_id, user_id)
		DO UPDATE SET role = 'organizer', status = 'active', updated_at = NOW(), joined_at = COALESCE(event_memberships.joined_at, NOW())
	`
	_, err := r.pool.Exec(ctx, q, eventID, userID)
	return err
}

func (r *Repo) UpdateEvent(ctx context.Context, input UpdateEventInput) (Event, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	if input.Title != nil {
		args = append(args, strings.TrimSpace(*input.Title))
		set = append(set, fmt.Sprintf("title = $%d", idx))
		idx++
	}
	if input.Description != nil {
		args = append(args, strings.TrimSpace(*input.Description))
		set = append(set, fmt.Sprintf("description = $%d", idx))
		idx++
	}
	if input.Location != nil {
		args = append(args, strings.TrimSpace(*input.Location))
		set = append(set, fmt.Sprintf("location = $%d", idx))
		idx++
	}
	if input.LocationName != nil {
		args = append(args, strings.TrimSpace(*input.LocationName))
		set = append(set, fmt.Sprintf("location_name = $%d", idx))
		idx++
	}
	if input.FormattedAddress != nil {
		args = append(args, strings.TrimSpace(*input.FormattedAddress))
		set = append(set, fmt.Sprintf("formatted_address = $%d", idx))
		idx++
	}
	if input.Latitude != nil {
		args = append(args, *input.Latitude)
		set = append(set, fmt.Sprintf("latitude = $%d", idx))
		idx++
	}
	if input.Longitude != nil {
		args = append(args, *input.Longitude)
		set = append(set, fmt.Sprintf("longitude = $%d", idx))
		idx++
	}
	if input.GooglePlaceID != nil {
		args = append(args, strings.TrimSpace(*input.GooglePlaceID))
		set = append(set, fmt.Sprintf("google_place_id = nullif($%d, '')", idx))
		idx++
	}
	if input.RegionCode != nil {
		args = append(args, strings.TrimSpace(*input.RegionCode))
		set = append(set, fmt.Sprintf("region_code = nullif($%d, '')", idx))
		idx++
	}
	if input.ProvinceCode != nil {
		args = append(args, strings.TrimSpace(*input.ProvinceCode))
		set = append(set, fmt.Sprintf("province_code = nullif($%d, '')", idx))
		idx++
	}
	if input.CityCode != nil {
		args = append(args, strings.TrimSpace(*input.CityCode))
		set = append(set, fmt.Sprintf("city_municipality_code = nullif($%d, '')", idx))
		idx++
	}
	if input.BarangayCode != nil {
		args = append(args, strings.TrimSpace(*input.BarangayCode))
		set = append(set, fmt.Sprintf("barangay_code = nullif($%d, '')", idx))
		idx++
	}
	if input.LocationSource != nil {
		args = append(args, strings.TrimSpace(*input.LocationSource))
		set = append(set, fmt.Sprintf("location_source = $%d", idx))
		idx++
	}
	if input.StartsAt != nil {
		args = append(args, *input.StartsAt)
		set = append(set, fmt.Sprintf("starts_at = $%d", idx))
		idx++
	}
	if input.EndsAt != nil {
		args = append(args, *input.EndsAt)
		set = append(set, fmt.Sprintf("ends_at = $%d", idx))
		idx++
	}
	if input.Status != nil {
		args = append(args, strings.TrimSpace(*input.Status))
		set = append(set, fmt.Sprintf("status = $%d", idx))
		idx++
	}
	if input.Visibility != nil {
		args = append(args, strings.TrimSpace(*input.Visibility))
		set = append(set, fmt.Sprintf("visibility = $%d", idx))
		idx++
	}
	if input.EventType != nil {
		args = append(args, strings.TrimSpace(*input.EventType))
		set = append(set, fmt.Sprintf("event_type = $%d", idx))
		idx++
	}
	if input.Difficulty != nil {
		args = append(args, strings.TrimSpace(*input.Difficulty))
		set = append(set, fmt.Sprintf("difficulty = $%d", idx))
		idx++
	}
	if input.MaxAttendees != nil {
		args = append(args, *input.MaxAttendees)
		set = append(set, fmt.Sprintf("max_attendees = $%d", idx))
		idx++
	}

	args = append(args, input.EventID)
	q := fmt.Sprintf(`
		UPDATE events
		SET %s
		WHERE id = $%d::uuid
		RETURNING id::text, title, coalesce(description, ''), coalesce(location, ''), coalesce(location_name, ''), coalesce(formatted_address, ''), latitude, longitude, coalesce(google_place_id, ''), coalesce(region_code, ''), coalesce(province_code, ''), coalesce(city_municipality_code, ''), coalesce(barangay_code, ''), coalesce(location_source, 'manual'), starts_at, ends_at, status, visibility, event_type, difficulty, max_attendees, current_attendees, coalesce(organizer_user_id::text, ''), coalesce(group_id::text, ''), created_at, updated_at
	`, strings.Join(set, ", "), idx)

	var item Event
	if err := r.pool.QueryRow(ctx, q, args...).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.Location,
		&item.LocationName,
		&item.FormattedAddress,
		&item.Latitude,
		&item.Longitude,
		&item.GooglePlaceID,
		&item.RegionCode,
		&item.ProvinceCode,
		&item.CityCode,
		&item.BarangayCode,
		&item.LocationSource,
		&item.StartsAt,
		&item.EndsAt,
		&item.Status,
		&item.Visibility,
		&item.EventType,
		&item.Difficulty,
		&item.MaxAttendees,
		&item.CurrentAttendees,
		&item.OrganizerUserID,
		&item.GroupID,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return Event{}, err
	}
	normalizeEventTimes(&item)
	return item, nil
}

func (r *Repo) GetGroupRole(ctx context.Context, groupID, userID string) (string, error) {
	const q = `
		SELECT role
		FROM group_memberships
		WHERE group_id = $1::uuid AND user_id = $2::uuid AND status = 'active'
	`
	var role string
	if err := r.pool.QueryRow(ctx, q, groupID, userID).Scan(&role); err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return role, nil
}

func (r *Repo) UpsertAttendee(ctx context.Context, eventID, userID, role, status, notes string) (EventAttendee, error) {
	const q = `
		INSERT INTO event_memberships (event_id, user_id, role, status, joined_at, notes)
		VALUES ($1::uuid, $2::uuid, $3, $4, CASE WHEN $4 = 'active' THEN NOW() ELSE NULL END, nullif($5, ''))
		ON CONFLICT (event_id, user_id)
		DO UPDATE SET
			role = EXCLUDED.role,
			status = EXCLUDED.status,
			notes = EXCLUDED.notes,
			joined_at = CASE
				WHEN EXCLUDED.status = 'active' THEN COALESCE(event_memberships.joined_at, NOW())
				ELSE event_memberships.joined_at
			END,
			left_at = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE event_memberships.left_at END,
			updated_at = NOW()
		RETURNING event_id::text, user_id::text, role, status, joined_at, coalesce(notes, '')
	`
	var item EventAttendee
	if err := r.pool.QueryRow(ctx, q, eventID, userID, role, status, notes).Scan(
		&item.EventID,
		&item.UserID,
		&item.Role,
		&item.Status,
		&item.JoinedAt,
		&item.Notes,
	); err != nil {
		return EventAttendee{}, err
	}
	if item.JoinedAt != nil {
		t := item.JoinedAt.UTC()
		item.JoinedAt = &t
	}
	return item, nil
}

func (r *Repo) LeaveEvent(ctx context.Context, eventID, userID string) error {
	const q = `
		UPDATE event_memberships
		SET status = 'blocked', left_at = NOW(), updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid AND status = 'active'
	`
	res, err := r.pool.Exec(ctx, q, eventID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) GetAttendee(ctx context.Context, eventID, userID string) (EventAttendee, error) {
	const q = `
		SELECT event_id::text, user_id::text, role, status, joined_at, coalesce(notes, '')
		FROM event_memberships
		WHERE event_id = $1::uuid AND user_id = $2::uuid
	`
	var item EventAttendee
	if err := r.pool.QueryRow(ctx, q, eventID, userID).Scan(
		&item.EventID,
		&item.UserID,
		&item.Role,
		&item.Status,
		&item.JoinedAt,
		&item.Notes,
	); err != nil {
		return EventAttendee{}, err
	}
	if item.JoinedAt != nil {
		t := item.JoinedAt.UTC()
		item.JoinedAt = &t
	}
	return item, nil
}

func (r *Repo) ListAttendees(ctx context.Context, eventID string, page, limit int) ([]EventAttendee, int, error) {
	offset := (page - 1) * limit
	const q = `
		SELECT
			em.event_id::text,
			em.user_id::text,
			em.role,
			em.status,
			em.joined_at,
			coalesce(em.notes, ''),
			coalesce(u.display_name, ''),
			coalesce(u.username, ''),
			coalesce(p.avatar_url, ''),
			COUNT(*) OVER()::int AS total_count
		FROM event_memberships em
		LEFT JOIN users u ON u.id = em.user_id
		LEFT JOIN profiles p ON p.user_id = em.user_id
		WHERE em.event_id = $1::uuid AND em.status = 'active'
		ORDER BY em.joined_at DESC NULLS LAST, em.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, q, eventID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]EventAttendee, 0)
	total := 0
	for rows.Next() {
		var item EventAttendee
		if err := rows.Scan(
			&item.EventID,
			&item.UserID,
			&item.Role,
			&item.Status,
			&item.JoinedAt,
			&item.Notes,
			&item.DisplayName,
			&item.Username,
			&item.AvatarURL,
			&total,
		); err != nil {
			return nil, 0, err
		}
		if item.JoinedAt != nil {
			t := item.JoinedAt.UTC()
			item.JoinedAt = &t
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func IsNoRows(err error) bool {
	return err == pgx.ErrNoRows
}

func normalizeEventTimes(item *Event) {
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.StartsAt != nil {
		t := item.StartsAt.UTC()
		item.StartsAt = &t
	}
	if item.EndsAt != nil {
		t := item.EndsAt.UTC()
		item.EndsAt = &t
	}
}
