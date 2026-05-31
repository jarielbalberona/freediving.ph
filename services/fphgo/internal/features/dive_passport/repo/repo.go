package repo

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	divepassportqlc "fphgo/internal/features/dive_passport/repo/sqlc"
)

var ErrNotFound = pgx.ErrNoRows

type Repo struct {
	queries *divepassportqlc.Queries
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: divepassportqlc.New(pool)}
}

type Settings struct {
	UserID           string
	ShowMap          bool
	ShowBadges       bool
	ShowJourney      bool
	ShowMemories     bool
	FeaturedBadgeIDs []string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type UpsertSettingsInput struct {
	UserID           string
	ShowMap          bool
	ShowBadges       bool
	ShowJourney      bool
	ShowMemories     bool
	FeaturedBadgeIDs []string
}

func (r *Repo) GetSettings(ctx context.Context, userID string) (Settings, error) {
	row, err := r.queries.GetPassportSettings(ctx, toUUID(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Settings{}, ErrNotFound
		}
		return Settings{}, err
	}
	return mapSettings(row), nil
}

func (r *Repo) UpsertSettings(ctx context.Context, input UpsertSettingsInput) (Settings, error) {
	row, err := r.queries.UpsertPassportSettings(ctx, divepassportqlc.UpsertPassportSettingsParams{
		UserID:           toUUID(input.UserID),
		ShowMap:          input.ShowMap,
		ShowBadges:       input.ShowBadges,
		ShowJourney:      input.ShowJourney,
		ShowMemories:     input.ShowMemories,
		FeaturedBadgeIds: uuidArray(input.FeaturedBadgeIDs),
	})
	if err != nil {
		return Settings{}, err
	}
	return mapSettings(row), nil
}

func mapSettings(row divepassportqlc.PassportSetting) Settings {
	return Settings{
		UserID:           uuidString(row.UserID),
		ShowMap:          row.ShowMap,
		ShowBadges:       row.ShowBadges,
		ShowJourney:      row.ShowJourney,
		ShowMemories:     row.ShowMemories,
		FeaturedBadgeIDs: uuidStrings(row.FeaturedBadgeIds),
		CreatedAt:        timeValue(row.CreatedAt),
		UpdatedAt:        timeValue(row.UpdatedAt),
	}
}

func toUUID(value string) pgtype.UUID {
	id, _ := uuid.Parse(value)
	return pgtype.UUID{Bytes: id, Valid: id != uuid.Nil}
}

func uuidArray(values []string) []pgtype.UUID {
	out := make([]pgtype.UUID, 0, len(values))
	for _, value := range values {
		out = append(out, toUUID(value))
	}
	return out
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return uuid.UUID(value.Bytes).String()
}

func uuidStrings(values []pgtype.UUID) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		out = append(out, uuidString(value))
	}
	return out
}

func timeValue(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}
