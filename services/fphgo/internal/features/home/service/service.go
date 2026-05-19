package service

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	apperrors "fphgo/internal/shared/errors"
)

const (
	defaultPhilippinesLat = 12.8797
	defaultPhilippinesLng = 121.7740
	reportFreshness       = 72 * time.Hour
)

type repository interface {
	FindNearestDiveArea(ctx context.Context, lat, lng float64) (DiveArea, bool, error)
	LatestLocalReport(ctx context.Context, diveAreaID string, since time.Time) (LocalReport, bool, error)
}

type forecastProvider interface {
	Forecast(ctx context.Context, lat, lng float64) (Forecast, error)
}

type Service struct {
	repo     repository
	provider forecastProvider
	now      func() time.Time
	cacheTTL time.Duration

	mu    sync.Mutex
	cache map[string]cacheEntry
}

type cacheEntry struct {
	expiresAt time.Time
	result    NearbyConditionsResult
}

type Option func(*Service)

func WithForecastProvider(provider forecastProvider) Option {
	return func(s *Service) {
		s.provider = provider
	}
}

func WithClock(now func() time.Time) Option {
	return func(s *Service) {
		if now != nil {
			s.now = now
		}
	}
}

func WithCacheTTL(ttl time.Duration) Option {
	return func(s *Service) {
		if ttl > 0 {
			s.cacheTTL = ttl
		}
	}
}

