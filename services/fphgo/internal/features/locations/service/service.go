package service

import (
	"context"
	"strings"

	locationsrepo "fphgo/internal/features/locations/repo"
)

type Service struct {
	repo repository
}

type repository interface {
	ListRegions(ctx context.Context, search string, limit int) ([]locationsrepo.Region, error)
	ListProvinces(ctx context.Context, regionCode, search string, limit int) ([]locationsrepo.Province, error)
	ListCitiesMunicipalities(ctx context.Context, regionCode, provinceCode, search string, limit int) ([]locationsrepo.CityMunicipality, error)
	ListBarangays(ctx context.Context, cityMunicipalityCode, provinceCode, search string, limit int) ([]locationsrepo.Barangay, error)
}

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListRegions(ctx context.Context, search string, limit int) ([]locationsrepo.Region, error) {
	return s.repo.ListRegions(ctx, strings.TrimSpace(search), normalizeLimit(limit))
}

func (s *Service) ListProvinces(ctx context.Context, regionCode, search string, limit int) ([]locationsrepo.Province, error) {
	return s.repo.ListProvinces(ctx, strings.TrimSpace(regionCode), strings.TrimSpace(search), normalizeLimit(limit))
}

func (s *Service) ListCitiesMunicipalities(ctx context.Context, regionCode, provinceCode, search string, limit int) ([]locationsrepo.CityMunicipality, error) {
	return s.repo.ListCitiesMunicipalities(
		ctx,
		strings.TrimSpace(regionCode),
		strings.TrimSpace(provinceCode),
		strings.TrimSpace(search),
		normalizeLimit(limit),
	)
}

func (s *Service) ListBarangays(ctx context.Context, cityMunicipalityCode, provinceCode, search string, limit int) ([]locationsrepo.Barangay, error) {
	return s.repo.ListBarangays(
		ctx,
		strings.TrimSpace(cityMunicipalityCode),
		strings.TrimSpace(provinceCode),
		strings.TrimSpace(search),
		normalizeLimit(limit),
	)
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 200 {
		return 200
	}
	return limit
}
