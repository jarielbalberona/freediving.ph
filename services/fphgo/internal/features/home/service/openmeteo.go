package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	defaultWeatherEndpoint = "https://api.open-meteo.com/v1/forecast"
	defaultMarineEndpoint  = "https://marine-api.open-meteo.com/v1/marine"
	openMeteoTimeout       = 3 * time.Second
)

type OpenMeteoProvider struct {
	httpClient      *http.Client
	weatherEndpoint string
	marineEndpoint  string
}

type OpenMeteoOption func(*OpenMeteoProvider)

func WithOpenMeteoHTTPClient(client *http.Client) OpenMeteoOption {
	return func(p *OpenMeteoProvider) {
		if client != nil {
			p.httpClient = client
		}
	}
}

func WithOpenMeteoEndpoints(weatherEndpoint, marineEndpoint string) OpenMeteoOption {
	return func(p *OpenMeteoProvider) {
		if strings.TrimSpace(weatherEndpoint) != "" {
			p.weatherEndpoint = strings.TrimSpace(weatherEndpoint)
		}
		if strings.TrimSpace(marineEndpoint) != "" {
			p.marineEndpoint = strings.TrimSpace(marineEndpoint)
		}
	}
}

func NewOpenMeteoProvider(opts ...OpenMeteoOption) *OpenMeteoProvider {
	p := &OpenMeteoProvider{
		httpClient: &http.Client{
			Timeout: openMeteoTimeout,
		},
		weatherEndpoint: defaultWeatherEndpoint,
		marineEndpoint:  defaultMarineEndpoint,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(p)
		}
	}
	return p
}

func (p *OpenMeteoProvider) Forecast(ctx context.Context, lat, lng float64) (Forecast, error) {
	if p == nil {
		return Forecast{}, fmt.Errorf("open-meteo provider is not configured")
	}

	weather, weatherErr := p.fetchWeather(ctx, lat, lng)
	marine, marineErr := p.fetchMarine(ctx, lat, lng)
	if weatherErr != nil && marineErr != nil {
		return Forecast{}, weatherErr
	}

	out := Forecast{}
	if weatherErr == nil {
		out.WindKph = weather.Current.WindSpeedKph
		if len(weather.Daily.Sunrise) > 0 {
			out.SunriseLocal = weather.Daily.Sunrise[0]
		}
		out.ObservedAt = parseOpenMeteoTime(weather.Current.Time)
	}
	if marineErr == nil {
		out.SeaSurfaceTempC = marine.Current.SeaSurfaceTempC
		if marineTime := parseOpenMeteoTime(marine.Current.Time); marineTime.After(out.ObservedAt) {
			out.ObservedAt = marineTime
		}
	}
	if out.ObservedAt.IsZero() {
		out.ObservedAt = time.Now().UTC()
	}
	return out, nil
}

func (p *OpenMeteoProvider) fetchWeather(ctx context.Context, lat, lng float64) (openMeteoWeatherResponse, error) {
	values := url.Values{}
	values.Set("latitude", strconv.FormatFloat(lat, 'f', 6, 64))
	values.Set("longitude", strconv.FormatFloat(lng, 'f', 6, 64))
	values.Set("current", "wind_speed_10m")
	values.Set("daily", "sunrise")
	values.Set("forecast_days", "1")
	values.Set("timezone", "Asia/Manila")

	var out openMeteoWeatherResponse
	if err := p.getJSON(ctx, p.weatherEndpoint, values, &out); err != nil {
		return openMeteoWeatherResponse{}, err
	}
	return out, nil
}

func (p *OpenMeteoProvider) fetchMarine(ctx context.Context, lat, lng float64) (openMeteoMarineResponse, error) {
	values := url.Values{}
	values.Set("latitude", strconv.FormatFloat(lat, 'f', 6, 64))
	values.Set("longitude", strconv.FormatFloat(lng, 'f', 6, 64))
	values.Set("current", "sea_surface_temperature")
	values.Set("forecast_days", "1")
	values.Set("timezone", "Asia/Manila")

	var out openMeteoMarineResponse
	if err := p.getJSON(ctx, p.marineEndpoint, values, &out); err != nil {
		return openMeteoMarineResponse{}, err
	}
	return out, nil
}

func (p *OpenMeteoProvider) getJSON(ctx context.Context, endpoint string, values url.Values, dst any) error {
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return err
	}
	parsed.RawQuery = values.Encode()

	reqCtx, cancel := context.WithTimeout(ctx, openMeteoTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "freediving.ph-nearby-conditions/1.0")

	res, err := p.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("open-meteo returned status %d", res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(dst)
}

type openMeteoWeatherResponse struct {
	Current openMeteoWeatherCurrent `json:"current"`
	Daily   openMeteoWeatherDaily   `json:"daily"`
}

type openMeteoWeatherCurrent struct {
	Time         string   `json:"time"`
	WindSpeedKph *float64 `json:"wind_speed_10m"`
}

type openMeteoWeatherDaily struct {
	Sunrise []string `json:"sunrise"`
}

type openMeteoMarineResponse struct {
	Current openMeteoMarineCurrent `json:"current"`
}

type openMeteoMarineCurrent struct {
	Time            string   `json:"time"`
	SeaSurfaceTempC *float64 `json:"sea_surface_temperature"`
}

func parseOpenMeteoTime(value string) time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02T15:04:05"} {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed.UTC()
		}
	}
	return time.Time{}
}
