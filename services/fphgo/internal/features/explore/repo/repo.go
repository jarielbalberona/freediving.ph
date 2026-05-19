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
	SavedOnly       bool
	Search          string
	Bounds          *MapBounds
	CursorUpdatedAt time.Time
	CursorID        string
	Limit           int32
}

type MapBounds struct {
	North float64
	South float64
	East  float64
	West  float64
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
	SiteBuddyIntentCount int64
	AreaBuddyIntentCount int64
	LastConditionSummary string
	IsSaved              bool
	LikeCount            int64
	ViewerHasLiked       bool
}

type SiteDetail struct {
	ID                    string
	Slug                  string
	Name                  string
	Area                  string
	Latitude              *float64
	Longitude             *float64
	Description           string
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
	LikeCount             int64
	ViewerHasLiked        bool
}

type LikeState struct {
	TargetID       string
	LikeCount      int64
	ViewerHasLiked bool
}

type DivePresence struct {
	ID             string
	UserID         string
	DiveSiteID     string
	PresenceType   string
	StartAt        *time.Time
	EndAt          *time.Time
	Visibility     string
	ContactEnabled bool
	Note           string
	Status         string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type VisibleDivePresence struct {
	DivePresence
	Username       string
	DisplayName    string
	AvatarURL      string
	ContactAllowed bool
}

type CreateDivePresenceInput struct {
	UserID         string
	DiveSiteID     string
	PresenceType   string
	StartAt        *time.Time
	EndAt          *time.Time
	Visibility     string
	ContactEnabled bool
	Note           *string
}

type DiveSiteAffinity struct {
	ID             string
	UserID         string
	DiveSiteID     string
	Relationship   string
	Visibility     string
	ContactEnabled bool
	Note           string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type VisibleDiveSiteAffinity struct {
	DiveSiteAffinity
	Username       string
	DisplayName    string
	AvatarURL      string
	ContactAllowed bool
}

type UpsertDiveSiteAffinityInput struct {
	UserID         string
	DiveSiteID     string
	Relationship   string
	Visibility     string
	ContactEnabled bool
	Note           *string
}

type CreateSiteSubmissionInput struct {
	Name                 string
	Slug                 string
	Area                 string
	Latitude             *float64
	Longitude            *float64
	Description          string
	Difficulty           string
	DepthMinM            *float64
	DepthMaxM            *float64
	Hazards              []string
	BestSeason           *string
	TypicalConditions    *string
	Access               *string
	Fees                 *string
	ContactInfo          *string
	SubmittedByAppUserID string
}

type ListSiteSubmissionsInput struct {
	SubmittedByAppUserID string
	CursorCreatedAt      time.Time
	CursorID             string
	Limit                int32
}

type ListPendingSitesInput struct {
	CursorCreatedAt time.Time
	CursorID        string
	Limit           int32
}

type SiteSubmission struct {
	ID                     string
	Slug                   string
	Name                   string
	Area                   string
	Latitude               *float64
	Longitude              *float64
	Description            string
	Difficulty             string
	DepthMinM              *float64
	DepthMaxM              *float64
	Hazards                []string
	BestSeason             string
	TypicalConditions      string
	Access                 string
	Fees                   string
	ContactInfo            string
	VerificationStatus     string
	SubmittedByAppUserID   string
	SubmittedByDisplayName string
	ReviewedByAppUserID    string
	ReviewedByDisplayName  string
	ReviewedAt             *time.Time
	ModerationReason       string
	ModerationState        string
	LastUpdatedAt          time.Time
	UpdatedAt              time.Time
	CreatedAt              time.Time
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
	bounds := input.Bounds
	hasBounds := bounds != nil
	var north, south, east, west float64
	if bounds != nil {
		north = bounds.North
		south = bounds.South
		east = bounds.East
		west = bounds.West
	}

	rows, err := r.queries.ListSites(ctx, exploreqlc.ListSitesParams{
		ViewerUserID:     toUUID(input.ViewerUserID),
		AreaFilter:       input.Area,
		DifficultyFilter: input.Difficulty,
		VerifiedOnly:     input.VerifiedOnly,
		SavedOnly:        input.SavedOnly,
		SearchText:       input.Search,
		HasBounds:        hasBounds,
		North:            north,
		South:            south,
		East:             east,
		West:             west,
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
			SiteBuddyIntentCount: row.ActiveSiteBuddyIntentCount,
			AreaBuddyIntentCount: row.ActiveAreaBuddyIntentCount,
			LastConditionSummary: anyString(row.LastConditionSummary),
			IsSaved:              row.IsSaved,
			LikeCount:            row.LikeCount,
			ViewerHasLiked:       row.ViewerHasLiked,
		})
	}
	return items, nil
}

func (r *Repo) GetSiteBySlug(ctx context.Context, slug, viewerUserID string) (SiteDetail, error) {
	row, err := r.queries.GetSiteBySlug(ctx, exploreqlc.GetSiteBySlugParams{
		Slug:         slug,
		ViewerUserID: toUUID(viewerUserID),
	})
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
		Description:           valueOrEmpty(row.Description),
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
		LikeCount:             row.LikeCount,
		ViewerHasLiked:        row.ViewerHasLiked,
	}, nil
}

