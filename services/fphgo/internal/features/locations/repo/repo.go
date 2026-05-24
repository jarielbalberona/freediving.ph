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

type SearchResult struct {
	Type           string
	Code           string
	Label          string
	HierarchyLabel string
	RegionCode     string
	RegionName     string
	ProvinceCode   string
	ProvinceName   string
	CityCode       string
	CityName       string
	BarangayCode   string
	BarangayName   string
}

type Diagnostics struct {
	ActiveRegions              int
	ActiveProvinces            int
	ActiveCitiesMunicipalities int
	ActiveBarangays            int
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) SearchLocations(ctx context.Context, query string, limit int) ([]SearchResult, Diagnostics, error) {
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	query = strings.TrimSpace(strings.ToLower(query))

	diagnostics, err := r.Diagnostics(ctx)
	if err != nil {
		return nil, Diagnostics{}, err
	}
	if query == "" {
		return []SearchResult{}, diagnostics, nil
	}

	rows, err := r.pool.Query(ctx, `
		WITH search AS (
			SELECT
				$1::text AS q,
				regexp_split_to_array($1::text, '\s+') AS tokens
		),
		candidates AS (
			SELECT
				'region'::text AS type,
				r.code AS code,
				r.name AS label,
				'Philippines'::text AS hierarchy_label,
				r.code AS region_code,
				r.name AS region_name,
				''::text AS province_code,
				''::text AS province_name,
				''::text AS city_code,
				''::text AS city_name,
				''::text AS barangay_code,
				''::text AS barangay_name,
				lower(concat_ws(' ', r.code, r.psgc_code, r.name)) AS haystack
			FROM psgc_regions r
			WHERE r.is_active = TRUE

			UNION ALL

			SELECT
				'province'::text AS type,
				p.code AS code,
				concat_ws(', ', p.name, r.name) AS label,
				r.name AS hierarchy_label,
				r.code AS region_code,
				r.name AS region_name,
				p.code AS province_code,
				p.name AS province_name,
				''::text AS city_code,
				''::text AS city_name,
				''::text AS barangay_code,
				''::text AS barangay_name,
				lower(concat_ws(' ', p.code, p.psgc_code, p.name, p.old_name, r.name)) AS haystack
			FROM psgc_provinces p
			JOIN psgc_regions r ON r.code = p.region_code
			WHERE p.is_active = TRUE AND r.is_active = TRUE

			UNION ALL

			SELECT
				'city'::text AS type,
				c.code AS code,
				concat_ws(', ', c.name, p.name, r.name) AS label,
				concat_ws(', ', p.name, r.name) AS hierarchy_label,
				r.code AS region_code,
				r.name AS region_name,
				p.code AS province_code,
				p.name AS province_name,
				c.code AS city_code,
				c.name AS city_name,
				''::text AS barangay_code,
				''::text AS barangay_name,
				lower(concat_ws(' ', c.code, c.psgc_code, c.name, c.old_name, p.name, r.name)) AS haystack
			FROM psgc_cities_municipalities c
			JOIN psgc_provinces p ON p.code = c.province_code
			JOIN psgc_regions r ON r.code = c.region_code
			WHERE c.is_active = TRUE AND p.is_active = TRUE AND r.is_active = TRUE

			UNION ALL

			SELECT
				'barangay'::text AS type,
				b.code AS code,
				concat_ws(', ', b.name, c.name, p.name, r.name) AS label,
				concat_ws(', ', c.name, p.name, r.name) AS hierarchy_label,
				r.code AS region_code,
				r.name AS region_name,
				p.code AS province_code,
				p.name AS province_name,
				c.code AS city_code,
				c.name AS city_name,
				b.code AS barangay_code,
				b.name AS barangay_name,
				lower(concat_ws(' ', b.code, b.psgc_code, b.name, b.old_name, c.name, p.name, r.name)) AS haystack
			FROM psgc_barangays b
			JOIN psgc_cities_municipalities c ON c.code = b.city_municipality_code
			JOIN psgc_provinces p ON p.code = b.province_code
			JOIN psgc_regions r ON r.code = b.region_code
			WHERE b.is_active = TRUE AND c.is_active = TRUE AND p.is_active = TRUE AND r.is_active = TRUE
		)
		SELECT type, code, label, hierarchy_label, region_code, region_name, province_code, province_name, city_code, city_name, barangay_code, barangay_name
		FROM candidates, search
		WHERE code = q
			OR haystack LIKE '%' || q || '%'
			OR NOT EXISTS (
				SELECT 1
				FROM unnest(tokens) token
				WHERE token <> '' AND haystack NOT LIKE '%' || token || '%'
			)
		LIMIT $2
	`, query, limit*4)
	if err != nil {
		return nil, diagnostics, err
	}
	defer rows.Close()

	items := make([]SearchResult, 0)
	for rows.Next() {
		var item SearchResult
		if err := rows.Scan(
			&item.Type,
			&item.Code,
			&item.Label,
			&item.HierarchyLabel,
			&item.RegionCode,
			&item.RegionName,
			&item.ProvinceCode,
			&item.ProvinceName,
			&item.CityCode,
			&item.CityName,
			&item.BarangayCode,
			&item.BarangayName,
		); err != nil {
			return nil, diagnostics, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, diagnostics, err
	}
	return items, diagnostics, nil
}

func (r *Repo) Diagnostics(ctx context.Context) (Diagnostics, error) {
	var diagnostics Diagnostics
	err := r.pool.QueryRow(ctx, `
		SELECT
			(SELECT count(*)::int FROM psgc_regions WHERE is_active = TRUE),
			(SELECT count(*)::int FROM psgc_provinces WHERE is_active = TRUE),
			(SELECT count(*)::int FROM psgc_cities_municipalities WHERE is_active = TRUE),
			(SELECT count(*)::int FROM psgc_barangays WHERE is_active = TRUE)
	`).Scan(
		&diagnostics.ActiveRegions,
		&diagnostics.ActiveProvinces,
		&diagnostics.ActiveCitiesMunicipalities,
		&diagnostics.ActiveBarangays,
	)
	return diagnostics, err
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
