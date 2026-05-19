package service

import "time"

type Source string

const (
	SourceLocal           Source = "local"
	SourceNearestDiveArea Source = "nearest_dive_area"
	SourceFallbackCountry Source = "fallback_country"
)

type Confidence string

const (
	ConfidenceReported Confidence = "reported"
	ConfidenceForecast Confidence = "forecast"
	ConfidenceUnknown  Confidence = "unknown"
)

type NearbyConditionsInput struct {
	Lat *float64
	Lng *float64
}

type NearbyConditionsResult struct {
	LocationLabel string
	Source        Source
	UpdatedAt     string
	Cards         NearbyConditionCards
}

type NearbyConditionCards struct {
	Current    NearbyConditionCard
	Visibility NearbyConditionCard
	Temp       NearbyConditionCard
	Wind       NearbyConditionCard
	Sunrise    NearbyConditionCard
}

type NearbyConditionCard struct {
	Label      string
	Value      string
	Confidence Confidence
}

type DiveArea struct {
	ID         string
	Name       string
	Area       string
	Latitude   *float64
	Longitude  *float64
	DistanceKm *float64
}

type LocalReport struct {
	Current     string
	VisibilityM *float64
	TempC       *float64
	OccurredAt  time.Time
}

type Forecast struct {
	SeaSurfaceTempC *float64
	WindKph         *float64
	SunriseLocal    string
	ObservedAt      time.Time
}
