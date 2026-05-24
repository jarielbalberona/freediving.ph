package http

type RegionResponse struct {
	Code     string `json:"code"`
	PSGCCode string `json:"psgcCode"`
	Name     string `json:"name"`
}

type ProvinceResponse struct {
	Code       string `json:"code"`
	PSGCCode   string `json:"psgcCode"`
	RegionCode string `json:"regionCode"`
	Name       string `json:"name"`
	OldName    string `json:"oldName,omitempty"`
	CityClass  string `json:"cityClass,omitempty"`
}

type CityMunicipalityResponse struct {
	Code         string `json:"code"`
	PSGCCode     string `json:"psgcCode"`
	RegionCode   string `json:"regionCode"`
	ProvinceCode string `json:"provinceCode"`
	Name         string `json:"name"`
	OldName      string `json:"oldName,omitempty"`
}

type BarangayResponse struct {
	Code                 string `json:"code"`
	PSGCCode             string `json:"psgcCode"`
	RegionCode           string `json:"regionCode"`
	ProvinceCode         string `json:"provinceCode"`
	CityMunicipalityCode string `json:"cityMunicipalityCode"`
	Name                 string `json:"name"`
	OldName              string `json:"oldName,omitempty"`
}

type SearchLocationResultResponse struct {
	Type           string `json:"type"`
	Label          string `json:"label"`
	HierarchyLabel string `json:"hierarchyLabel,omitempty"`
	RegionCode     string `json:"regionCode,omitempty"`
	RegionName     string `json:"regionName,omitempty"`
	ProvinceCode   string `json:"provinceCode,omitempty"`
	ProvinceName   string `json:"provinceName,omitempty"`
	CityCode       string `json:"cityCode,omitempty"`
	CityName       string `json:"cityName,omitempty"`
	BarangayCode   string `json:"barangayCode,omitempty"`
	BarangayName   string `json:"barangayName,omitempty"`
}

type LocationDiagnosticsResponse struct {
	Seeded                     bool `json:"seeded"`
	ActiveRegions              int  `json:"activeRegions"`
	ActiveProvinces            int  `json:"activeProvinces"`
	ActiveCitiesMunicipalities int  `json:"activeCitiesMunicipalities"`
	ActiveBarangays            int  `json:"activeBarangays"`
}

type ListRegionsResponse struct {
	Regions []RegionResponse `json:"regions"`
}

type ListProvincesResponse struct {
	Provinces []ProvinceResponse `json:"provinces"`
}

type ListCitiesMunicipalitiesResponse struct {
	CitiesMunicipalities []CityMunicipalityResponse `json:"citiesMunicipalities"`
}

type ListBarangaysResponse struct {
	Barangays []BarangayResponse `json:"barangays"`
}

type SearchLocationsResponse struct {
	Results     []SearchLocationResultResponse `json:"results"`
	Diagnostics LocationDiagnosticsResponse    `json:"diagnostics"`
}
