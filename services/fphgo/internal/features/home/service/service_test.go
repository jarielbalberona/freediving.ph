package service

import (
	"context"
	"errors"
	"testing"
	"time"
)

type repoStub struct {
	area        DiveArea
	hasArea     bool
	report      LocalReport
	hasReport   bool
	areaCalls   int
	reportCalls int
}

func (r *repoStub) FindNearestDiveArea(context.Context, float64, float64) (DiveArea, bool, error) {
	r.areaCalls++
	return r.area, r.hasArea, nil
}

func (r *repoStub) LatestLocalReport(context.Context, string, time.Time) (LocalReport, bool, error) {
	r.reportCalls++
	return r.report, r.hasReport, nil
}

type providerStub struct {
	forecast Forecast
	err      error
	calls    int
}

func (p *providerStub) Forecast(context.Context, float64, float64) (Forecast, error) {
	p.calls++
	if p.err != nil {
		return Forecast{}, p.err
	}
	return p.forecast, nil
}

func TestNearbyConditionsUsesReportedCurrentVisibilityAndForecastWeather(t *testing.T) {
	now := time.Date(2026, 5, 20, 8, 0, 0, 0, time.UTC)
	siteLat := 13.75
	siteLng := 120.91
	visibility := 15.0
	temp := 29.2
	wind := 12.4
	repo := &repoStub{
		area: DiveArea{
			ID:        "site-1",
			Name:      "Twin Rocks",
			Area:      "Anilao",
			Latitude:  &siteLat,
			Longitude: &siteLng,
		},
		hasArea: true,
		report: LocalReport{
			Current:     "mild",
			VisibilityM: &visibility,
			OccurredAt:  now.Add(-2 * time.Hour),
		},
		hasReport: true,
	}
	provider := &providerStub{forecast: Forecast{
		SeaSurfaceTempC: &temp,
		WindKph:         &wind,
		SunriseLocal:    "2026-05-20T05:31",
		ObservedAt:      now,
	}}
	service := New(repo, WithForecastProvider(provider), WithClock(func() time.Time { return now }))

	lat := 14.0
	lng := 121.0
	result, err := service.NearbyConditions(context.Background(), NearbyConditionsInput{Lat: &lat, Lng: &lng})
	if err != nil {
		t.Fatalf("NearbyConditions failed: %v", err)
	}

	if result.Source != SourceLocal {
		t.Fatalf("expected local source, got %s", result.Source)
	}
	if result.LocationLabel != "Twin Rocks, Anilao" {
		t.Fatalf("unexpected location label: %q", result.LocationLabel)
	}
	if result.Cards.Current.Value != "Reported light" || result.Cards.Current.Confidence != ConfidenceReported {
		t.Fatalf("expected reported current, got %#v", result.Cards.Current)
	}
	if result.Cards.Visibility.Value != "Reported 15m" || result.Cards.Visibility.Confidence != ConfidenceReported {
		t.Fatalf("expected reported visibility, got %#v", result.Cards.Visibility)
	}
	if result.Cards.Temp.Value != "29.2C sea forecast" || result.Cards.Temp.Confidence != ConfidenceForecast {
		t.Fatalf("expected sea temperature forecast, got %#v", result.Cards.Temp)
	}
	if result.Cards.Wind.Value != "12.4 kph forecast" || result.Cards.Wind.Confidence != ConfidenceForecast {
		t.Fatalf("expected wind forecast, got %#v", result.Cards.Wind)
	}
	if result.Cards.Sunrise.Value != "5:31 AM" || result.Cards.Sunrise.Confidence != ConfidenceForecast {
		t.Fatalf("expected sunrise forecast, got %#v", result.Cards.Sunrise)
	}
}

func TestNearbyConditionsFallsBackWithoutCoordinates(t *testing.T) {
	temp := 28.0
	provider := &providerStub{forecast: Forecast{SeaSurfaceTempC: &temp}}
	service := New(&repoStub{}, WithForecastProvider(provider))

	result, err := service.NearbyConditions(context.Background(), NearbyConditionsInput{})
	if err != nil {
		t.Fatalf("NearbyConditions failed: %v", err)
	}

	if result.Source != SourceFallbackCountry {
		t.Fatalf("expected country fallback, got %s", result.Source)
	}
	if result.LocationLabel != "Philippines" {
		t.Fatalf("expected Philippines label, got %q", result.LocationLabel)
	}
	if result.Cards.Visibility.Confidence != ConfidenceUnknown {
		t.Fatalf("visibility must stay unknown without reports, got %#v", result.Cards.Visibility)
	}
	if provider.calls != 1 {
		t.Fatalf("expected one provider call, got %d", provider.calls)
	}
}

func TestNearbyConditionsCachesNormalizedCoordinateResults(t *testing.T) {
	now := time.Date(2026, 5, 20, 8, 0, 0, 0, time.UTC)
	repo := &repoStub{hasArea: false}
	provider := &providerStub{err: errors.New("provider unavailable")}
	service := New(
		repo,
		WithForecastProvider(provider),
		WithClock(func() time.Time { return now }),
		WithCacheTTL(time.Hour),
	)

	lat := 13.75001
	lng := 120.91001
	if _, err := service.NearbyConditions(context.Background(), NearbyConditionsInput{Lat: &lat, Lng: &lng}); err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	lat = 13.75002
	lng = 120.91002
	if _, err := service.NearbyConditions(context.Background(), NearbyConditionsInput{Lat: &lat, Lng: &lng}); err != nil {
		t.Fatalf("second request failed: %v", err)
	}

	if repo.areaCalls != 1 {
		t.Fatalf("expected cached repo call count 1, got %d", repo.areaCalls)
	}
	if provider.calls != 1 {
		t.Fatalf("expected cached provider call count 1, got %d", provider.calls)
	}
}