func (r *Repo) FindApprovedSiteDuplicate(ctx context.Context, name, area string) (string, error) {
	id, err := r.queries.FindApprovedSiteDuplicate(ctx, exploreqlc.FindApprovedSiteDuplicateParams{
		Name: name,
		Area: area,
	})
	if err != nil {
		return "", err
	}
	return uuidOrEmpty(id), nil
}

func (r *Repo) SlugExists(ctx context.Context, slug string) (bool, error) {
	return r.queries.SlugExists(ctx, slug)
}

func (r *Repo) CreateSiteSubmission(ctx context.Context, input CreateSiteSubmissionInput) (SiteSubmission, error) {
	description := input.Description
	row, err := r.queries.CreateSiteSubmission(ctx, exploreqlc.CreateSiteSubmissionParams{
		Name:                 input.Name,
		Slug:                 input.Slug,
		Area:                 input.Area,
		Latitude:             input.Latitude,
		Longitude:            input.Longitude,
		Description:          &description,
		EntryDifficulty:      input.Difficulty,
		DepthMinM:            numericValue(input.DepthMinM),
		DepthMaxM:            numericValue(input.DepthMaxM),
		Hazards:              input.Hazards,
		BestSeason:           input.BestSeason,
		TypicalConditions:    input.TypicalConditions,
		Access:               input.Access,
		Fees:                 input.Fees,
		ContactInfo:          input.ContactInfo,
		SubmittedByAppUserID: toUUID(input.SubmittedByAppUserID),
	})
	if err != nil {
		return SiteSubmission{}, err
	}
	return mapDiveSiteSubmission(row, "", ""), nil
}

func (r *Repo) ListMySiteSubmissions(ctx context.Context, input ListSiteSubmissionsInput) ([]SiteSubmission, error) {
	rows, err := r.queries.ListMySiteSubmissions(ctx, exploreqlc.ListMySiteSubmissionsParams{
		SubmittedByAppUserID: toUUID(input.SubmittedByAppUserID),
		CursorCreatedAt:      timestamptz(input.CursorCreatedAt),
		CursorID:             toUUID(input.CursorID),
		LimitRows:            input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]SiteSubmission, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMySubmission(row))
	}
	return items, nil
}

func (r *Repo) GetMySiteSubmissionByID(ctx context.Context, id, submittedByAppUserID string) (SiteSubmission, error) {
	row, err := r.queries.GetMySiteSubmissionByID(ctx, exploreqlc.GetMySiteSubmissionByIDParams{
		ID:                   toUUID(id),
		SubmittedByAppUserID: toUUID(submittedByAppUserID),
	})
	if err != nil {
		return SiteSubmission{}, err
	}
	return mapMySubmissionDetail(row), nil
}

func (r *Repo) ListPendingSites(ctx context.Context, input ListPendingSitesInput) ([]SiteSubmission, error) {
	rows, err := r.queries.ListPendingSites(ctx, exploreqlc.ListPendingSitesParams{
		CursorCreatedAt: timestamptz(input.CursorCreatedAt),
		CursorID:        toUUID(input.CursorID),
		LimitRows:       input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]SiteSubmission, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapPendingSubmission(row))
	}
	return items, nil
}

