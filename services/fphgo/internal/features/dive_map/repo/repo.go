package repo

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	divemapqlc "fphgo/internal/features/dive_map/repo/sqlc"
)

type Repo struct {
	queries *divemapqlc.Queries
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{queries: divemapqlc.New(pool)}
}

func (r *Repo) RecomputeUserDiveSite(ctx context.Context, userID, diveSiteID string) error {
	userUUID := toUUID(strings.TrimSpace(userID))
	siteUUID := toUUID(strings.TrimSpace(diveSiteID))
	if err := r.queries.UpsertUserDiveSiteFromMediaPosts(ctx, divemapqlc.UpsertUserDiveSiteFromMediaPostsParams{
		UserID:     userUUID,
		DiveSiteID: siteUUID,
	}); err != nil {
		return err
	}
	return r.queries.DeleteUserDiveSiteWithoutMediaPosts(ctx, divemapqlc.DeleteUserDiveSiteWithoutMediaPostsParams{
		UserID:     userUUID,
		DiveSiteID: siteUUID,
	})
}

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}
