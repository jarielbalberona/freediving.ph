package repo

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type DiveSite struct {
	ID       string
	Name     string
	Location string
}

func New(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) ListDiveSites(ctx context.Context, search string) ([]DiveSite, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, location
		FROM dive_sites
		WHERE moderation_state = 'approved'
		  AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR location ILIKE '%' || $1 || '%')
		ORDER BY name ASC
		LIMIT 100
	`, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]DiveSite, 0)
	for rows.Next() {
		var item DiveSite
		if err := rows.Scan(&item.ID, &item.Name, &item.Location); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