func (r *Repo) GetSiteByIDForModeration(ctx context.Context, id string) (SiteSubmission, error) {
	row, err := r.queries.GetSiteByIDForModeration(ctx, toUUID(id))
	if err != nil {
		return SiteSubmission{}, err
	}
	return mapModerationSubmission(row), nil
}

func (r *Repo) ApproveSite(ctx context.Context, id, slug, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (SiteSubmission, error) {
	row, err := r.queries.ApproveSite(ctx, exploreqlc.ApproveSiteParams{
		Slug:                slug,
		ReviewedByAppUserID: toUUID(reviewedByAppUserID),
		ReviewedAt:          timestamptz(reviewedAt),
		ModerationReason:    moderationReason,
		ID:                  toUUID(id),
	})
	if err != nil {
		return SiteSubmission{}, err
	}
	return mapDiveSiteSubmission(row, "", ""), nil
}

func (r *Repo) RejectOrHideSite(ctx context.Context, id, reviewedByAppUserID string, reviewedAt time.Time, moderationReason *string) (SiteSubmission, error) {
	row, err := r.queries.RejectOrHideSite(ctx, exploreqlc.RejectOrHideSiteParams{
		ReviewedByAppUserID: toUUID(reviewedByAppUserID),
		ReviewedAt:          timestamptz(reviewedAt),
		ModerationReason:    moderationReason,
		ID:                  toUUID(id),
	})
	if err != nil {
		return SiteSubmission{}, err
	}
	return mapDiveSiteSubmission(row, "", ""), nil
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
			ID:                row.ID.String(),
			DiveSiteID:        row.DiveSiteID.String(),
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

func (r *Repo) GetVisibleDiveSiteLikeState(ctx context.Context, siteID, viewerUserID string) (LikeState, error) {
	row, err := r.queries.GetVisibleDiveSiteLikeState(ctx, exploreqlc.GetVisibleDiveSiteLikeStateParams{
		DiveSiteID:   toUUID(siteID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return LikeState{}, err
	}
	return LikeState{
		TargetID:       row.ID.String(),
		LikeCount:      row.LikeCount,
		ViewerHasLiked: row.ViewerHasLiked,
	}, nil
}

func (r *Repo) LikeDiveSite(ctx context.Context, siteID, userID string) error {
	return r.queries.LikeDiveSite(ctx, exploreqlc.LikeDiveSiteParams{
		DiveSiteID: toUUID(siteID),
		UserID:     toUUID(userID),
	})
}

func (r *Repo) UnlikeDiveSite(ctx context.Context, siteID, userID string) error {
	return r.queries.UnlikeDiveSite(ctx, exploreqlc.UnlikeDiveSiteParams{
		DiveSiteID: toUUID(siteID),
		UserID:     toUUID(userID),
	})
}

func (r *Repo) CreateDivePresence(ctx context.Context, input CreateDivePresenceInput) (DivePresence, error) {
	row, err := r.queries.CreateDivePresence(ctx, exploreqlc.CreateDivePresenceParams{
		UserID:         toUUID(input.UserID),
		DiveSiteID:     toUUID(input.DiveSiteID),
		PresenceType:   input.PresenceType,
		StartAt:        timestamptzFromPtr(input.StartAt),
		EndAt:          timestamptzFromPtr(input.EndAt),
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           input.Note,
	})
	if err != nil {
		return DivePresence{}, err
	}
	return mapDivePresence(row), nil
}

func (r *Repo) UpdateDivePresenceByOwner(ctx context.Context, presenceID string, input CreateDivePresenceInput) (DivePresence, error) {
	row, err := r.queries.UpdateDivePresenceByOwner(ctx, exploreqlc.UpdateDivePresenceByOwnerParams{
		PresenceType:   input.PresenceType,
		StartAt:        timestamptzFromPtr(input.StartAt),
		EndAt:          timestamptzFromPtr(input.EndAt),
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           input.Note,
		PresenceID:     toUUID(presenceID),
		UserID:         toUUID(input.UserID),
		DiveSiteID:     toUUID(input.DiveSiteID),
	})
	if err != nil {
		return DivePresence{}, err
	}
	return mapDivePresence(row), nil
}

func (r *Repo) CancelDivePresenceByOwner(ctx context.Context, presenceID, userID, siteID string) (int64, error) {
	return r.queries.CancelDivePresenceByOwner(ctx, exploreqlc.CancelDivePresenceByOwnerParams{
		PresenceID: toUUID(presenceID),
		UserID:     toUUID(userID),
		DiveSiteID: toUUID(siteID),
	})
}

func (r *Repo) ExpirePastDivePresences(ctx context.Context) error {
	return r.queries.ExpirePastDivePresences(ctx)
}

func (r *Repo) CountActiveDivePresencesByUser(ctx context.Context, userID string) (int64, error) {
	return r.queries.CountActiveDivePresencesByUser(ctx, toUUID(userID))
}

func (r *Repo) ListCurrentUserDivePresences(ctx context.Context, userID string) ([]DivePresence, error) {
	rows, err := r.queries.ListCurrentUserDivePresences(ctx, toUUID(userID))
	if err != nil {
		return nil, err
	}
	items := make([]DivePresence, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapDivePresence(row))
	}
	return items, nil
}

func (r *Repo) ListVisibleDivePresencesBySite(ctx context.Context, viewerUserID, siteID string, limit int32) ([]VisibleDivePresence, error) {
	rows, err := r.queries.ListVisibleDivePresencesBySite(ctx, exploreqlc.ListVisibleDivePresencesBySiteParams{
		ViewerUserID: toUUID(viewerUserID),
		DiveSiteID:   toUUID(siteID),
		LimitRows:    limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]VisibleDivePresence, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapVisibleDivePresence(row))
	}
	return items, nil
}

func (r *Repo) CountVisibleDivePresencesBySite(ctx context.Context, viewerUserID, siteID string) (int64, error) {
	return r.queries.CountVisibleDivePresencesBySite(ctx, exploreqlc.CountVisibleDivePresencesBySiteParams{
		ViewerUserID: toUUID(viewerUserID),
		DiveSiteID:   toUUID(siteID),
	})
}

func (r *Repo) UpsertDiveSiteAffinity(ctx context.Context, input UpsertDiveSiteAffinityInput) (DiveSiteAffinity, error) {
	row, err := r.queries.UpsertDiveSiteAffinity(ctx, exploreqlc.UpsertDiveSiteAffinityParams{
		UserID:         toUUID(input.UserID),
		DiveSiteID:     toUUID(input.DiveSiteID),
		Relationship:   input.Relationship,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           input.Note,
	})
	if err != nil {
		return DiveSiteAffinity{}, err
	}
	return mapDiveSiteAffinity(row), nil
}

func (r *Repo) UpdateDiveSiteAffinityByOwner(ctx context.Context, affinityID string, input UpsertDiveSiteAffinityInput) (DiveSiteAffinity, error) {
	row, err := r.queries.UpdateDiveSiteAffinityByOwner(ctx, exploreqlc.UpdateDiveSiteAffinityByOwnerParams{
		Relationship:   input.Relationship,
		Visibility:     input.Visibility,
		ContactEnabled: input.ContactEnabled,
		Note:           input.Note,
		AffinityID:     toUUID(affinityID),
		UserID:         toUUID(input.UserID),
		DiveSiteID:     toUUID(input.DiveSiteID),
	})
	if err != nil {
		return DiveSiteAffinity{}, err
	}
	return mapDiveSiteAffinity(row), nil
}

func (r *Repo) DeleteDiveSiteAffinityByOwner(ctx context.Context, affinityID, userID, siteID string) (int64, error) {
	return r.queries.DeleteDiveSiteAffinityByOwner(ctx, exploreqlc.DeleteDiveSiteAffinityByOwnerParams{
		AffinityID: toUUID(affinityID),
		UserID:     toUUID(userID),
		DiveSiteID: toUUID(siteID),
	})
}

func (r *Repo) ListCurrentUserDiveSiteAffinities(ctx context.Context, userID string) ([]DiveSiteAffinity, error) {
	rows, err := r.queries.ListCurrentUserDiveSiteAffinities(ctx, toUUID(userID))
	if err != nil {
		return nil, err
	}
	items := make([]DiveSiteAffinity, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapDiveSiteAffinity(row))
	}
	return items, nil
}

func (r *Repo) ListVisibleDiveSiteAffinitiesBySite(ctx context.Context, viewerUserID, siteID string, limit int32) ([]VisibleDiveSiteAffinity, error) {
	rows, err := r.queries.ListVisibleDiveSiteAffinitiesBySite(ctx, exploreqlc.ListVisibleDiveSiteAffinitiesBySiteParams{
		ViewerUserID: toUUID(viewerUserID),
		DiveSiteID:   toUUID(siteID),
		LimitRows:    limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]VisibleDiveSiteAffinity, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapVisibleDiveSiteAffinity(row))
	}
	return items, nil
}

