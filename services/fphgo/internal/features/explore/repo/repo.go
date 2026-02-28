package repo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	exploreqlc "fphgo/internal/features/explore/repo/sqlc"
)

type Repo struct {
	queries *exploreqlc.Queries
}

type ListSitesInput struct {
	ViewerUserID    string
	Area            string
	Difficulty      string
	VerifiedOnly    bool
	Search          string
	CursorUpdatedAt time.Time
	CursorID        string
	Limit           int32
}

type SiteCard struct {
	ID                   string
	Slug                 string
	Name                 string
	Area                 string
	Latitude             *float64
	Longitude            *float64
	Difficulty           string
	DepthMinM            *float64
	DepthMaxM            *float64
	Hazards              []string
	VerificationStatus   string
	LastUpdatedAt        time.Time
	RecentUpdateCount    int64
	LastConditionSummary string
	IsSaved              bool
}

type SiteDetail struct {
	ID                    string
	Slug                  string
	Name                  string
	Area                  string
	Latitude              *float64
	Longitude             *float64
	Difficulty            string
	DepthMinM             *float64
	DepthMaxM             *float64
	Hazards               []string
	BestSeason            string
	TypicalConditions     string
	Access                string
	Fees                  string
	ContactInfo           string
	VerificationStatus    string
	VerifiedByUserID      string
	VerifiedByDisplayName string
	LastUpdatedAt         time.Time
	CreatedAt             time.Time
	ReportCount           int64
	LastConditionSummary  string
}

type ListUpdatesInput struct {
	SiteID           string
	CursorOccurredAt time.Time
	CursorID         string
	Limit            int32
}

type SiteUpdate struct {
	ID                   string
	DiveSiteID           string
	AuthorAppUserID      string
	AuthorDisplayName    string
	AuthorTrust          TrustSignals
	Note                 string
	ConditionVisibilityM *float64
	ConditionCurrent     string
	ConditionWaves       string
	ConditionTempC       *float64
	OccurredAt           time.Time
	CreatedAt            time.Time
}

type LatestUpdate struct {
	ID                   string
	DiveSiteID           string
	SiteSlug             string
	SiteName             string
	SiteArea             string
	AuthorAppUserID      string
	AuthorDisplayName    string
	AuthorTrust          TrustSignals
	Note                 string
	ConditionVisibilityM *float64
	ConditionCurrent     string
	ConditionWaves       string
	ConditionTempC       *float64
	OccurredAt           time.Time
	CreatedAt            time.Time
}

type TrustSignals struct {
	EmailVerified bool
	PhoneVerified bool
	CertLevel     string
	BuddyCount    int64
	ReportCount   int64
}

type CreateUpdateInput struct {
	SiteID               string
	AuthorAppUserID      string
	Note                 string
	ConditionVisibilityM *float64
	ConditionCurrent     *string
	ConditionWaves       *string
	ConditionTempC       *float64
	OccurredAt           time.Time
}

type SiteSummary struct {
	ID              string
	Slug            string
	Name            string
	Area            string
	ModerationState string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: exploreqlc.New(pool)}
}

func (r *Repo) ListSites(ctx context.Context, input ListSitesInput) ([]SiteCard, error) {
	rows, err := r.queries.ListSites(ctx, exploreqlc.ListSitesParams{
		ViewerUserID:     toUUID(input.ViewerUserID),
		AreaFilter:       input.Area,
		DifficultyFilter: input.Difficulty,
		VerifiedOnly:     input.VerifiedOnly,
		SearchText:       input.Search,
		CursorUpdatedAt:  timestamptz(input.CursorUpdatedAt),
		CursorID:         toUUID(input.CursorID),
		LimitRows:        input.Limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]SiteCard, 0, len(rows))
	for _, row := range rows {
		items = append(items, SiteCard{
			ID:                   row.ID.String(),
			Slug:                 row.Slug,
			Name:                 row.Name,
			Area:                 row.Area,
			Latitude:             row.Latitude,
			Longitude:            row.Longitude,
			Difficulty:           row.EntryDifficulty,
			DepthMinM:            numericPtr(row.DepthMinM),
			DepthMaxM:            numericPtr(row.DepthMaxM),
			Hazards:              row.Hazards,
			VerificationStatus:   row.VerificationStatus,
			LastUpdatedAt:        row.LastUpdatedAt.Time.UTC(),
			RecentUpdateCount:    row.RecentUpdateCount,
			LastConditionSummary: anyString(row.LastConditionSummary),
			IsSaved:              row.IsSaved,
		})
	}
	return items, nil
}

