package geocode

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultTimeout = 3 * time.Second
	maxAttempts    = 2
)

var errAreaNotFound = errors.New("coarse area not found")

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func New(apiKey string) (*Client, error) {
	trimmed := strings.TrimSpace(apiKey)
	if trimmed == "" {
		return nil, fmt.Errorf("google maps api key is required")
	}
	return &Client{
		apiKey: trimmed,
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}, nil
}

func (c *Client) ReverseGeocodeArea(ctx context.Context, lat, lng float64) (string, error) {
	if c == nil || strings.TrimSpace(c.apiKey) == "" {
		return "", fmt.Errorf("google maps geocoder is not configured")
	}

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		area, retry, err := c.reverseGeocodeAreaOnce(ctx, lat, lng)
		if err == nil {
			return area, nil
		}
		lastErr = err
		if !retry || attempt == maxAttempts {
			break
		}
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(time.Duration(attempt) * 150 * time.Millisecond):
		}
	}

	return "", lastErr
}

type geocodeResponse struct {
	Status       string          `json:"status"`
	ErrorMessage string          `json:"error_message"`
	Results      []geocodeResult `json:"results"`
}

type geocodeResult struct {
	AddressComponents []addressComponent `json:"address_components"`
}

type addressComponent struct {
	LongName string   `json:"long_name"`
	Types    []string `json:"types"`
}

func (c *Client) reverseGeocodeAreaOnce(ctx context.Context, lat, lng float64) (string, bool, error) {
	reqCtx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	endpoint := url.URL{
		Scheme: "https",
		Host:   "maps.googleapis.com",
		Path:   "/maps/api/geocode/json",
	}

	query := endpoint.Query()
	query.Set("latlng", fmt.Sprintf("%.7f,%.7f", lat, lng))
	query.Set("language", "en")
	query.Set("region", "ph")
	query.Set("result_type", "locality|administrative_area_level_2|administrative_area_level_1")
	query.Set("key", c.apiKey)
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return "", false, err
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return "", true, err
	}
	defer res.Body.Close()

	if res.StatusCode >= http.StatusInternalServerError {
		return "", true, fmt.Errorf("google geocode returned status %d", res.StatusCode)
	}
	if res.StatusCode != http.StatusOK {
		return "", false, fmt.Errorf("google geocode returned status %d", res.StatusCode)
	}

	var payload geocodeResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return "", false, fmt.Errorf("decode google geocode response: %w", err)
	}

	switch payload.Status {
	case "OK":
	case "UNKNOWN_ERROR", "OVER_QUERY_LIMIT":
		return "", true, fmt.Errorf("google geocode status %s", payload.Status)
	case "ZERO_RESULTS":
		return "", false, errAreaNotFound
	default:
		message := strings.TrimSpace(payload.ErrorMessage)
		if message == "" {
			message = payload.Status
		}
		return "", false, fmt.Errorf("google geocode failed: %s", message)
	}

	for _, result := range payload.Results {
		if area := coarseAreaFromComponents(result.AddressComponents); area != "" {
			return area, false, nil
		}
	}

	return "", false, errAreaNotFound
}

func coarseAreaFromComponents(components []addressComponent) string {
	city := firstComponent(components,
		"locality",
		"postal_town",
		"administrative_area_level_2",
		"administrative_area_level_3",
	)
	province := firstComponent(components, "administrative_area_level_1")

	if city == "" || province == "" {
		return ""
	}

	return fmt.Sprintf("%s, %s", city, province)
}

func firstComponent(components []addressComponent, types ...string) string {
	for _, want := range types {
		for _, component := range components {
			for _, got := range component.Types {
				if got == want {
					return strings.TrimSpace(component.LongName)
				}
			}
		}
	}
	return ""
}
