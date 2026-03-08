package repo

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	buddyfinderqlc "fphgo/internal/features/buddyfinder/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *buddyfinderqlc.Queries
}

type PreviewIntent struct {
	ID                 string
	AuthorAppUserID    string
	DiveSiteID         string
	Area               string
	IntentType         string
	TimeWindow         string
	DateStart          *time.Time
	DateEnd            *time.Time
	Note               string
	CreatedAt          time.Time
	ExpiresAt          time.Time
	EmailVerified      bool
	PhoneVerified      bool
	CertLevel          string
	BuddyCount         int64
	ReportCount        int64
	MutualBuddiesCount int64
}

type MemberIntent struct {
	ID                 string
	AuthorAppUserID    string
	DiveSiteID         string
	Username           string
	DisplayName        string
	AvatarURL          string
	HomeArea           string
	Area               string
	IntentType         string
	TimeWindow         string
	DateStart          *time.Time
	DateEnd            *time.Time
	Note               string
	CreatedAt          time.Time
	ExpiresAt          time.Time
	EmailVerified      bool
	PhoneVerified      bool
	CertLevel          string
	BuddyCount         int64
	ReportCount        int64
	MutualBuddiesCount int64
}

type SharePreview struct {
	ID              string
	AuthorAppUserID string
	DiveSiteID      string
	DiveSiteName    string
	Area            string
	IntentType      string
	TimeWindow      string
	DateStart       *time.Time
	DateEnd         *time.Time
	Note            string
	CreatedAt       time.Time
	ExpiresAt       time.Time
	EmailVerified   bool
	PhoneVerified   bool
	CertLevel       string
	BuddyCount      int64
	ReportCount     int64
}

type ListMemberIntentsInput struct {
	ViewerUserID    string
	Area            string
	IntentType      string
	TimeWindow      string
	CursorCreatedAt time.Time
	CursorID        string
	Limit           int32
}

type ListSiteIntentsInput struct {
	ViewerUserID    string
	DiveSiteID      string
	CursorCreatedAt time.Time
	CursorID        string
	Limit           int32
}

type Intent struct {
	ID              string
	AuthorAppUserID string
	DiveSiteID      string
	Area            string
	IntentType      string
	TimeWindow      string
	DateStart       *time.Time
	DateEnd         *time.Time
	Note            string
	Visibility      string
	State           string
	CreatedAt       time.Time
	ExpiresAt       time.Time
}

type CreateIntentInput struct {
	AuthorAppUserID string
	DiveSiteID      string
	Area            string
	IntentType      string
	TimeWindow      string
	DateStart       *time.Time
	DateEnd         *time.Time
	Note            *string
	ExpiresAt       time.Time
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: buddyfinderqlc.New(pool)}
}

func (r *Repo) CountPreviewByArea(ctx context.Context, area string) (int64, error) {
	return r.queries.CountPreviewByArea(ctx, area)
}

func (r *Repo) ListPreviewByArea(ctx context.Context, area string, limit int32) ([]PreviewIntent, error) {
	rows, err := r.queries.ListPreviewByArea(ctx, buddyfinderqlc.ListPreviewByAreaParams{
		AreaFilter: area,
		LimitRows:  limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]PreviewIntent, 0, len(rows))
	for _, row := range rows {
		items = append(items, PreviewIntent{
			ID:                 uuidOrEmpty(row.ID),
			AuthorAppUserID:    uuidOrEmpty(row.AuthorAppUserID),
			DiveSiteID:         uuidOrEmpty(row.DiveSiteID),
			Area:               row.Area,
			IntentType:         row.IntentType,
			TimeWindow:         row.TimeWindow,
			DateStart:          datePtr(row.DateStart),
			DateEnd:            datePtr(row.DateEnd),
			Note:               valueOrEmpty(row.Note),
			CreatedAt:          row.CreatedAt.Time.UTC(),
			ExpiresAt:          row.ExpiresAt.Time.UTC(),
			EmailVerified:      row.EmailVerified,
			PhoneVerified:      row.PhoneVerified,
			CertLevel:          valueOrEmpty(row.CertLevel),
			BuddyCount:         row.BuddyCount,
			ReportCount:        row.ReportCount,
			MutualBuddiesCount: row.MutualBuddiesCount,
		})
	}
	return items, nil
}

