package repo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	profilesqlc "fphgo/internal/features/profiles/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *profilesqlc.Queries
}

type Profile struct {
	UserID        string
	Username      string
	DisplayName   string
	EmailVerified bool
	PhoneVerified bool
	BuddyCount    int64
	ReportCount   int64
	Bio           string
	AvatarURL     string
	Location      string
	HomeArea      string
	Interests     []string
	CertLevel     string
	Socials       map[string]string
}

type UpsertProfileInput struct {
	UserID      string
	DisplayName string
	Bio         string
	AvatarURL   string
	Location    string
	HomeArea    string
	Interests   []string
	CertLevel   string
	Socials     map[string]string
	UpdateName  bool
}

type SearchUser struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
	Location    string
}

type SavedSite struct {
	ID                   string
	Slug                 string
	Name                 string
	Area                 string
	Difficulty           string
	LastUpdatedAt        string
	LastConditionSummary string
	SavedAt              string
}

type SavedUser struct {
	UserID        string
	Username      string
	DisplayName   string
	EmailVerified bool
	PhoneVerified bool
	AvatarURL     string
	HomeArea      string
	CertLevel     string
	BuddyCount    int64
	ReportCount   int64
	SavedAt       string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: profilesqlc.New(pool)}
}

func (r *Repo) GetProfileByUserID(ctx context.Context, userID string) (Profile, error) {
	row, err := r.queries.GetProfileByUserID(ctx, toUUID(userID))
	if err != nil {
		return Profile{}, err
	}

	socials, err := decodeSocials(row.Socials)
	if err != nil {
		return Profile{}, err
	}

	return Profile{
		UserID:        row.UserID.String(),
		Username:      row.Username,
		DisplayName:   row.DisplayName,
		EmailVerified: row.EmailVerified,
		PhoneVerified: row.PhoneVerified,
		BuddyCount:    row.BuddyCount,
		ReportCount:   row.ReportCount,
		Bio:           row.Bio,
		AvatarURL:     row.AvatarUrl,
		Location:      row.Location,
		HomeArea:      row.HomeArea,
		Interests:     row.Interests,
		CertLevel:     valueOrEmpty(row.CertLevel),
		Socials:       socials,
	}, nil
}

func (r *Repo) UpsertMyProfile(ctx context.Context, input UpsertProfileInput) (Profile, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Profile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := r.queries.WithTx(tx)
	userID := toUUID(input.UserID)

	if input.UpdateName {
		if err := qtx.UpdateDisplayName(ctx, profilesqlc.UpdateDisplayNameParams{
			ID:          userID,
			DisplayName: input.DisplayName,
		}); err != nil {
			return Profile{}, err
		}
	}

	socialsJSON, err := json.Marshal(input.Socials)
	if err != nil {
		return Profile{}, err
	}

	if _, err := qtx.UpsertMyProfile(ctx, profilesqlc.UpsertMyProfileParams{
		UserID:    userID,
		Bio:       input.Bio,
		AvatarUrl: input.AvatarURL,
		Location:  input.Location,
		HomeArea:  input.HomeArea,
		Interests: input.Interests,
		CertLevel: stringPtr(input.CertLevel),
		Socials:   socialsJSON,
	}); err != nil {
		return Profile{}, err
	}

	profileRow, err := qtx.GetProfileByUserID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Profile{}, err
	}

	socials, err := decodeSocials(profileRow.Socials)
	if err != nil {
		return Profile{}, err
	}

	return Profile{
		UserID:        profileRow.UserID.String(),
		Username:      profileRow.Username,
		DisplayName:   profileRow.DisplayName,
		EmailVerified: profileRow.EmailVerified,
		PhoneVerified: profileRow.PhoneVerified,
		BuddyCount:    profileRow.BuddyCount,
		ReportCount:   profileRow.ReportCount,
		Bio:           profileRow.Bio,
		AvatarURL:     profileRow.AvatarUrl,
		Location:      profileRow.Location,
		HomeArea:      profileRow.HomeArea,
		Interests:     profileRow.Interests,
		CertLevel:     valueOrEmpty(profileRow.CertLevel),
		Socials:       socials,
	}, nil
}

func (r *Repo) ListSavedSitesForUser(ctx context.Context, appUserID string) ([]SavedSite, error) {
	rows, err := r.queries.ListSavedSitesForUser(ctx, toUUID(appUserID))
	if err != nil {
		return nil, err
	}
	items := make([]SavedSite, 0, len(rows))
	for _, row := range rows {
		items = append(items, SavedSite{
			ID:                   row.ID.String(),
			Slug:                 row.Slug,
			Name:                 row.Name,
			Area:                 row.Area,
			Difficulty:           row.EntryDifficulty,
			LastUpdatedAt:        row.LastUpdatedAt.Time.UTC().Format(time.RFC3339),
			LastConditionSummary: anyString(row.LastConditionSummary),
			SavedAt:              row.SavedAt.Time.UTC().Format(time.RFC3339),
		})
	}
	return items, nil
}

func (r *Repo) ListSavedUsersForUser(ctx context.Context, viewerUserID string) ([]SavedUser, error) {
	rows, err := r.queries.ListSavedUsersForUser(ctx, toUUID(viewerUserID))
	if err != nil {
		return nil, err
	}
	items := make([]SavedUser, 0, len(rows))
	for _, row := range rows {
		items = append(items, SavedUser{
			UserID:        row.UserID.String(),
			Username:      row.Username,
			DisplayName:   row.DisplayName,
			EmailVerified: row.EmailVerified,
			PhoneVerified: row.PhoneVerified,
			AvatarURL:     row.AvatarUrl,
			HomeArea:      row.HomeArea,
			CertLevel:     row.CertLevel,
			BuddyCount:    row.BuddyCount,
			ReportCount:   row.ReportCount,
			SavedAt:       row.SavedAt.Time.UTC().Format(time.RFC3339),
		})
	}
	return items, nil
}

func (r *Repo) SearchUsers(ctx context.Context, viewerID, q string, limit int32) ([]SearchUser, error) {
	rows, err := r.queries.SearchUsers(ctx, profilesqlc.SearchUsersParams{
		ID:        toUUID(viewerID),
		Q:         q,
		LimitRows: limit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]SearchUser, 0, len(rows))
	for _, row := range rows {
		items = append(items, SearchUser{
			UserID:      row.UserID.String(),
			Username:    row.Username,
			DisplayName: row.DisplayName,
			AvatarURL:   row.AvatarUrl,
			Location:    row.Location,
		})
	}

	return items, nil
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func toUUID(value string) pgtype.UUID {
	parsed, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{}
	}
	id := pgtype.UUID{Valid: true}
	copy(id.Bytes[:], parsed[:])
	return id
}

func decodeSocials(raw []byte) (map[string]string, error) {
	if len(raw) == 0 {
		return map[string]string{}, nil
	}
	result := map[string]string{}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func valueOrEmpty(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func stringPtr(input string) *string {
	if input == "" {
		return nil
	}
	return &input
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
		return ""
	}
}
