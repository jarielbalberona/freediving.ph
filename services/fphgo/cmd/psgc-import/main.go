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

	flag.StringVar(&dataDir, "data-dir", "", "directory containing regions.json, provinces.json, muncities.json, barangays.json")
	flag.StringVar(&sourceVersion, "source-version", "", "source version label (default: data dir name)")
	flag.StringVar(&publishedAtRaw, "published-at", "", "optional publication time (RFC3339 or YYYY-MM-DD)")
	flag.BoolVar(&deactivateMissing, "deactivate-missing", true, "set previously imported rows not present in this source_version to inactive")
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

	const upsertRegion = `
		INSERT INTO psgc_regions (code, psgc_code, name, source_version, is_active, updated_at)
		VALUES ($1, $2, $3, $4, TRUE, NOW())
		ON CONFLICT (code)
		DO UPDATE SET
			psgc_code = EXCLUDED.psgc_code,
			name = EXCLUDED.name,
			source_version = EXCLUDED.source_version,
			is_active = TRUE,
			updated_at = NOW()
	`
	for _, record := range regions {
		code := strings.TrimSpace(record.RegionCode)
		if code == "" {
			return errors.New("region row with empty regCode")
		}
		if _, err := tx.Exec(ctx, upsertRegion,
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionName),
			sourceVersion,
		); err != nil {
			return fmt.Errorf("upsert region %s: %w", code, err)
		}
	}

	const upsertProvince = `
		INSERT INTO psgc_provinces (code, psgc_code, region_code, name, old_name, city_class, source_version, is_active, updated_at)
		VALUES ($1, $2, $3, $4, nullif($5, ''), nullif($6, ''), $7, TRUE, NOW())
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
	for _, record := range provinces {
		code := strings.TrimSpace(record.ProvCode)
		if code == "" {
			return errors.New("province row with empty provCode")
		}
		cityClass := ""
		if record.CityClass != nil {
			cityClass = strings.TrimSpace(*record.CityClass)
		}
		if _, err := tx.Exec(ctx, upsertProvince,
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			strings.TrimSpace(record.ProvName),
			strings.TrimSpace(record.ProvOld),
			cityClass,
			sourceVersion,
		); err != nil {
			return fmt.Errorf("upsert province %s: %w", code, err)
		}
	}

	const upsertCityMunicipality = `
		INSERT INTO psgc_cities_municipalities (code, psgc_code, region_code, province_code, name, old_name, source_version, is_active, updated_at)
		VALUES ($1, $2, $3, nullif($4, ''), $5, nullif($6, ''), $7, TRUE, NOW())
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
	for _, record := range cities {
		code := strings.TrimSpace(record.MunCityCode)
		if code == "" {
			return errors.New("city row with empty munCityCode")
		}
		if _, err := tx.Exec(ctx, upsertCityMunicipality,
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			normalizeProvinceCode(record.ProvCode),
			strings.TrimSpace(record.MunCityName),
			strings.TrimSpace(record.MunCityOld),
			sourceVersion,
		); err != nil {
			return fmt.Errorf("upsert city/municipality %s: %w", code, err)
		}
	}

	const upsertBarangay = `
		INSERT INTO psgc_barangays (code, psgc_code, region_code, province_code, city_municipality_code, name, old_name, source_version, is_active, updated_at)
		VALUES ($1, $2, $3, nullif($4, ''), $5, $6, nullif($7, ''), $8, TRUE, NOW())
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
	for _, record := range barangays {
		code := strings.TrimSpace(record.BrgyCode)
		if code == "" {
			return errors.New("barangay row with empty brgyCode")
		}
		if _, err := tx.Exec(ctx, upsertBarangay,
			code,
			strings.TrimSpace(record.PSGCCode),
			strings.TrimSpace(record.RegionCode),
			normalizeProvinceCode(record.ProvCode),
			strings.TrimSpace(record.MunCityCode),
			strings.TrimSpace(record.BrgyName),
			strings.TrimSpace(record.BrgyOld),
			sourceVersion,
		); err != nil {
			return fmt.Errorf("upsert barangay %s: %w", code, err)
		}
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