func (r *Repo) ListPreviewBySite(ctx context.Context, diveSiteID string, limit int32) ([]PreviewIntent, error) {
	rows, err := r.queries.ListPreviewBySite(ctx, buddyfinderqlc.ListPreviewBySiteParams{
		DiveSiteID: toUUID(diveSiteID),
		LimitRows:  limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]PreviewIntent, 0, len(rows))
	for _, row := range rows {
		items = append(items, PreviewIntent{
			ID:                 uuidOrEmpty(row.ID),
			AuthorAppUserID:    uuidOrEmpty(row.AuthorAppUserID),
			DiveSiteID:         uuidOrEmpty(row.DiveSiteID),
			Area:               row.Area,
			IntentType:         row.IntentType,
			TimeWindow:         row.TimeWindow,
			DateStart:          datePtr(row.DateStart),
			DateEnd:            datePtr(row.DateEnd),
			Note:               valueOrEmpty(row.Note),
			CreatedAt:          row.CreatedAt.Time.UTC(),
			ExpiresAt:          row.ExpiresAt.Time.UTC(),
			EmailVerified:      row.EmailVerified,
			PhoneVerified:      row.PhoneVerified,
			CertLevel:          valueOrEmpty(row.CertLevel),
			BuddyCount:         row.BuddyCount,
			ReportCount:        row.ReportCount,
			MutualBuddiesCount: row.MutualBuddiesCount,
		})
	}
	return items, nil
}

