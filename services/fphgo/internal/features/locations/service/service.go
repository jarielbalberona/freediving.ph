package service

import (
	"context"
	"sort"
	"strings"

	locationsrepo "fphgo/internal/features/locations/repo"
)

type Service struct {
	repo repository
}

type repository interface {
	SearchLocations(ctx context.Context, query string, limit int) ([]locationsrepo.SearchResult, locationsrepo.Diagnostics, error)
	ListRegions(ctx context.Context, search string, limit int) ([]locationsrepo.Region, error)
	ListProvinces(ctx context.Context, regionCode, search string, limit int) ([]locationsrepo.Province, error)
	ListCitiesMunicipalities(ctx context.Context, regionCode, provinceCode, search string, limit int) ([]locationsrepo.CityMunicipality, error)
	ListBarangays(ctx context.Context, cityMunicipalityCode, provinceCode, search string, limit int) ([]locationsrepo.Barangay, error)
}

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SearchLocations(ctx context.Context, query string, limit int) ([]locationsrepo.SearchResult, locationsrepo.Diagnostics, error) {
	query = strings.TrimSpace(query)
	normalizedLimit := normalizeSearchLimit(limit)
	results, diagnostics, err := s.repo.SearchLocations(ctx, query, normalizedLimit)
	if err != nil {
		return nil, diagnostics, err
	}
	rankSearchResults(query, results)
	if len(results) > normalizedLimit {
		results = results[:normalizedLimit]
	}
	return results, diagnostics, nil
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

func normalizeSearchLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 50 {
		return 50
	}
	return limit
}

func rankSearchResults(query string, results []locationsrepo.SearchResult) {
	normalizedQuery := normalizeSearchText(query)
	tokens := searchTokens(normalizedQuery)
	sort.SliceStable(results, func(i, j int) bool {
		left := searchScore(normalizedQuery, tokens, results[i])
		right := searchScore(normalizedQuery, tokens, results[j])
		if left != right {
			return left < right
		}
		if typeRank(results[i].Type) != typeRank(results[j].Type) {
			return typeRank(results[i].Type) < typeRank(results[j].Type)
		}
		return results[i].Label < results[j].Label
	})
}

func searchScore(query string, tokens []string, result locationsrepo.SearchResult) int {
	if query == "" {
		return typeRank(result.Type)
	}
	label := normalizeSearchText(result.Label)
	hierarchy := normalizeSearchText(result.HierarchyLabel)
	haystack := strings.TrimSpace(label + " " + hierarchy + " " + normalizeSearchText(result.Code))
	if label == query || result.Code == query {
		return 0
	}
	if strings.HasPrefix(label, query) {
		return 1
	}
	allTokens := len(tokens) > 0
	for _, token := range tokens {
		if !strings.Contains(haystack, token) {
			allTokens = false
			break
		}
	}
	if allTokens && strings.HasPrefix(label, tokens[0]) {
		return 2
	}
	if allTokens {
		return 3
	}
	if strings.Contains(label, query) {
		return 4
	}
	return 5
}

func searchTokens(query string) []string {
	fields := strings.Fields(query)
	tokens := make([]string, 0, len(fields))
	for _, field := range fields {
		if field != "" {
			tokens = append(tokens, field)
		}
	}
	return tokens
}

func normalizeSearchText(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(value))), " ")
}

func typeRank(value string) int {
	switch value {
	case "city":
		return 0
	case "barangay":
		return 1
	case "province":
		return 2
	case "region":
		return 3
	default:
		return 4
	}
}
