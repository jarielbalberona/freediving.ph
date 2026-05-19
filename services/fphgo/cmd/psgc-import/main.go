package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type regionRecord struct {
	PSGCCode   string `json:"psgcCode"`
	RegionCode string `json:"regCode"`
	RegionName string `json:"regionName"`
}

type provinceRecord struct {
	PSGCCode   string  `json:"psgcCode"`
	RegionCode string  `json:"regCode"`
	ProvCode   string  `json:"provCode"`
	ProvName   string  `json:"provName"`
	ProvOld    string  `json:"provOldName"`
	CityClass  *string `json:"cityClass"`
}

type cityRecord struct {
	PSGCCode    string `json:"psgcCode"`
	RegionCode  string `json:"regCode"`
	ProvCode    string `json:"provCode"`
	MunCityCode string `json:"munCityCode"`
	MunCityName string `json:"munCityName"`
	MunCityOld  string `json:"munCityOldName"`
}

type barangayRecord struct {
	PSGCCode    string `json:"psgcCode"`
	RegionCode  string `json:"regCode"`
	ProvCode    string `json:"provCode"`
	MunCityCode string `json:"munCityCode"`
	BrgyCode    string `json:"brgyCode"`
	BrgyName    string `json:"brgyName"`
	BrgyOld     string `json:"brgyOldName"`
}