func (r *Repo) ListMemberIntentsByArea(ctx context.Context, input ListMemberIntentsInput) ([]MemberIntent, error) {
	rows, err := r.queries.ListMemberIntentsByArea(ctx, buddyfinderqlc.ListMemberIntentsByAreaParams{
		ViewerUserID:     toUUID(input.ViewerUserID),
		AreaFilter:       input.Area,
		IntentTypeFilter: input.IntentType,
		TimeWindowFilter: input.TimeWindow,
		CursorCreatedAt:  timestamptz(input.CursorCreatedAt),
		CursorID:         toUUID(input.CursorID),
		LimitRows:        input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MemberIntent, 0, len(rows))
	for _, row := range rows {
		items = append(items, MemberIntent{
			ID:                 uuidOrEmpty(row.ID),
			AuthorAppUserID:    uuidOrEmpty(row.AuthorAppUserID),
			DiveSiteID:         uuidOrEmpty(row.DiveSiteID),
			Username:           row.Username,
			DisplayName:        row.DisplayName,
			AvatarURL:          row.AvatarUrl,
			HomeArea:           row.HomeArea,
			Area:               row.Area,
			IntentType:         row.IntentType,
			TimeWindow:         row.TimeWindow,
			DateStart:          datePtr(row.DateStart),
			DateEnd:            datePtr(row.DateEnd),
			Note:               valueOrEmpty(row.Note),
			CreatedAt:          row.CreatedAt.Time.UTC(),
			ExpiresAt:          row.ExpiresAt.Time.UTC(),
			EmailVerified:      row.EmailVerified,
			PhoneVerified:      row.PhoneVerified,
			CertLevel:          valueOrEmpty(row.CertLevel),
			BuddyCount:         row.BuddyCount,
			ReportCount:        row.ReportCount,
			MutualBuddiesCount: row.MutualBuddiesCount,
		})
	}
	return items, nil
}

func (r *Repo) ListMemberIntentsBySite(ctx context.Context, input ListSiteIntentsInput) ([]MemberIntent, error) {
	rows, err := r.queries.ListMemberIntentsBySite(ctx, buddyfinderqlc.ListMemberIntentsBySiteParams{
		ViewerUserID:    toUUID(input.ViewerUserID),
		DiveSiteID:      toUUID(input.DiveSiteID),
		CursorCreatedAt: timestamptz(input.CursorCreatedAt),
		CursorID:        toUUID(input.CursorID),
		LimitRows:       input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MemberIntent, 0, len(rows))
	for _, row := range rows {
		items = append(items, MemberIntent{
			ID:                 uuidOrEmpty(row.ID),
			AuthorAppUserID:    uuidOrEmpty(row.AuthorAppUserID),
			DiveSiteID:         uuidOrEmpty(row.DiveSiteID),
			Username:           row.Username,
			DisplayName:        row.DisplayName,
			AvatarURL:          row.AvatarUrl,
			HomeArea:           row.HomeArea,
			Area:               row.Area,
			IntentType:         row.IntentType,
			TimeWindow:         row.TimeWindow,
			DateStart:          datePtr(row.DateStart),
			DateEnd:            datePtr(row.DateEnd),
			Note:               valueOrEmpty(row.Note),
			CreatedAt:          row.CreatedAt.Time.UTC(),
			ExpiresAt:          row.ExpiresAt.Time.UTC(),
			EmailVerified:      row.EmailVerified,
			PhoneVerified:      row.PhoneVerified,
			CertLevel:          valueOrEmpty(row.CertLevel),
			BuddyCount:         row.BuddyCount,
			ReportCount:        row.ReportCount,
			MutualBuddiesCount: row.MutualBuddiesCount,
		})
	}
	return items, nil
}

func (r *Repo) ListOwnIntents(ctx context.Context, actorUserID string) ([]MemberIntent, error) {
	rows, err := r.pool.Query(ctx, `
SELECT
  bi.id,
  bi.author_app_user_id,
  bi.dive_site_id,
  u.username,
  u.display_name,
  COALESCE(p.avatar_url, '') AS avatar_url,
  p.home_area,
  bi.area,
  bi.intent_type,
  bi.time_window,
  bi.date_start,
  bi.date_end,
  bi.note,
  bi.created_at,
  bi.expires_at,
  u.email_verified,
  u.phone_verified,
  p.cert_level,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM (
      SELECT app_user_id_a AS app_user_id FROM buddies
      UNION ALL
      SELECT app_user_id_b AS app_user_id FROM buddies
    ) pairs
    WHERE pairs.app_user_id = bi.author_app_user_id
  ), 0)::bigint AS buddy_count,
  COALESCE((
    SELECT COUNT(*)::bigint
    FROM reports r
    WHERE r.target_app_user_id = bi.author_app_user_id
  ), 0)::bigint AS report_count,
  0::bigint AS mutual_buddies_count
FROM buddy_intents bi
JOIN users u ON u.id = bi.author_app_user_id
JOIN profiles p ON p.user_id = bi.author_app_user_id
WHERE bi.state = 'active'
  AND bi.visibility = 'members'
  AND bi.expires_at > NOW()
  AND u.account_status = 'active'
  AND bi.author_app_user_id = $1::uuid
ORDER BY bi.created_at DESC, bi.id DESC
LIMIT 10
`, actorUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]MemberIntent, 0)
	for rows.Next() {
		var (
			id                 pgtype.UUID
			authorAppUserID    pgtype.UUID
			diveSiteID         pgtype.UUID
			username           string
			displayName        string
			avatarURL          string
			homeArea           string
			area               string
			intentType         string
			timeWindow         string
			dateStart          pgtype.Date
			dateEnd            pgtype.Date
			note               *string
			createdAt          pgtype.Timestamptz
			expiresAt          pgtype.Timestamptz
			emailVerified      bool
			phoneVerified      bool
			certLevel          *string
			buddyCount         int64
			reportCount        int64
			mutualBuddiesCount int64
		)
		if err := rows.Scan(
			&id,
			&authorAppUserID,
			&diveSiteID,
			&username,
			&displayName,
			&avatarURL,
			&homeArea,
			&area,
			&intentType,
			&timeWindow,
			&dateStart,
			&dateEnd,
			&note,
			&createdAt,
			&expiresAt,
			&emailVerified,
			&phoneVerified,
			&certLevel,
			&buddyCount,
			&reportCount,
			&mutualBuddiesCount,
		); err != nil {
			return nil, err
		}
		items = append(items, MemberIntent{
			ID:                 uuidOrEmpty(id),
			AuthorAppUserID:    uuidOrEmpty(authorAppUserID),
			DiveSiteID:         uuidOrEmpty(diveSiteID),
			Username:           username,
			DisplayName:        displayName,
			AvatarURL:          avatarURL,
			HomeArea:           homeArea,
			Area:               area,
			IntentType:         intentType,
			TimeWindow:         timeWindow,
			DateStart:          datePtr(dateStart),
			DateEnd:            datePtr(dateEnd),
			Note:               valueOrEmpty(note),
			CreatedAt:          createdAt.Time.UTC(),
			ExpiresAt:          expiresAt.Time.UTC(),
			EmailVerified:      emailVerified,
			PhoneVerified:      phoneVerified,
			CertLevel:          valueOrEmpty(certLevel),
			BuddyCount:         buddyCount,
			ReportCount:        reportCount,
			MutualBuddiesCount: mutualBuddiesCount,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repo) GetIntentByID(ctx context.Context, intentID string) (Intent, error) {
	row, err := r.queries.GetIntentByID(ctx, toUUID(intentID))
	if err != nil {
		return Intent{}, err
	}
	return Intent{
		ID:              uuidOrEmpty(row.ID),
		AuthorAppUserID: uuidOrEmpty(row.AuthorAppUserID),
		DiveSiteID:      uuidOrEmpty(row.DiveSiteID),
		Area:            row.Area,
		IntentType:      row.IntentType,
		TimeWindow:      row.TimeWindow,
		DateStart:       datePtr(row.DateStart),
		DateEnd:         datePtr(row.DateEnd),
		Note:            valueOrEmpty(row.Note),
		Visibility:      row.Visibility,
		State:           row.State,
		CreatedAt:       row.CreatedAt.Time.UTC(),
		ExpiresAt:       row.ExpiresAt.Time.UTC(),
	}, nil
}

func (r *Repo) GetSharePreviewByID(ctx context.Context, intentID string) (SharePreview, error) {
	row, err := r.queries.GetSharePreviewByID(ctx, toUUID(intentID))
	if err != nil {
		return SharePreview{}, err
	}
	return SharePreview{
		ID:              uuidOrEmpty(row.ID),
		AuthorAppUserID: uuidOrEmpty(row.AuthorAppUserID),
		DiveSiteID:      uuidOrEmpty(row.DiveSiteID),
		DiveSiteName:    row.DiveSiteName,
		Area:            row.Area,
		IntentType:      row.IntentType,
		TimeWindow:      row.TimeWindow,
		DateStart:       datePtr(row.DateStart),
		DateEnd:         datePtr(row.DateEnd),
		Note:            valueOrEmpty(row.Note),
		CreatedAt:       row.CreatedAt.Time.UTC(),
		ExpiresAt:       row.ExpiresAt.Time.UTC(),
		EmailVerified:   row.EmailVerified,
		PhoneVerified:   row.PhoneVerified,
		CertLevel:       valueOrEmpty(row.CertLevel),
		BuddyCount:      row.BuddyCount,
		ReportCount:     row.ReportCount,
	}, nil
}

func (r *Repo) CreateIntent(ctx context.Context, input CreateIntentInput) (Intent, error) {
	row, err := r.queries.CreateIntent(ctx, buddyfinderqlc.CreateIntentParams{
		AuthorAppUserID: toUUID(input.AuthorAppUserID),
		DiveSiteID:      toUUID(input.DiveSiteID),
		Area:            input.Area,
		IntentType:      input.IntentType,
		TimeWindow:      input.TimeWindow,
		DateStart:       dateValue(input.DateStart),
		DateEnd:         dateValue(input.DateEnd),
		Note:            input.Note,
		ExpiresAt:       timestamptz(input.ExpiresAt),
	})
	if err != nil {
		return Intent{}, err
	}
	return Intent{
		ID:              uuidOrEmpty(row.ID),
		AuthorAppUserID: uuidOrEmpty(row.AuthorAppUserID),
		DiveSiteID:      uuidOrEmpty(row.DiveSiteID),
		Area:            row.Area,
		IntentType:      row.IntentType,
		TimeWindow:      row.TimeWindow,
		DateStart:       datePtr(row.DateStart),
		DateEnd:         datePtr(row.DateEnd),
		Note:            valueOrEmpty(row.Note),
		Visibility:      row.Visibility,
		State:           row.State,
		CreatedAt:       row.CreatedAt.Time.UTC(),
		ExpiresAt:       row.ExpiresAt.Time.UTC(),
	}, nil
}

func (r *Repo) DeleteIntentByOwner(ctx context.Context, intentID, authorAppUserID string) (int64, error) {
	return r.queries.DeleteIntentByOwner(ctx, buddyfinderqlc.DeleteIntentByOwnerParams{
		IntentID:        toUUID(intentID),
		AuthorAppUserID: toUUID(authorAppUserID),
	})
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func toUUID(value string) pgtype.UUID {
	if value == "" {
		return pgtype.UUID{}
	}
	parsed, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{}
	}
	id := pgtype.UUID{Valid: true}
	copy(id.Bytes[:], parsed[:])
	return id
}

func uuidOrEmpty(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	parsed := uuid.UUID(id.Bytes)
	return parsed.String()
}

func timestamptz(value time.Time) pgtype.Timestamptz {
	if value.IsZero() {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func dateValue(value *time.Time) pgtype.Date {
	if value == nil || value.IsZero() {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: value.UTC(), Valid: true}
}

func datePtr(value pgtype.Date) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time.UTC()
	return &result
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}