func New(repo repository, opts ...Option) *Service {
	s := &Service{
		repo:     repo,
		now:      time.Now,
		cacheTTL: 10 * time.Minute,
		cache:    map[string]cacheEntry{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

func (s *Service) NearbyConditions(ctx context.Context, input NearbyConditionsInput) (NearbyConditionsResult, error) {
	hasCoords := input.Lat != nil && input.Lng != nil
	lat := defaultPhilippinesLat
	lng := defaultPhilippinesLng
	if hasCoords {
		lat = *input.Lat
		lng = *input.Lng
	}

	cacheKey := nearbyCacheKey(hasCoords, lat, lng)
	if cached, ok := s.cached(cacheKey); ok {
		return cached, nil
	}

	result, err := s.buildNearbyConditions(ctx, hasCoords, lat, lng)
	if err != nil {
		return NearbyConditionsResult{}, err
	}
	s.store(cacheKey, result)
	return result, nil
}

func (s *Service) buildNearbyConditions(ctx context.Context, hasCoords bool, lat, lng float64) (NearbyConditionsResult, error) {
	source := SourceFallbackCountry
	locationLabel := "Philippines"
	forecastLat := lat
	forecastLng := lng
	var area DiveArea
	var hasArea bool

	if hasCoords && s.repo != nil {
		found, ok, err := s.repo.FindNearestDiveArea(ctx, lat, lng)
		if err != nil {
			return NearbyConditionsResult{}, apperrors.New(http.StatusInternalServerError, "nearby_conditions_failed", "failed to resolve nearby dive area", err)
		}
		if ok {
			area = found
			hasArea = true
			source = SourceNearestDiveArea
			locationLabel = areaLabel(found)
			if found.Latitude != nil && found.Longitude != nil {
				forecastLat = *found.Latitude
				forecastLng = *found.Longitude
			}
		}
	}

	var report LocalReport
	var hasReport bool
	if hasArea && s.repo != nil {
		found, ok, err := s.repo.LatestLocalReport(ctx, area.ID, s.now().UTC().Add(-reportFreshness))
		if err != nil {
			return NearbyConditionsResult{}, apperrors.New(http.StatusInternalServerError, "nearby_conditions_failed", "failed to load local condition report", err)
		}
		if ok {
			report = found
			hasReport = true
			source = SourceLocal
		}
	}

	var forecast Forecast
	var hasForecast bool
	if s.provider != nil {
		found, err := s.provider.Forecast(ctx, forecastLat, forecastLng)
		if err == nil {
			forecast = found
			hasForecast = true
		}
	}

	result := NearbyConditionsResult{
		LocationLabel: locationLabel,
		Source:        source,
		Cards: NearbyConditionCards{
			Current: NearbyConditionCard{
				Label:      "Current",
				Value:      "Ask locally",
				Confidence: ConfidenceUnknown,
			},
			Visibility: NearbyConditionCard{
				Label:      "Visibility",
				Value:      "Ask locally",
				Confidence: ConfidenceUnknown,
			},
			Temp: NearbyConditionCard{
				Label:      "Temp",
				Value:      "Unavailable",
				Confidence: ConfidenceUnknown,
			},
			Wind: NearbyConditionCard{
				Label:      "Wind",
				Value:      "Unavailable",
				Confidence: ConfidenceUnknown,
			},
			Sunrise: NearbyConditionCard{
				Label:      "Sunrise",
				Value:      "Unavailable",
				Confidence: ConfidenceUnknown,
			},
		},
	}

	if hasReport {
		if current := currentLabel(report.Current); current != "" {
			result.Cards.Current.Value = current
			result.Cards.Current.Confidence = ConfidenceReported
		}
		if report.VisibilityM != nil {
			result.Cards.Visibility.Value = fmt.Sprintf("Reported %sm", trimFloat(*report.VisibilityM))
			result.Cards.Visibility.Confidence = ConfidenceReported
		}
		result.UpdatedAt = report.OccurredAt.UTC().Format(time.RFC3339)
	}

	if hasForecast {
		if forecast.SeaSurfaceTempC != nil {
			result.Cards.Temp.Value = fmt.Sprintf("%sC sea forecast", trimFloat(*forecast.SeaSurfaceTempC))
			result.Cards.Temp.Confidence = ConfidenceForecast
		}
		if forecast.WindKph != nil {
			result.Cards.Wind.Value = fmt.Sprintf("%s kph forecast", trimFloat(*forecast.WindKph))
			result.Cards.Wind.Confidence = ConfidenceForecast
		}
		if strings.TrimSpace(forecast.SunriseLocal) != "" {
			result.Cards.Sunrise.Value = formatLocalTime(forecast.SunriseLocal)
			result.Cards.Sunrise.Confidence = ConfidenceForecast
		}
		if result.UpdatedAt == "" || (!forecast.ObservedAt.IsZero() && forecast.ObservedAt.After(parseTime(result.UpdatedAt))) {
			result.UpdatedAt = forecast.ObservedAt.UTC().Format(time.RFC3339)
		}
	}

	return result, nil
}

func (s *Service) cached(key string) (NearbyConditionsResult, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.cache[key]
	if !ok || s.now().After(entry.expiresAt) {
		if ok {
			delete(s.cache, key)
		}
		return NearbyConditionsResult{}, false
	}
	return entry.result, true
}

func (s *Service) store(key string, result NearbyConditionsResult) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[key] = cacheEntry{expiresAt: s.now().Add(s.cacheTTL), result: result}
}

func nearbyCacheKey(hasCoords bool, lat, lng float64) string {
	if !hasCoords {
		return "country:ph"
	}
	return fmt.Sprintf("nearby:%.2f:%.2f", lat, lng)
}

func areaLabel(area DiveArea) string {
	if strings.TrimSpace(area.Name) != "" && strings.TrimSpace(area.Area) != "" {
		return fmt.Sprintf("%s, %s", strings.TrimSpace(area.Name), strings.TrimSpace(area.Area))
	}
	if strings.TrimSpace(area.Name) != "" {
		return strings.TrimSpace(area.Name)
	}
	if strings.TrimSpace(area.Area) != "" {
		return strings.TrimSpace(area.Area)
	}
	return "Nearest dive area"
}

func currentLabel(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "none":
		return "Reported calm"
	case "mild":
		return "Reported light"
	case "strong":
		return "Reported strong"
	default:
		return ""
	}
}

func trimFloat(value float64) string {
	rounded := math.Round(value*10) / 10
	if rounded == math.Trunc(rounded) {
		return fmt.Sprintf("%.0f", rounded)
	}
	return fmt.Sprintf("%.1f", rounded)
}

func parseTime(value string) time.Time {
	parsed, _ := time.Parse(time.RFC3339, value)
	return parsed
}

func formatLocalTime(value string) string {
	parsed, err := time.Parse("2006-01-02T15:04", value)
	if err != nil {
		return strings.TrimSpace(value)
	}
	return parsed.Format("3:04 PM")
}
