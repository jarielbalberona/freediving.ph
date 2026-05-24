package http

import (
	"net/http"
	"strconv"
	"strings"

	locationsrepo "fphgo/internal/features/locations/repo"
	locationsservice "fphgo/internal/features/locations/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type Handlers struct {
	service *locationsservice.Service
}

func New(service *locationsservice.Service) *Handlers {
	return &Handlers{service: service}
}

func (h *Handlers) SearchLocations(w http.ResponseWriter, r *http.Request) {
	items, diagnostics, err := h.service.SearchLocations(r.Context(), r.URL.Query().Get("q"), parseLimit(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]SearchLocationResultResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapSearchResult(item))
	}
	httpx.JSON(w, http.StatusOK, SearchLocationsResponse{
		Results:     mapped,
		Diagnostics: mapDiagnostics(diagnostics),
	})
}

func (h *Handlers) ListRegions(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListRegions(r.Context(), r.URL.Query().Get("search"), parseLimit(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]RegionResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, RegionResponse{Code: item.Code, PSGCCode: item.PSGCCode, Name: item.Name})
	}
	httpx.JSON(w, http.StatusOK, ListRegionsResponse{Regions: mapped})
}

func (h *Handlers) ListProvinces(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListProvinces(r.Context(), r.URL.Query().Get("regionCode"), r.URL.Query().Get("search"), parseLimit(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]ProvinceResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapProvince(item))
	}
	httpx.JSON(w, http.StatusOK, ListProvincesResponse{Provinces: mapped})
}

func (h *Handlers) ListCitiesMunicipalities(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListCitiesMunicipalities(
		r.Context(),
		r.URL.Query().Get("regionCode"),
		r.URL.Query().Get("provinceCode"),
		r.URL.Query().Get("search"),
		parseLimit(r),
	)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]CityMunicipalityResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapCityMunicipality(item))
	}
	httpx.JSON(w, http.StatusOK, ListCitiesMunicipalitiesResponse{CitiesMunicipalities: mapped})
}

func (h *Handlers) ListBarangays(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListBarangays(
		r.Context(),
		r.URL.Query().Get("cityMunicipalityCode"),
		r.URL.Query().Get("provinceCode"),
		r.URL.Query().Get("search"),
		parseLimit(r),
	)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]BarangayResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapBarangay(item))
	}
	httpx.JSON(w, http.StatusOK, ListBarangaysResponse{Barangays: mapped})
}

func parseLimit(r *http.Request) int {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return 50
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 50
	}
	return value
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), apperrors.New(http.StatusInternalServerError, "location_query_failed", "failed to query locations", err))
}

func mapProvince(item locationsrepo.Province) ProvinceResponse {
	return ProvinceResponse{
		Code:       item.Code,
		PSGCCode:   item.PSGCCode,
		RegionCode: item.RegionCode,
		Name:       item.Name,
		OldName:    item.OldName,
		CityClass:  item.CityClass,
	}
}

func mapCityMunicipality(item locationsrepo.CityMunicipality) CityMunicipalityResponse {
	return CityMunicipalityResponse{
		Code:         item.Code,
		PSGCCode:     item.PSGCCode,
		RegionCode:   item.RegionCode,
		ProvinceCode: item.ProvinceCode,
		Name:         item.Name,
		OldName:      item.OldName,
	}
}

func mapBarangay(item locationsrepo.Barangay) BarangayResponse {
	return BarangayResponse{
		Code:                 item.Code,
		PSGCCode:             item.PSGCCode,
		RegionCode:           item.RegionCode,
		ProvinceCode:         item.ProvinceCode,
		CityMunicipalityCode: item.CityMunicipalityCode,
		Name:                 item.Name,
		OldName:              item.OldName,
	}
}

func mapSearchResult(item locationsrepo.SearchResult) SearchLocationResultResponse {
	return SearchLocationResultResponse{
		Type:           item.Type,
		Label:          item.Label,
		HierarchyLabel: item.HierarchyLabel,
		RegionCode:     item.RegionCode,
		RegionName:     item.RegionName,
		ProvinceCode:   item.ProvinceCode,
		ProvinceName:   item.ProvinceName,
		CityCode:       item.CityCode,
		CityName:       item.CityName,
		BarangayCode:   item.BarangayCode,
		BarangayName:   item.BarangayName,
	}
}

func mapDiagnostics(item locationsrepo.Diagnostics) LocationDiagnosticsResponse {
	return LocationDiagnosticsResponse{
		Seeded:                     item.ActiveRegions > 0 && item.ActiveProvinces > 0 && item.ActiveCitiesMunicipalities > 0 && item.ActiveBarangays > 0,
		ActiveRegions:              item.ActiveRegions,
		ActiveProvinces:            item.ActiveProvinces,
		ActiveCitiesMunicipalities: item.ActiveCitiesMunicipalities,
		ActiveBarangays:            item.ActiveBarangays,
	}
}
