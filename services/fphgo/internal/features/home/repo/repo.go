package repo

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	homeservice "fphgo/internal/features/home/service"
)

type Repo struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) FindNearestDiveArea(ctx context.Context, lat, lng float64) (homeservice.DiveArea, bool, error) {
	const q = `
		SELECT id::text, name, area, latitude, longitude,
			(6371 * acos(
				least(1, greatest(-1,
					cos(radians($1)) * cos(radians(latitude)) *
					cos(radians(longitude) - radians($2)) +
					sin(radians($1)) * sin(radians(latitude))
				))
			)) AS distance_km
		FROM dive_sites
		WHERE moderation_state = 'approved'
			AND latitude IS NOT NULL
			AND longitude IS NOT NULL
		ORDER BY distance_km ASC, last_updated_at DESC
		LIMIT 1
	`
	var out homeservice.DiveArea
	if err := r.pool.QueryRow(ctx, q, lat, lng).Scan(
		&out.ID,
		&out.Name,
		&out.Area,
		&out.Latitude,
		&out.Longitude,
		&out.DistanceKm,
	); err != nil {
		if err == pgx.ErrNoRows {
			return homeservice.DiveArea{}, false, nil
		}
		return homeservice.DiveArea{}, false, err
	}
	return out, true, nil
}

func (r *Repo) LatestLocalReport(ctx context.Context, diveAreaID string, since time.Time) (homeservice.LocalReport, bool, error) {
	const q = `
		SELECT
			COALESCE(condition_current, ''),
			condition_visibility_m,
			condition_temp_c,
			occurred_at
		FROM dive_site_updates
		WHERE dive_site_id = $1::uuid
			AND state = 'active'
			AND occurred_at >= $2
			AND (condition_current IS NOT NULL OR condition_visibility_m IS NOT NULL)
		ORDER BY occurred_at DESC, created_at DESC
		LIMIT 1
	`
	var out homeservice.LocalReport
	var visibility pgtype.Numeric
	var temp pgtype.Numeric
	if err := r.pool.QueryRow(ctx, q, diveAreaID, since).Scan(
		&out.Current,
		&visibility,
		&temp,
		&out.OccurredAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return homeservice.LocalReport{}, false, nil
		}
		return homeservice.LocalReport{}, false, err
	}
	out.VisibilityM = numericPtr(visibility)
	out.TempC = numericPtr(temp)
	return out, true, nil
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