func main() {
	ctx := context.Background()

	var dataDir string
	var sourceVersion string
	var publishedAtRaw string
	var deactivateMissing bool
	var skipIfCurrent bool

	flag.StringVar(&dataDir, "data-dir", "", "directory containing regions.json, provinces.json, muncities.json, barangays.json")
	flag.StringVar(&sourceVersion, "source-version", "", "source version label (default: data dir name)")
	flag.StringVar(&publishedAtRaw, "published-at", "", "optional publication time (RFC3339 or YYYY-MM-DD)")
	flag.BoolVar(&deactivateMissing, "deactivate-missing", true, "set previously imported rows not present in this source_version to inactive")
	flag.BoolVar(&skipIfCurrent, "skip-if-current", false, "skip import when active row counts already match this source version")
	flag.Parse()

	dataDir = strings.TrimSpace(dataDir)
	if dataDir == "" {
		die("-data-dir is required")
	}
	if sourceVersion = strings.TrimSpace(sourceVersion); sourceVersion == "" {
		sourceVersion = filepath.Base(dataDir)
	}
	publishedAt, err := parseOptionalPublishedAt(publishedAtRaw)
	if err != nil {
		die("invalid -published-at: %v", err)
	}

	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		die("DB_DSN is required")
	}

	regions, err := readJSON[regionRecord](filepath.Join(dataDir, "regions.json"))
	if err != nil {
		die("load regions: %v", err)
	}
	provinces, err := readJSON[provinceRecord](filepath.Join(dataDir, "provinces.json"))
	if err != nil {
		die("load provinces: %v", err)
	}
	cities, err := readJSON[cityRecord](filepath.Join(dataDir, "muncities.json"))
	if err != nil {
		die("load muncities: %v", err)
	}
	barangays, err := readJSON[barangayRecord](filepath.Join(dataDir, "barangays.json"))
	if err != nil {
		die("load barangays: %v", err)
	}

	if len(regions) == 0 || len(provinces) == 0 || len(cities) == 0 || len(barangays) == 0 {
		die("source files are incomplete: regions=%d provinces=%d cities=%d barangays=%d", len(regions), len(provinces), len(cities), len(barangays))
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		die("connect db: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		die("ping db: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if skipIfCurrent {
		current, err := hasCurrentImport(ctx, pool, sourceVersion, len(regions), len(provinces), len(cities), len(barangays))
		if err != nil {
			die("check current import: %v", err)
		}
		if current {
			logger.Info("psgc import skipped; active data is current",
				"source_version", sourceVersion,
				"regions", len(regions),
				"provinces", len(provinces),
				"cities_municipalities", len(cities),
				"barangays", len(barangays),
			)
			return
		}
	}

	logger.Info("starting psgc import", "source_version", sourceVersion, "data_dir", dataDir)

	if err := importPSGC(ctx, pool, sourceVersion, dataDir, publishedAt, deactivateMissing, regions, provinces, cities, barangays); err != nil {
		die("import failed: %v", err)
	}

	logger.Info("psgc import complete",
		"source_version", sourceVersion,
		"regions", len(regions),
		"provinces", len(provinces),
		"cities_municipalities", len(cities),
		"barangays", len(barangays),
	)
}

func hasCurrentImport(
	ctx context.Context,
	pool *pgxpool.Pool,
	sourceVersion string,
	regionsCount, provincesCount, citiesCount, barangaysCount int,
) (bool, error) {
	const q = `
		SELECT
			(SELECT COUNT(*) FROM psgc_import_history WHERE source_version = $1) > 0,
			(SELECT COUNT(*) FROM psgc_regions WHERE is_active = TRUE AND source_version = $1),
			(SELECT COUNT(*) FROM psgc_provinces WHERE is_active = TRUE AND source_version = $1),
			(SELECT COUNT(*) FROM psgc_cities_municipalities WHERE is_active = TRUE AND source_version = $1),
			(SELECT COUNT(*) FROM psgc_barangays WHERE is_active = TRUE AND source_version = $1)
	`

	var hasHistory bool
	var activeRegions int
	var activeProvinces int
	var activeCities int
	var activeBarangays int
	if err := pool.QueryRow(ctx, q, sourceVersion).Scan(
		&hasHistory,
		&activeRegions,
		&activeProvinces,
		&activeCities,
		&activeBarangays,
	); err != nil {
		return false, err
	}

	return hasHistory &&
		activeRegions == regionsCount &&
		activeProvinces == provincesCount &&
		activeCities == citiesCount &&
		activeBarangays == barangaysCount, nil
}

func importPSGC(
	ctx context.Context,
	pool *pgxpool.Pool,
	sourceVersion, sourceDirectory string,
	publishedAt *time.Time,
	deactivateMissing bool,
	regions []regionRecord,
	provinces []provinceRecord,
	cities []cityRecord,
	barangays []barangayRecord,
) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		CREATE TEMP TABLE tmp_psgc_regions (
			code TEXT NOT NULL,
			psgc_code TEXT NOT NULL,
			name TEXT NOT NULL
		) ON COMMIT DROP;
		CREATE TEMP TABLE tmp_psgc_provinces (
			code TEXT NOT NULL,
			psgc_code TEXT NOT NULL,
			region_code TEXT NOT NULL,
			name TEXT NOT NULL,
			old_name TEXT NOT NULL,
			city_class TEXT NOT NULL
		) ON COMMIT DROP;
		CREATE TEMP TABLE tmp_psgc_cities_municipalities (
			code TEXT NOT NULL,
			psgc_code TEXT NOT NULL,
			region_code TEXT NOT NULL,
			province_code TEXT NOT NULL,
			name TEXT NOT NULL,
			old_name TEXT NOT NULL
		) ON COMMIT DROP;
		CREATE TEMP TABLE tmp_psgc_barangays (
			code TEXT NOT NULL,
			psgc_code TEXT NOT NULL,
			region_code TEXT NOT NULL,
			province_code TEXT NOT NULL,
			city_municipality_code TEXT NOT NULL,
			name TEXT NOT NULL,
			old_name TEXT NOT NULL
		) ON COMMIT DROP;
	`); err != nil {
		return fmt.Errorf("create temp tables: %w", err)
	}

	regionRows := make([][]any, 0, len(regions))
	for _, record := range regions {
		code := strings.TrimSpace(record.RegionCode)
		if code == "" {
			return errors.New("region row with empty regCode")
		}
		regionRows = append(regionRows, []any{
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionName),
		})
	}
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"tmp_psgc_regions"},
		[]string{"code", "psgc_code", "name"},
		pgx.CopyFromRows(regionRows),
	); err != nil {
		return fmt.Errorf("copy regions: %w", err)
	}

	provinceRows := make([][]any, 0, len(provinces))
	for _, record := range provinces {
		code := strings.TrimSpace(record.ProvCode)
		if code == "" {
			return errors.New("province row with empty provCode")
		}
		cityClass := ""
		if record.CityClass != nil {
			cityClass = strings.TrimSpace(*record.CityClass)
		}
		provinceRows = append(provinceRows, []any{
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			strings.TrimSpace(record.ProvName),
			strings.TrimSpace(record.ProvOld),
			cityClass,
		})
	}
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"tmp_psgc_provinces"},
		[]string{"code", "psgc_code", "region_code", "name", "old_name", "city_class"},
		pgx.CopyFromRows(provinceRows),
	); err != nil {
		return fmt.Errorf("copy provinces: %w", err)
	}

	cityRows := make([][]any, 0, len(cities))
	for _, record := range cities {
		code := strings.TrimSpace(record.MunCityCode)
		if code == "" {
			return errors.New("city row with empty munCityCode")
		}
		cityRows = append(cityRows, []any{
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			normalizeProvinceCode(record.ProvCode),
			strings.TrimSpace(record.MunCityName),
			strings.TrimSpace(record.MunCityOld),
		})
	}
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"tmp_psgc_cities_municipalities"},
		[]string{"code", "psgc_code", "region_code", "province_code", "name", "old_name"},
		pgx.CopyFromRows(cityRows),
	); err != nil {
		return fmt.Errorf("copy cities/municipalities: %w", err)
	}

	barangayRows := make([][]any, 0, len(barangays))
	for _, record := range barangays {
		code := strings.TrimSpace(record.BrgyCode)
		if code == "" {
			return errors.New("barangay row with empty brgyCode")
		}
		barangayRows = append(barangayRows, []any{
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			normalizeProvinceCode(record.ProvCode),
			strings.TrimSpace(record.MunCityCode),
			strings.TrimSpace(record.BrgyName),
			strings.TrimSpace(record.BrgyOld),
		})
	}
	if _, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"tmp_psgc_barangays"},
		[]string{"code", "psgc_code", "region_code", "province_code", "city_municipality_code", "name", "old_name"},
		pgx.CopyFromRows(barangayRows),
	); err != nil {
		return fmt.Errorf("copy barangays: %w", err)
	}

	const upsertRegion = `
		INSERT INTO psgc_regions (code, psgc_code, name, source_version, is_active, updated_at)
		SELECT code, psgc_code, name, $1, TRUE, NOW()
		FROM tmp_psgc_regions
		ON CONFLICT (code)
		DO UPDATE SET
			psgc_code = EXCLUDED.psgc_code,
			name = EXCLUDED.name,
			source_version = EXCLUDED.source_version,
			is_active = TRUE,
			updated_at = NOW()
	`
	if _, err := tx.Exec(ctx, upsertRegion, sourceVersion); err != nil {
		return fmt.Errorf("upsert regions: %w", err)
	}

	const upsertProvince = `
		INSERT INTO psgc_provinces (code, psgc_code, region_code, name, old_name, city_class, source_version, is_active, updated_at)
		SELECT code, psgc_code, region_code, name, nullif(old_name, ''), nullif(city_class, ''), $1, TRUE, NOW()
		FROM tmp_psgc_provinces
		ON CONFLICT (code)
		DO UPDATE SET
			psgc_code = EXCLUDED.psgc_code,
			region_code = EXCLUDED.region_code,
			name = EXCLUDED.name,
			old_name = EXCLUDED.old_name,
			city_class = EXCLUDED.city_class,
			source_version = EXCLUDED.source_version,
			is_active = TRUE,
			updated_at = NOW()
	`
	if _, err := tx.Exec(ctx, upsertProvince, sourceVersion); err != nil {
		return fmt.Errorf("upsert provinces: %w", err)
	}

	const upsertCityMunicipality = `
		INSERT INTO psgc_cities_municipalities (code, psgc_code, region_code, province_code, name, old_name, source_version, is_active, updated_at)
		SELECT code, psgc_code, region_code, nullif(province_code, ''), name, nullif(old_name, ''), $1, TRUE, NOW()
		FROM tmp_psgc_cities_municipalities
		ON CONFLICT (code)
		DO UPDATE SET
			psgc_code = EXCLUDED.psgc_code,
			region_code = EXCLUDED.region_code,
			province_code = EXCLUDED.province_code,
			name = EXCLUDED.name,
			old_name = EXCLUDED.old_name,
			source_version = EXCLUDED.source_version,
			is_active = TRUE,
			updated_at = NOW()
	`
	if _, err := tx.Exec(ctx, upsertCityMunicipality, sourceVersion); err != nil {
		return fmt.Errorf("upsert cities/municipalities: %w", err)
	}

	const upsertBarangay = `
		INSERT INTO psgc_barangays (code, psgc_code, region_code, province_code, city_municipality_code, name, old_name, source_version, is_active, updated_at)
		SELECT code, psgc_code, region_code, nullif(province_code, ''), city_municipality_code, name, nullif(old_name, ''), $1, TRUE, NOW()
		FROM tmp_psgc_barangays
		ON CONFLICT (code)
		DO UPDATE SET
			psgc_code = EXCLUDED.psgc_code,
			region_code = EXCLUDED.region_code,
			province_code = EXCLUDED.province_code,
			city_municipality_code = EXCLUDED.city_municipality_code,
			name = EXCLUDED.name,
			old_name = EXCLUDED.old_name,
			source_version = EXCLUDED.source_version,
			is_active = TRUE,
			updated_at = NOW()
	`
	if _, err := tx.Exec(ctx, upsertBarangay, sourceVersion); err != nil {
		return fmt.Errorf("upsert barangays: %w", err)
	}

	if deactivateMissing {
		if _, err := tx.Exec(ctx, `UPDATE psgc_regions SET is_active = FALSE, updated_at = NOW() WHERE source_version <> $1 AND is_active = TRUE`, sourceVersion); err != nil {
			return fmt.Errorf("deactivate stale regions: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE psgc_provinces SET is_active = FALSE, updated_at = NOW() WHERE source_version <> $1 AND is_active = TRUE`, sourceVersion); err != nil {
			return fmt.Errorf("deactivate stale provinces: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE psgc_cities_municipalities SET is_active = FALSE, updated_at = NOW() WHERE source_version <> $1 AND is_active = TRUE`, sourceVersion); err != nil {
			return fmt.Errorf("deactivate stale cities/municipalities: %w", err)
		}
		if _, err := tx.Exec(ctx, `UPDATE psgc_barangays SET is_active = FALSE, updated_at = NOW() WHERE source_version <> $1 AND is_active = TRUE`, sourceVersion); err != nil {
			return fmt.Errorf("deactivate stale barangays: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO psgc_import_history (
			source_version,
			source_directory,
			published_at,
			regions_count,
			provinces_count,
			cities_municipalities_count,
			barangays_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, sourceVersion, sourceDirectory, publishedAt, len(regions), len(provinces), len(cities), len(barangays)); err != nil {
		return fmt.Errorf("insert import history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit import tx: %w", err)
	}
	return nil
}

func readJSON[T any](path string) ([]T, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var records []T
	if err := json.Unmarshal(raw, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func parseOptionalPublishedAt(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if ts, err := time.Parse(time.RFC3339, raw); err == nil {
		utc := ts.UTC()
		return &utc, nil
	}
	dateOnly, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, err
	}
	utc := time.Date(dateOnly.Year(), dateOnly.Month(), dateOnly.Day(), 0, 0, 0, 0, time.UTC)
	return &utc, nil
}

func normalizeProvinceCode(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "000" {
		return ""
	}
	return trimmed
}

func die(format string, args ...any) {
	_, _ = fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
