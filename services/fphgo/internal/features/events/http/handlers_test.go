package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	eventsrepo "fphgo/internal/features/events/repo"
	eventsservice "fphgo/internal/features/events/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

func TestCreateEventAcceptsSimplifiedFormPayloadHTTP(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443201"
	repo := &eventCreateRepoStub{}
	handler := New(eventsservice.New(repo), validatex.New())
	body := `{
		"title": "Freediving PH Annual Dive Event",
		"shortDescription": "A relaxed line-training session for certified freedivers.",
		"type": "fun_dive",
		"diveSiteId": "10000000-0000-0000-0000-000000000009",
		"startsAt": "2026-05-23T01:00:00.000Z",
		"endsAt": "2026-05-23T03:00:00.000Z",
		"timezone": "Asia/Manila",
		"visibility": "public",
		"requiresApproval": true,
		"isPaid": true,
		"status": "published"
	}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: actorID}))

	handler.CreateEvent(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if repo.createInput.OrganizerUserID != actorID {
		t.Fatalf("organizer id = %q, want %q", repo.createInput.OrganizerUserID, actorID)
	}
	if repo.createInput.Timezone != "Asia/Manila" {
		t.Fatalf("timezone = %q, want Asia/Manila", repo.createInput.Timezone)
	}
	if repo.createInput.DescriptionMarkdown != "" {
		t.Fatalf("description should be deferred, got %q", repo.createInput.DescriptionMarkdown)
	}
	if repo.createInput.Capacity != nil {
		t.Fatalf("capacity should be deferred, got %#v", *repo.createInput.Capacity)
	}
	if repo.createInput.Difficulty != "beginner" {
		t.Fatalf("difficulty default = %q, want beginner", repo.createInput.Difficulty)
	}
	if !repo.createInput.IsPaid {
		t.Fatalf("paid checkbox did not reach create input")
	}
	if repo.createInput.PriceAmount != nil || len(repo.createInput.PaymentMethods) != 0 {
		t.Fatalf("payment setup should be deferred, got price=%#v methods=%d", repo.createInput.PriceAmount, len(repo.createInput.PaymentMethods))
	}
}

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
		Title:                     "Freediving PH Annual Dive Event",
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

type eventCreateRepoStub struct {
	createInput eventsrepo.CreateEventInput
}

func (r *eventCreateRepoStub) ListEvents(context.Context, eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	return nil, 0, nil
}

func (r *eventCreateRepoStub) GetEventByID(context.Context, string, string) (eventsrepo.Event, error) {
	return eventsrepo.Event{}, nil
}

func (r *eventCreateRepoStub) GetEventBySlug(context.Context, string, string) (eventsrepo.Event, error) {
	return eventsrepo.Event{}, nil
}

func (r *eventCreateRepoStub) CreateEvent(_ context.Context, input eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	r.createInput = input
	return eventsrepo.Event{
		ID:               "550e8400-e29b-41d4-a716-446655443203",
		Slug:             "mabini-line-training",
		Title:            input.Title,
		ShortDescription: input.ShortDescription,
		StartsAt:         input.StartsAt,
		EndsAt:           input.EndsAt,
		Timezone:         input.Timezone,
		Status:           input.Status,
		Visibility:       input.Visibility,
		EventType:        input.EventType,
		Difficulty:       input.Difficulty,
		DiveSiteID:       input.DiveSiteID,
		OrganizerUserID:  input.OrganizerUserID,
		RequiresApproval: input.RequiresApproval,
		IsPaid:           input.IsPaid,
		Currency:         input.Currency,
		CreatedAt:        time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
		UpdatedAt:        time.Date(2026, 5, 22, 8, 0, 0, 0, time.UTC),
	}, nil
}

func (r *eventCreateRepoStub) UpdateEvent(context.Context, eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
	return eventsrepo.Event{}, nil
}

func (r *eventCreateRepoStub) GetGroupRole(context.Context, string, string) (string, error) {
	return "owner", nil
}

func (r *eventCreateRepoStub) CanManageEvent(context.Context, string, string) (bool, error) {
	return true, nil
}

func (r *eventCreateRepoStub) MarkEventInterested(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) MarkEventUninterested(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) JoinEvent(context.Context, eventsrepo.JoinEventInput) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) LeaveEvent(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) GetParticipant(context.Context, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) GetAttendee(context.Context, string, string) (eventsrepo.EventAttendee, error) {
	return eventsrepo.EventAttendee{}, nil
}

func (r *eventCreateRepoStub) ListParticipants(context.Context, string, eventsrepo.ListParticipantsInput) ([]eventsrepo.EventParticipant, int, error) {
	return nil, 0, nil
}

func (r *eventCreateRepoStub) ListAttendees(context.Context, string, int, int) ([]eventsrepo.EventAttendee, int, error) {
	return nil, 0, nil
}

func (r *eventCreateRepoStub) ApproveParticipant(context.Context, string, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) RejectParticipant(context.Context, string, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) ListPaymentMethods(context.Context, string, bool) ([]eventsrepo.EventPaymentMethod, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) CreatePaymentMethod(context.Context, string, eventsrepo.CreatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	return eventsrepo.EventPaymentMethod{}, nil
}

func (r *eventCreateRepoStub) UpdatePaymentMethod(context.Context, string, eventsrepo.UpdatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	return eventsrepo.EventPaymentMethod{}, nil
}

func (r *eventCreateRepoStub) SubmitPayment(context.Context, eventsrepo.SubmitPaymentInput) (eventsrepo.EventParticipantPayment, error) {
	return eventsrepo.EventParticipantPayment{}, nil
}

func (r *eventCreateRepoStub) ReviewPayment(context.Context, string, string, string, string, string) (eventsrepo.EventParticipantPayment, error) {
	return eventsrepo.EventParticipantPayment{}, nil
}

func (r *eventCreateRepoStub) GetPaymentProof(context.Context, string, string) (eventsrepo.EventPaymentProof, error) {
	return eventsrepo.EventPaymentProof{}, nil
}