func (r *Repo) CountVisibleDiveSiteAffinitiesBySite(ctx context.Context, viewerUserID, siteID string) (int64, error) {
	return r.queries.CountVisibleDiveSiteAffinitiesBySite(ctx, exploreqlc.CountVisibleDiveSiteAffinitiesBySiteParams{
		ViewerUserID: toUUID(viewerUserID),
		DiveSiteID:   toUUID(siteID),
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

func timestamptzFromPtr(value *time.Time) pgtype.Timestamptz {
	if value == nil {
		return pgtype.Timestamptz{}
	}
	return timestamptz(*value)
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

func stringOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func timestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time.UTC()
	return &result
}

func mapDivePresence(row exploreqlc.DivePresence) DivePresence {
	return DivePresence{
		ID:             uuidOrEmpty(row.ID),
		UserID:         uuidOrEmpty(row.UserID),
		DiveSiteID:     uuidOrEmpty(row.DiveSiteID),
		PresenceType:   row.PresenceType,
		StartAt:        timestamptzPtr(row.StartAt),
		EndAt:          timestamptzPtr(row.EndAt),
		Visibility:     row.Visibility,
		ContactEnabled: row.ContactEnabled,
		Note:           stringOrEmpty(row.Note),
		Status:         row.Status,
		CreatedAt:      row.CreatedAt.Time.UTC(),
		UpdatedAt:      row.UpdatedAt.Time.UTC(),
	}
}

func mapVisibleDivePresence(row exploreqlc.ListVisibleDivePresencesBySiteRow) VisibleDivePresence {
	return VisibleDivePresence{
		DivePresence: DivePresence{
			ID:             uuidOrEmpty(row.ID),
			UserID:         uuidOrEmpty(row.UserID),
			DiveSiteID:     uuidOrEmpty(row.DiveSiteID),
			PresenceType:   row.PresenceType,
			StartAt:        timestamptzPtr(row.StartAt),
			EndAt:          timestamptzPtr(row.EndAt),
			Visibility:     row.Visibility,
			ContactEnabled: row.ContactEnabled,
			Note:           stringOrEmpty(row.Note),
			Status:         row.Status,
			CreatedAt:      row.CreatedAt.Time.UTC(),
			UpdatedAt:      row.UpdatedAt.Time.UTC(),
		},
		Username:       row.Username,
		DisplayName:    row.DisplayName,
		AvatarURL:      row.AvatarUrl,
		ContactAllowed: row.ContactAllowed,
	}
}

func mapDiveSiteAffinity(row exploreqlc.UserDiveSiteAffinity) DiveSiteAffinity {
	return DiveSiteAffinity{
		ID:             uuidOrEmpty(row.ID),
		UserID:         uuidOrEmpty(row.UserID),
		DiveSiteID:     uuidOrEmpty(row.DiveSiteID),
		Relationship:   row.Relationship,
		Visibility:     row.Visibility,
		ContactEnabled: row.ContactEnabled,
		Note:           stringOrEmpty(row.Note),
		CreatedAt:      row.CreatedAt.Time.UTC(),
		UpdatedAt:      row.UpdatedAt.Time.UTC(),
	}
}

func mapVisibleDiveSiteAffinity(row exploreqlc.ListVisibleDiveSiteAffinitiesBySiteRow) VisibleDiveSiteAffinity {
	return VisibleDiveSiteAffinity{
		DiveSiteAffinity: DiveSiteAffinity{
			ID:             uuidOrEmpty(row.ID),
			UserID:         uuidOrEmpty(row.UserID),
			DiveSiteID:     uuidOrEmpty(row.DiveSiteID),
			Relationship:   row.Relationship,
			Visibility:     row.Visibility,
			ContactEnabled: row.ContactEnabled,
			Note:           stringOrEmpty(row.Note),
			CreatedAt:      row.CreatedAt.Time.UTC(),
			UpdatedAt:      row.UpdatedAt.Time.UTC(),
		},
		Username:       row.Username,
		DisplayName:    row.DisplayName,
		AvatarURL:      row.AvatarUrl,
		ContactAllowed: row.ContactAllowed,
	}
}

func mapDiveSiteSubmission(row exploreqlc.DiveSite, submittedByDisplayName, reviewedByDisplayName string) SiteSubmission {
	return SiteSubmission{
		ID:                     row.ID.String(),
		Slug:                   row.Slug,
		Name:                   row.Name,
		Area:                   row.Area,
		Latitude:               row.Latitude,
		Longitude:              row.Longitude,
		Description:            valueOrEmpty(row.Description),
		Difficulty:             row.EntryDifficulty,
		DepthMinM:              numericPtr(row.DepthMinM),
		DepthMaxM:              numericPtr(row.DepthMaxM),
		Hazards:                row.Hazards,
		BestSeason:             valueOrEmpty(row.BestSeason),
		TypicalConditions:      valueOrEmpty(row.TypicalConditions),
		Access:                 valueOrEmpty(row.Access),
		Fees:                   valueOrEmpty(row.Fees),
		ContactInfo:            valueOrEmpty(row.ContactInfo),
		VerificationStatus:     row.VerificationStatus,
		SubmittedByAppUserID:   uuidOrEmpty(row.SubmittedByAppUserID),
		SubmittedByDisplayName: submittedByDisplayName,
		ReviewedByAppUserID:    uuidOrEmpty(row.ReviewedByAppUserID),
		ReviewedByDisplayName:  reviewedByDisplayName,
		ReviewedAt:             timestamptzPtr(row.ReviewedAt),
		ModerationReason:       valueOrEmpty(row.ModerationReason),
		ModerationState:        row.ModerationState,
		LastUpdatedAt:          row.LastUpdatedAt.Time.UTC(),
		UpdatedAt:              row.UpdatedAt.Time.UTC(),
		CreatedAt:              row.CreatedAt.Time.UTC(),
	}
}

func mapMySubmission(row exploreqlc.ListMySiteSubmissionsRow) SiteSubmission {
	return SiteSubmission{
		ID:                    row.ID.String(),
		Slug:                  row.Slug,
		Name:                  row.Name,
		Area:                  row.Area,
		Latitude:              row.Latitude,
		Longitude:             row.Longitude,
		Description:           valueOrEmpty(row.Description),
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
		SubmittedByAppUserID:  uuidOrEmpty(row.SubmittedByAppUserID),
		ReviewedByAppUserID:   uuidOrEmpty(row.ReviewedByAppUserID),
		ReviewedByDisplayName: row.ReviewedByDisplayName,
		ReviewedAt:            timestamptzPtr(row.ReviewedAt),
		ModerationReason:      valueOrEmpty(row.ModerationReason),
		ModerationState:       row.ModerationState,
		LastUpdatedAt:         row.LastUpdatedAt.Time.UTC(),
		UpdatedAt:             row.UpdatedAt.Time.UTC(),
		CreatedAt:             row.CreatedAt.Time.UTC(),
	}
}

func mapMySubmissionDetail(row exploreqlc.GetMySiteSubmissionByIDRow) SiteSubmission {
	return SiteSubmission{
		ID:                    row.ID.String(),
		Slug:                  row.Slug,
		Name:                  row.Name,
		Area:                  row.Area,
		Latitude:              row.Latitude,
		Longitude:             row.Longitude,
		Description:           valueOrEmpty(row.Description),
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
		SubmittedByAppUserID:  uuidOrEmpty(row.SubmittedByAppUserID),
		ReviewedByAppUserID:   uuidOrEmpty(row.ReviewedByAppUserID),
		ReviewedByDisplayName: row.ReviewedByDisplayName,
		ReviewedAt:            timestamptzPtr(row.ReviewedAt),
		ModerationReason:      valueOrEmpty(row.ModerationReason),
		ModerationState:       row.ModerationState,
		LastUpdatedAt:         row.LastUpdatedAt.Time.UTC(),
		UpdatedAt:             row.UpdatedAt.Time.UTC(),
		CreatedAt:             row.CreatedAt.Time.UTC(),
	}
}

func mapPendingSubmission(row exploreqlc.ListPendingSitesRow) SiteSubmission {
	return SiteSubmission{
		ID:                     row.ID.String(),
		Slug:                   row.Slug,
		Name:                   row.Name,
		Area:                   row.Area,
		Latitude:               row.Latitude,
		Longitude:              row.Longitude,
		Description:            valueOrEmpty(row.Description),
		Difficulty:             row.EntryDifficulty,
		DepthMinM:              numericPtr(row.DepthMinM),
		DepthMaxM:              numericPtr(row.DepthMaxM),
		Hazards:                row.Hazards,
		BestSeason:             valueOrEmpty(row.BestSeason),
		TypicalConditions:      valueOrEmpty(row.TypicalConditions),
		Access:                 valueOrEmpty(row.Access),
		Fees:                   valueOrEmpty(row.Fees),
		ContactInfo:            valueOrEmpty(row.ContactInfo),
		VerificationStatus:     row.VerificationStatus,
		SubmittedByAppUserID:   uuidOrEmpty(row.SubmittedByAppUserID),
		SubmittedByDisplayName: row.SubmittedByDisplayName,
		ReviewedByAppUserID:    uuidOrEmpty(row.ReviewedByAppUserID),
		ReviewedByDisplayName:  row.ReviewedByDisplayName,
		ReviewedAt:             timestamptzPtr(row.ReviewedAt),
		ModerationReason:       valueOrEmpty(row.ModerationReason),
		ModerationState:        row.ModerationState,
		LastUpdatedAt:          row.LastUpdatedAt.Time.UTC(),
		UpdatedAt:              row.UpdatedAt.Time.UTC(),
		CreatedAt:              row.CreatedAt.Time.UTC(),
	}
}

func mapModerationSubmission(row exploreqlc.GetSiteByIDForModerationRow) SiteSubmission {
	return SiteSubmission{
		ID:                     row.ID.String(),
		Slug:                   row.Slug,
		Name:                   row.Name,
		Area:                   row.Area,
		Latitude:               row.Latitude,
		Longitude:              row.Longitude,
		Description:            valueOrEmpty(row.Description),
		Difficulty:             row.EntryDifficulty,
		DepthMinM:              numericPtr(row.DepthMinM),
		DepthMaxM:              numericPtr(row.DepthMaxM),
		Hazards:                row.Hazards,
		BestSeason:             valueOrEmpty(row.BestSeason),
		TypicalConditions:      valueOrEmpty(row.TypicalConditions),
		Access:                 valueOrEmpty(row.Access),
		Fees:                   valueOrEmpty(row.Fees),
		ContactInfo:            valueOrEmpty(row.ContactInfo),
		VerificationStatus:     row.VerificationStatus,
		SubmittedByAppUserID:   uuidOrEmpty(row.SubmittedByAppUserID),
		SubmittedByDisplayName: row.SubmittedByDisplayName,
		ReviewedByAppUserID:    uuidOrEmpty(row.ReviewedByAppUserID),
		ReviewedByDisplayName:  row.ReviewedByDisplayName,
		ReviewedAt:             timestamptzPtr(row.ReviewedAt),
		ModerationReason:       valueOrEmpty(row.ModerationReason),
		ModerationState:        row.ModerationState,
		LastUpdatedAt:          row.LastUpdatedAt.Time.UTC(),
		UpdatedAt:              row.UpdatedAt.Time.UTC(),
		CreatedAt:              row.CreatedAt.Time.UTC(),
	}
}
