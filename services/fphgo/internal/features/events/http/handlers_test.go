package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	eventsrepo "fphgo/internal/features/events/repo"
)

func TestMapEventRedactsPrivateUnauthorizedDetails(t *testing.T) {
	lat := 13.7604
	lng := 120.9266
	depth := 30
	capacity := 8
	price := 1500.0
	now := time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC)
	later := now.Add(2 * time.Hour)

	got := mapEvent(eventsrepo.Event{
		ID:                  "550e8400-e29b-41d4-a716-446655443101",
		Slug:                "private-depth-training",
		Title:               "Private depth training",
		Description:         "full private details",
		ShortDescription:    "limited public teaser",
		DescriptionMarkdown: "## private",
		Location:            "Secret bay",
		LocationName:        "Secret dive site",
		FormattedAddress:    "Secret address",
		Latitude:            &lat,
		Longitude:           &lng,
		GooglePlaceID:       "place-secret",
		RegionCode:          "04",
		ProvinceCode:        "0410",
		CityCode:            "041005",
		BarangayCode:        "041005001",
		LocationSource:      "psgc_mapped",
		StartsAt:            &now,
		EndsAt:              &later,
		Timezone:            "Asia/Manila",
		Status:              "published",
		Visibility:          "private",
		EventType:           "depth_training",
		Difficulty:          "advanced",
		Capacity:            &capacity,
		CurrentAttendees:    3,
		OrganizerUserID:     "550e8400-e29b-41d4-a716-446655443102",
		GroupID:             "550e8400-e29b-41d4-a716-446655443103",
		DiveSiteID:          "550e8400-e29b-41d4-a716-446655443104",
		DiveSite: &eventsrepo.DiveSiteSummary{
			ID:        "550e8400-e29b-41d4-a716-446655443104",
			Slug:      "secret-site",
			Name:      "Secret site",
			Area:      "Secret area",
			Latitude:  &lat,
			Longitude: &lng,
		},
		RequiresApproval:    true,
		IsPaid:              true,
		PriceAmount:         &price,
		Currency:            "PHP",
		PaymentInstructions: "Pay privately",
		MeetingPoint:        "Pier 1",
		BeginnerFriendly:    false,
		MaxDepthM:           &depth,
		EntryType:           "boat",
		EquipmentNotes:      "Bring long fins",
		SafetyNotes:         "Safety plan",
		CancellationPolicy:  "No refund",
		PaymentMethods: []eventsrepo.EventPaymentMethod{{
			ID:      "550e8400-e29b-41d4-a716-446655443105",
			EventID: "550e8400-e29b-41d4-a716-446655443101",
			Type:    "MANUAL_QR",
			Name:    "GCash QR",
		}},
		ViewerCanViewPrivateDetails: false,
	})

	if got.Description != "" || got.DescriptionMarkdown != "" {
		t.Fatalf("private details leaked: %#v", got)
	}
	if got.Location != "" || got.LocationName != "" || got.FormattedAddress != "" || got.Latitude != nil || got.Longitude != nil {
		t.Fatalf("private location leaked: %#v", got)
	}
	if got.DiveSiteID != "" || got.DiveSite != nil {
		t.Fatalf("private dive site leaked: %#v", got)
	}
	if got.PaymentInstructions != "" || len(got.PaymentMethods) != 0 || got.ViewerPayment != nil {
		t.Fatalf("private payment details leaked: %#v", got)
	}
	if got.MeetingPoint != "" || got.MaxDepthM != nil || got.EntryType != "" || got.EquipmentNotes != "" || got.SafetyNotes != "" || got.CancellationPolicy != "" {
		t.Fatalf("private logistics/safety details leaked: %#v", got)
	}
	if got.OrganizerUserID != "" || got.GroupID != "" {
		t.Fatalf("private organizer metadata leaked: %#v", got)
	}
	if got.Title != "Private depth training" || got.ShortDescription != "limited public teaser" || got.CurrentAttendees != 3 {
		t.Fatalf("minimal public fields were not preserved: %#v", got)
	}
}

func TestMapPaymentDoesNotExposeStoredProofObjectURL(t *testing.T) {
	got := mapPayment(eventsrepo.EventParticipantPayment{
		ID:                 "550e8400-e29b-41d4-a716-446655443111",
		EventID:            "550e8400-e29b-41d4-a716-446655443112",
		UserID:             "550e8400-e29b-41d4-a716-446655443113",
		Currency:           "PHP",
		ProofMediaID:       "550e8400-e29b-41d4-a716-446655443114",
		ProofAttachmentURL: "events/proofs/raw-object-key.jpg",
		ProofFileName:      "raw-object-key.jpg",
		ProofContentType:   "image/jpeg",
		Status:             "submitted",
		CreatedAt:          time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:          time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
	})

	if got.ProofAttachmentURL != "" {
		t.Fatalf("stored proof object URL leaked: %#v", got)
	}
	if got.ProofMediaID == "" || got.ProofFileName == "" || got.ProofContentType == "" || got.ProofStatus != "submitted" {
		t.Fatalf("expected proof metadata without raw URL: %#v", got)
	}
}

func TestMapEventIncludesInterestAndViewerState(t *testing.T) {
	got := mapEvent(eventsrepo.Event{
		ID:                        "550e8400-e29b-41d4-a716-446655443121",
		Slug:                      "mabini-line-training",
		Title:                     "Mabini line training",
		Status:                    "published",
		Visibility:                "public",
		EventType:                 "line_training",
		Difficulty:                "intermediate",
		Timezone:                  "Asia/Manila",
		CurrentAttendees:          4,
		InterestedCount:           7,
		GoingCount:                4,
		ViewerInterested:          true,
		ViewerParticipationStatus: "",
		ViewerEventState:          "interested",
		CreatedAt:                 time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:                 time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
	})

	if got.InterestedCount != 7 || got.GoingCount != 4 {
		t.Fatalf("interest/going counts were not mapped: %#v", got)
	}
	if !got.ViewerInterested || got.ViewerEventState != "interested" {
		t.Fatalf("viewer interest state was not mapped: %#v", got)
	}
}

func TestGetPaymentProofURLRejectsUnauthenticatedHTTP(t *testing.T) {
	handler := New(nil, nil)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/events/event-id/payments/payment-id/proof-url", nil)

	handler.GetPaymentProofURL(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestMarkEventInterestedRejectsUnauthenticatedHTTP(t *testing.T) {
	handler := New(nil, nil)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/v1/events/event-id/interest", nil)

	handler.MarkEventInterested(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}
