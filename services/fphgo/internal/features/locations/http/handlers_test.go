package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	locationsrepo "fphgo/internal/features/locations/repo"
	locationsservice "fphgo/internal/features/locations/service"
)

func TestSearchLocationsResponseShapeAndRanking(t *testing.T) {
	router := Routes(New(locationsservice.New(stubLocationRepo{
		results: []locationsrepo.SearchResult{
			{Type: "city", Code: "999", Label: "Mabini, Bohol, Central Visayas", HierarchyLabel: "Bohol, Central Visayas", CityCode: "999", CityName: "Mabini", ProvinceCode: "07", ProvinceName: "Bohol", RegionCode: "07", RegionName: "Central Visayas"},
			{Type: "city", Code: "041012", Label: "Mabini, Batangas, CALABARZON", HierarchyLabel: "Batangas, CALABARZON", CityCode: "041012", CityName: "Mabini", ProvinceCode: "0410", ProvinceName: "Batangas", RegionCode: "04", RegionName: "CALABARZON"},
			{Type: "province", Code: "0410", Label: "Batangas, CALABARZON", HierarchyLabel: "CALABARZON", ProvinceCode: "0410", ProvinceName: "Batangas", RegionCode: "04", RegionName: "CALABARZON"},
		},
		diagnostics: locationsrepo.Diagnostics{
			ActiveRegions:              17,
			ActiveProvinces:            82,
			ActiveCitiesMunicipalities: 1642,
			ActiveBarangays:            42000,
		},
	})))

	req := httptest.NewRequest(http.MethodGet, "/search?q=Mabini%20Batangas", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body SearchLocationsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Diagnostics.Seeded {
		t.Fatalf("expected seeded diagnostics")
	}
	if len(body.Results) == 0 {
		t.Fatalf("expected search results")
	}
	first := body.Results[0]
	if first.Type != "city" || first.CityName != "Mabini" || first.ProvinceName != "Batangas" {
		t.Fatalf("expected Mabini, Batangas city first, got %#v", first)
	}
	if first.Label == "" || first.HierarchyLabel == "" || first.RegionCode == "" {
		t.Fatalf("expected result shape to include label, hierarchy, and codes: %#v", first)
	}
}

func TestSearchLocationsEmptySeedDiagnostics(t *testing.T) {
	router := Routes(New(locationsservice.New(stubLocationRepo{})))

	req := httptest.NewRequest(http.MethodGet, "/search?q=Mabini", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body SearchLocationsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Diagnostics.Seeded {
		t.Fatalf("expected empty seed diagnostics to report seeded=false")
	}
	if len(body.Results) != 0 {
		t.Fatalf("expected no results for empty seed, got %d", len(body.Results))
	}
}

type stubLocationRepo struct {
	results     []locationsrepo.SearchResult
	diagnostics locationsrepo.Diagnostics
}

func (s stubLocationRepo) SearchLocations(context.Context, string, int) ([]locationsrepo.SearchResult, locationsrepo.Diagnostics, error) {
	return append([]locationsrepo.SearchResult(nil), s.results...), s.diagnostics, nil
}

func (s stubLocationRepo) ListRegions(context.Context, string, int) ([]locationsrepo.Region, error) {
	return nil, nil
}

func (s stubLocationRepo) ListProvinces(context.Context, string, string, int) ([]locationsrepo.Province, error) {
	return nil, nil
}

func (s stubLocationRepo) ListCitiesMunicipalities(context.Context, string, string, string, int) ([]locationsrepo.CityMunicipality, error) {
	return nil, nil
}

func (s stubLocationRepo) ListBarangays(context.Context, string, string, string, int) ([]locationsrepo.Barangay, error) {
	return nil, nil
}
