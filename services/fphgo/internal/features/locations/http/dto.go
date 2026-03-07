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
