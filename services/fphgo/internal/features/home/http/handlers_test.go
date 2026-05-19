package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	homeservice "fphgo/internal/features/home/service"
)

type serviceStub struct {
	input homeservice.NearbyConditionsInput
}

func (s *serviceStub) NearbyConditions(_ context.Context, input homeservice.NearbyConditionsInput) (homeservice.NearbyConditionsResult, error) {
	s.input = input
	return homeservice.NearbyConditionsResult{
		LocationLabel: "Philippines",
		Source:        homeservice.SourceFallbackCountry,
		Cards: homeservice.NearbyConditionCards{
			Current:    homeservice.NearbyConditionCard{Label: "Current", Value: "Ask locally", Confidence: homeservice.ConfidenceUnknown},
			Visibility: homeservice.NearbyConditionCard{Label: "Visibility", Value: "Ask locally", Confidence: homeservice.ConfidenceUnknown},
			Temp:       homeservice.NearbyConditionCard{Label: "Temp", Value: "Unavailable", Confidence: homeservice.ConfidenceUnknown},
			Wind:       homeservice.NearbyConditionCard{Label: "Wind", Value: "Unavailable", Confidence: homeservice.ConfidenceUnknown},
			Sunrise:    homeservice.NearbyConditionCard{Label: "Sunrise", Value: "Unavailable", Confidence: homeservice.ConfidenceUnknown},
		},
	}, nil
}

func TestNearbyConditionsAllowsMissingCoordinates(t *testing.T) {
	stub := &serviceStub{}
	handler := New(stub)
	req := httptest.NewRequest(http.MethodGet, "/v1/home/nearby-conditions", nil)
	rec := httptest.NewRecorder()

	handler.NearbyConditions(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if stub.input.Lat != nil || stub.input.Lng != nil {
		t.Fatalf("expected nil coordinates, got %#v", stub.input)
	}
	var payload NearbyConditionsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Cards.Visibility.Confidence != "unknown" {
		t.Fatalf("expected unknown visibility confidence, got %q", payload.Cards.Visibility.Confidence)
	}
}

func TestNearbyConditionsRejectsMalformedCoordinates(t *testing.T) {
	handler := New(&serviceStub{})
	req := httptest.NewRequest(http.MethodGet, "/v1/home/nearby-conditions?lat=abc&lng=121", nil)
	rec := httptest.NewRecorder()

	handler.NearbyConditions(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
