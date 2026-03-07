package repo

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	pool *pgxpool.Pool
}

type Region struct {
	Code     string
	PSGCCode string
	Name     string
}

type Province struct {
	Code       string
	PSGCCode   string
	RegionCode string
	Name       string
	OldName    string
	CityClass  string
}

type CityMunicipality struct {
	Code         string
	PSGCCode     string
	RegionCode   string
	ProvinceCode string
	Name         string
	OldName      string
}

type Barangay struct {
	Code                 string
	PSGCCode             string
	RegionCode           string
	ProvinceCode         string
	CityMunicipalityCode string
	Name                 string
	OldName              string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) ListRegions(ctx context.Context, search string, limit int) ([]Region, error) {
	if limit < 1 {
		limit = 50
	}
	args := []any{limit}
	where := "WHERE is_active = TRUE"
	if search = strings.TrimSpace(strings.ToLower(search)); search != "" {
		args = append(args, "%"+search+"%")
		where += " AND lower(name) LIKE $2"
	}

	q := fmt.Sprintf(`
		SELECT code, psgc_code, name
		FROM psgc_regions
		%s
		ORDER BY name ASC
		LIMIT $1
	`, where)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Region, 0)
	for rows.Next() {
		var item Region
		if err := rows.Scan(&item.Code, &item.PSGCCode, &item.Name); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repo) ListProvinces(ctx context.Context, regionCode, search string, limit int) ([]Province, error) {
	if limit < 1 {
		limit = 50
	}
	args := []any{limit}
	where := []string{"is_active = TRUE"}
	idx := 2

	if regionCode = strings.TrimSpace(regionCode); regionCode != "" {
		args = append(args, regionCode)
		where = append(where, fmt.Sprintf("region_code = $%d", idx))
		idx++
	}
	if search = strings.TrimSpace(strings.ToLower(search)); search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("lower(name) LIKE $%d", idx))
		idx++
	}

	q := fmt.Sprintf(`
		SELECT code, psgc_code, region_code, name, coalesce(old_name, ''), coalesce(city_class, '')
		FROM psgc_provinces
		WHERE %s
		ORDER BY name ASC
		LIMIT $1
	`, strings.Join(where, " AND "))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Province, 0)
	for rows.Next() {
		var item Province
		if err := rows.Scan(&item.Code, &item.PSGCCode, &item.RegionCode, &item.Name, &item.OldName, &item.CityClass); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repo) ListCitiesMunicipalities(ctx context.Context, regionCode, provinceCode, search string, limit int) ([]CityMunicipality, error) {
	if limit < 1 {
		limit = 50
	}
	args := []any{limit}
	where := []string{"is_active = TRUE"}
	idx := 2

	if regionCode = strings.TrimSpace(regionCode); regionCode != "" {
		args = append(args, regionCode)
		where = append(where, fmt.Sprintf("region_code = $%d", idx))
		idx++
	}
	if provinceCode = strings.TrimSpace(provinceCode); provinceCode != "" {
		args = append(args, provinceCode)
		where = append(where, fmt.Sprintf("province_code = $%d", idx))
		idx++
	}
	if search = strings.TrimSpace(strings.ToLower(search)); search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("lower(name) LIKE $%d", idx))
		idx++
	}

	q := fmt.Sprintf(`
		SELECT code, psgc_code, region_code, coalesce(province_code, ''), name, coalesce(old_name, '')
		FROM psgc_cities_municipalities
		WHERE %s
		ORDER BY name ASC
		LIMIT $1
	`, strings.Join(where, " AND "))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]CityMunicipality, 0)
	for rows.Next() {
		var item CityMunicipality
		if err := rows.Scan(&item.Code, &item.PSGCCode, &item.RegionCode, &item.ProvinceCode, &item.Name, &item.OldName); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repo) ListBarangays(ctx context.Context, cityMunicipalityCode, provinceCode, search string, limit int) ([]Barangay, error) {
	if limit < 1 {
		limit = 50
	}
	args := []any{limit}
	where := []string{"is_active = TRUE"}
	idx := 2

	if cityMunicipalityCode = strings.TrimSpace(cityMunicipalityCode); cityMunicipalityCode != "" {
		args = append(args, cityMunicipalityCode)
		where = append(where, fmt.Sprintf("city_municipality_code = $%d", idx))
		idx++
	}
	if provinceCode = strings.TrimSpace(provinceCode); provinceCode != "" {
		args = append(args, provinceCode)
		where = append(where, fmt.Sprintf("province_code = $%d", idx))
		idx++
	}
	if search = strings.TrimSpace(strings.ToLower(search)); search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("lower(name) LIKE $%d", idx))
		idx++
	}

	q := fmt.Sprintf(`
		SELECT code, psgc_code, region_code, coalesce(province_code, ''), city_municipality_code, name, coalesce(old_name, '')
		FROM psgc_barangays
		WHERE %s
		ORDER BY name ASC
		LIMIT $1
	`, strings.Join(where, " AND "))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Barangay, 0)
	for rows.Next() {
		var item Barangay
		if err := rows.Scan(&item.Code, &item.PSGCCode, &item.RegionCode, &item.ProvinceCode, &item.CityMunicipalityCode, &item.Name, &item.OldName); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