func (r *Repo) GetSiteBySlug(ctx context.Context, slug string) (SiteDetail, error) {
	row, err := r.queries.GetSiteBySlug(ctx, slug)
	if err != nil {
		return SiteDetail{}, err
	}
	return SiteDetail{
		ID:                    row.ID.String(),
		Slug:                  row.Slug,
		Name:                  row.Name,
		Area:                  row.Area,
		Latitude:              row.Latitude,
		Longitude:             row.Longitude,
		Difficulty:            row.EntryDifficulty,
		DepthMinM:             numericPtr(row.DepthMinM),
		DepthMaxM:             numericPtr(row.DepthMaxM),
		Hazards:               row.Hazards,
		BestSeason:            valueOrEmpty(row.BestSeason),
		TypicalConditions:     valueOrEmpty(row.TypicalConditions),
		Access:                valueOrEmpty(row.Access),
		Fees:                  valueOrEmpty(row.Fees),
		ContactInfo:           valueOrEmpty(row.ContactInfo),
		VerificationStatus:    row.VerificationStatus,
		VerifiedByUserID:      uuidOrEmpty(row.VerifiedByAppUserID),
		VerifiedByDisplayName: row.VerifiedByDisplayName,
		LastUpdatedAt:         row.LastUpdatedAt.Time.UTC(),
		CreatedAt:             row.CreatedAt.Time.UTC(),
		ReportCount:           row.ReportCount,
		LastConditionSummary:  anyString(row.LastConditionSummary),
	}, nil
}

func (r *Repo) ListUpdatesForSite(ctx context.Context, input ListUpdatesInput) ([]SiteUpdate, error) {
	rows, err := r.queries.ListUpdatesForSite(ctx, exploreqlc.ListUpdatesForSiteParams{
		DiveSiteID:       toUUID(input.SiteID),
		CursorOccurredAt: timestamptz(input.CursorOccurredAt),
		CursorID:         toUUID(input.CursorID),
		LimitRows:        input.Limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]SiteUpdate, 0, len(rows))
	for _, row := range rows {
		items = append(items, SiteUpdate{
			ID:                   row.ID.String(),
			DiveSiteID:           row.DiveSiteID.String(),
			AuthorAppUserID:      row.AuthorAppUserID.String(),
			AuthorDisplayName:    row.AuthorDisplayName,
			AuthorTrust: TrustSignals{
				EmailVerified: row.EmailVerified,
				PhoneVerified: row.PhoneVerified,
				CertLevel:     row.AuthorCertLevel,
				BuddyCount:    row.AuthorBuddyCount,
				ReportCount:   row.AuthorReportCount,
			},
			Note:                 row.Note,
			ConditionVisibilityM: numericPtr(row.ConditionVisibilityM),
			ConditionCurrent:     valueOrEmpty(row.ConditionCurrent),
			ConditionWaves:       valueOrEmpty(row.ConditionWaves),
			ConditionTempC:       numericPtr(row.ConditionTempC),
			OccurredAt:           row.OccurredAt.Time.UTC(),
			CreatedAt:            row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

func (r *Repo) ListLatestUpdates(ctx context.Context, area string, cursorOccurredAt time.Time, cursorID string, limit int32) ([]LatestUpdate, error) {
	rows, err := r.queries.ListLatestUpdates(ctx, exploreqlc.ListLatestUpdatesParams{
		AreaFilter:       area,
		CursorOccurredAt: timestamptz(cursorOccurredAt),
		CursorID:         toUUID(cursorID),
		LimitRows:        limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]LatestUpdate, 0, len(rows))
	for _, row := range rows {
		items = append(items, LatestUpdate{
			ID:                row.ID.String(),
			DiveSiteID:        row.DiveSiteID.String(),
			SiteSlug:          row.SiteSlug,
			SiteName:          row.SiteName,
			SiteArea:          row.SiteArea,
			AuthorAppUserID:   row.AuthorAppUserID.String(),
			AuthorDisplayName: row.AuthorDisplayName,
			AuthorTrust: TrustSignals{
				EmailVerified: row.EmailVerified,
				PhoneVerified: row.PhoneVerified,
				CertLevel:     row.AuthorCertLevel,
				BuddyCount:    row.AuthorBuddyCount,
				ReportCount:   row.AuthorReportCount,
			},
			Note:                 row.Note,
			ConditionVisibilityM: numericPtr(row.ConditionVisibilityM),
			ConditionCurrent:     valueOrEmpty(row.ConditionCurrent),
			ConditionWaves:       valueOrEmpty(row.ConditionWaves),
			ConditionTempC:       numericPtr(row.ConditionTempC),
			OccurredAt:           row.OccurredAt.Time.UTC(),
			CreatedAt:            row.CreatedAt.Time.UTC(),
		})
	}
	return items, nil
}

func (r *Repo) CreateUpdate(ctx context.Context, input CreateUpdateInput) (SiteUpdate, error) {
	row, err := r.queries.CreateUpdate(ctx, exploreqlc.CreateUpdateParams{
		DiveSiteID:           toUUID(input.SiteID),
		AuthorAppUserID:      toUUID(input.AuthorAppUserID),
		Note:                 input.Note,
		ConditionVisibilityM: numericValue(input.ConditionVisibilityM),
		ConditionCurrent:     input.ConditionCurrent,
		ConditionWaves:       input.ConditionWaves,
		ConditionTempC:       numericValue(input.ConditionTempC),
		OccurredAt:           timestamptz(input.OccurredAt),
	})
	if err != nil {
		return SiteUpdate{}, err
	}
	if err := r.queries.TouchSiteLastUpdated(ctx, exploreqlc.TouchSiteLastUpdatedParams{
		DiveSiteID:    toUUID(input.SiteID),
		LastUpdatedAt: timestamptz(input.OccurredAt),
	}); err != nil {
		return SiteUpdate{}, err
	}
	return SiteUpdate{
		ID:                   row.ID.String(),
		DiveSiteID:           row.DiveSiteID.String(),
		AuthorAppUserID:      row.AuthorAppUserID.String(),
		Note:                 row.Note,
		ConditionVisibilityM: numericPtr(row.ConditionVisibilityM),
		ConditionCurrent:     valueOrEmpty(row.ConditionCurrent),
		ConditionWaves:       valueOrEmpty(row.ConditionWaves),
		ConditionTempC:       numericPtr(row.ConditionTempC),
		OccurredAt:           row.OccurredAt.Time.UTC(),
		CreatedAt:            row.CreatedAt.Time.UTC(),
	}, nil
}

func (r *Repo) GetSiteForWrite(ctx context.Context, siteID string) (SiteSummary, error) {
	row, err := r.queries.GetSiteForWrite(ctx, toUUID(siteID))
	if err != nil {
		return SiteSummary{}, err
	}
	return SiteSummary{
		ID:              row.ID.String(),
		Slug:            row.Slug,
		Name:            row.Name,
		Area:            row.Area,
		ModerationState: row.ModerationState,
	}, nil
}

func (r *Repo) SaveSite(ctx context.Context, appUserID, siteID string) error {
	return r.queries.SaveSite(ctx, exploreqlc.SaveSiteParams{
		AppUserID:  toUUID(appUserID),
		DiveSiteID: toUUID(siteID),
	})
}

func (r *Repo) UnsaveSite(ctx context.Context, appUserID, siteID string) error {
	return r.queries.UnsaveSite(ctx, exploreqlc.UnsaveSiteParams{
		AppUserID:  toUUID(appUserID),
		DiveSiteID: toUUID(siteID),
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

func timestamptz(value time.Time) pgtype.Timestamptz {
	if value.IsZero() {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func numericPtr(value pgtype.Numeric) *float64 {
	if !value.Valid {
		return nil
	}
	floatVal, err := value.Float64Value()
	if err != nil || !floatVal.Valid {
		return nil
	}
	result := floatVal.Float64
	return &result
}

func numericValue(value *float64) pgtype.Numeric {
	if value == nil {
		return pgtype.Numeric{}
	}
	var numeric pgtype.Numeric
	_ = numeric.Scan(*value)
	return numeric
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func anyString(input any) string {
	switch value := input.(type) {
	case nil:
		return ""
	case string:
		return value
	case []byte:
		return string(value)
	default:
		return fmt.Sprintf("%v", value)
	}
}

func uuidOrEmpty(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	parsed := uuid.UUID(id.Bytes)
	return parsed.String()
}
