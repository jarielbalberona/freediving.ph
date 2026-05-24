package http

import (
	"context"
	"encoding/json"
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

func TestListEventsReturnsRedactedPrivateEventForAnonymousHTTP(t *testing.T) {
	repo := &eventCreateRepoStub{
		events: []eventsrepo.Event{privateEventFixture(false, false)},
	}
	handler := New(eventsservice.New(repo), validatex.New())
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	handler.ListEvents(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload ListEventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Events) != 1 {
		t.Fatalf("expected one event, got %#v", payload.Events)
	}
	assertRedactedPrivateEvent(t, payload.Events[0])
	if repo.listInput.ViewerUserID != "" {
		t.Fatalf("anonymous list should not pass viewer id, got %q", repo.listInput.ViewerUserID)
	}
}

func TestParticipantMapperDoesNotLeakPassTokenWithoutManagerScope(t *testing.T) {
	issuedAt := time.Date(2026, 5, 23, 10, 0, 0, 0, time.UTC)
	participant := eventsrepo.EventParticipant{
		ID:         "550e8400-e29b-41d4-a716-446655443090",
		EventID:    "550e8400-e29b-41d4-a716-446655443091",
		UserID:     "550e8400-e29b-41d4-a716-446655443092",
		Role:       "participant",
		Status:     "confirmed",
		QRToken:    "must-not-leak",
		QRIssuedAt: &issuedAt,
		Payment: &eventsrepo.EventParticipantPayment{
			Status: "verified",
		},
	}

	publicView := mapParticipant(participant, false)
	if publicView.QRToken != "" || publicView.QRIssuedAt != nil || publicView.Payment != nil {
		t.Fatalf("public participant response leaked pass/payment fields: %#v", publicView)
	}

	managerView := mapParticipant(participant, true)
	if managerView.QRToken != "must-not-leak" || managerView.Payment == nil {
		t.Fatalf("manager participant response should include pass/payment fields: %#v", managerView)
	}
}

func TestListEventsReturnsPublicEventForAnonymousHTTP(t *testing.T) {
	event := privateEventFixture(true, false)
	event.Visibility = "public"
	event.ViewerCanViewPrivateDetails = true
	repo := &eventCreateRepoStub{
		events: []eventsrepo.Event{event},
	}
	handler := New(eventsservice.New(repo), validatex.New())
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	handler.ListEvents(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload ListEventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Events) != 1 {
		t.Fatalf("expected one event, got %#v", payload.Events)
	}
	got := payload.Events[0]
	if got.Visibility != "public" || got.Description == "" || got.DiveSiteID == "" || got.StartsAt == nil {
		t.Fatalf("public event was not returned with full public fields: %#v", got)
	}
}

func TestListEventsReturnsRedactedPrivateEventForLoggedInNonParticipantHTTP(t *testing.T) {
	const viewerID = "550e8400-e29b-41d4-a716-446655443231"
	repo := &eventCreateRepoStub{
		events: []eventsrepo.Event{privateEventFixture(false, false)},
	}
	handler := New(eventsservice.New(repo), validatex.New())
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: viewerID}))

	handler.ListEvents(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload ListEventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(payload.Events) != 1 {
		t.Fatalf("expected one event, got %#v", payload.Events)
	}
	assertRedactedPrivateEvent(t, payload.Events[0])
	if repo.listInput.ViewerUserID != viewerID {
		t.Fatalf("logged-in list viewer id = %q, want %q", repo.listInput.ViewerUserID, viewerID)
	}
}

func TestGetEventReturnsRedactedPrivateEventForAnonymousHTTP(t *testing.T) {
	repo := &eventCreateRepoStub{event: privateEventFixture(false, false)}
	router := Routes(New(eventsservice.New(repo), validatex.New()))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/private-annual-event", nil)

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload EventDetailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertRedactedPrivateEvent(t, payload.Event)
}

func TestGetEventPreservesPendingPrivateViewerStateHTTP(t *testing.T) {
	event := privateEventFixture(false, false)
	event.ViewerJoined = true
	event.ViewerParticipationStatus = "pending_approval"
	event.ViewerEventState = "pending_approval"
	event.ViewerParticipation = &eventsrepo.EventParticipant{
		ID:      "550e8400-e29b-41d4-a716-446655443232",
		EventID: event.ID,
		UserID:  "550e8400-e29b-41d4-a716-446655443233",
		Role:    "participant",
		Status:  "pending_approval",
		Payment: &eventsrepo.EventParticipantPayment{
			ID:               "550e8400-e29b-41d4-a716-446655443234",
			ProofMediaID:     "550e8400-e29b-41d4-a716-446655443235",
			ProofFileName:    "proof.jpg",
			ProofContentType: "image/jpeg",
			Status:           "submitted",
		},
	}
	repo := &eventCreateRepoStub{event: event}
	router := Routes(New(eventsservice.New(repo), validatex.New()))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/private-annual-event", nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: event.ViewerParticipation.UserID}))

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload EventDetailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertRedactedPrivateEvent(t, payload.Event)
	if !payload.Event.ViewerJoined || payload.Event.ViewerEventState != "pending_approval" || payload.Event.ViewerParticipationStatus != "pending_approval" {
		t.Fatalf("pending private viewer state not preserved: %#v", payload.Event)
	}
	if payload.Event.ViewerParticipation == nil || payload.Event.ViewerParticipation.Status != "pending_approval" {
		t.Fatalf("pending private viewer participation not preserved: %#v", payload.Event)
	}
	if payload.Event.ViewerPayment != nil || payload.Event.ViewerParticipation.Payment != nil {
		t.Fatalf("pending private payment details leaked: %#v", payload.Event)
	}
}

func TestGetEventReturnsExpandedPrivateEventForConfirmedParticipantHTTP(t *testing.T) {
	event := privateEventFixture(true, false)
	event.ViewerJoined = true
	event.ViewerParticipationStatus = "confirmed"
	event.ViewerEventState = "going"
	event.ViewerParticipation = &eventsrepo.EventParticipant{
		ID:      "550e8400-e29b-41d4-a716-446655443236",
		EventID: event.ID,
		UserID:  "550e8400-e29b-41d4-a716-446655443237",
		Role:    "participant",
		Status:  "confirmed",
	}
	repo := &eventCreateRepoStub{event: event}
	router := Routes(New(eventsservice.New(repo), validatex.New()))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/private-annual-event", nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: event.ViewerParticipation.UserID}))

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload EventDetailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertExpandedPrivateEvent(t, payload.Event)
	if payload.Event.ViewerEventState != "going" {
		t.Fatalf("confirmed viewer state not preserved: %#v", payload.Event)
	}
}

func TestGetEventReturnsExpandedPrivateEventForOrganizerHTTP(t *testing.T) {
	event := privateEventFixture(true, true)
	repo := &eventCreateRepoStub{event: event}
	router := Routes(New(eventsservice.New(repo), validatex.New()))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/private-annual-event", nil)
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: event.OrganizerUserID}))

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload EventDetailResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertExpandedPrivateEvent(t, payload.Event)
	if !payload.Event.ViewerCanManage {
		t.Fatalf("organizer manage state not preserved: %#v", payload.Event)
	}
}

func TestJoinPrivateEventFromNonParticipantHTTPRespectsApproval(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443238"
	event := privateEventFixture(false, false)
	repo := &eventCreateRepoStub{event: event}
	router := Routes(New(eventsservice.New(repo), validatex.New()))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/"+event.ID+"/join", strings.NewReader(`{"participantNote":"ready to join"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(middleware.WithIdentity(req.Context(), authz.Identity{UserID: actorID}))

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload JoinEventResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Participant.Status != "pending_approval" || repo.joinInput.Status != "pending_approval" {
		t.Fatalf("private approval-required join did not create pending request: payload=%#v input=%#v", payload, repo.joinInput)
	}
	if repo.joinInput.ParticipantNote != "ready to join" {
		t.Fatalf("join note = %q", repo.joinInput.ParticipantNote)
	}
}

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
	if repo.createInput.Currency != "PHP" {
		t.Fatalf("currency = %q, want PHP", repo.createInput.Currency)
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
		PostsEnabled:        true,
		PostCreatePolicy:    "participants",
		PaymentMethods: []eventsrepo.EventPaymentMethod{{
			ID:      "550e8400-e29b-41d4-a716-446655443105",
			EventID: "550e8400-e29b-41d4-a716-446655443101",
			Type:    "manual_qr",
			Name:    "Manual QR",
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
	if got.PostsEnabled || got.PostCreatePolicy != "" {
		t.Fatalf("private post settings leaked: %#v", got)
	}
	if got.OrganizerUserID != "" || got.GroupID != "" {
		t.Fatalf("private organizer metadata leaked: %#v", got)
	}
	if got.StartsAt != nil || got.EndsAt != nil || got.Type != "" || got.Difficulty != "" {
		t.Fatalf("private schedule/type leaked: %#v", got)
	}
	if got.CurrentAttendees != 0 || got.InterestedCount != 0 || got.GoingCount != 0 || got.Capacity != nil {
		t.Fatalf("private counts/capacity leaked: %#v", got)
	}
	if got.IsPaid || got.PriceAmount != nil || got.Currency != "" {
		t.Fatalf("private payment/access summary leaked: %#v", got)
	}
	if !got.RequiresApproval {
		t.Fatalf("private join policy should be preserved for the join CTA: %#v", got)
	}
	if got.Title != "Private depth training" || got.ShortDescription != "limited public teaser" {
		t.Fatalf("minimal public fields were not preserved: %#v", got)
	}
}

func TestMapEventPreservesOwnPrivateParticipationState(t *testing.T) {
	got := mapEvent(eventsrepo.Event{
		ID:                        "550e8400-e29b-41d4-a716-446655443106",
		Slug:                      "private-annual-event",
		Title:                     "Private annual event",
		ShortDescription:          "A member event",
		Status:                    "published",
		Visibility:                "private",
		ViewerJoined:              true,
		ViewerParticipationStatus: "pending_approval",
		ViewerEventState:          "pending_approval",
		ViewerParticipation: &eventsrepo.EventParticipant{
			ID:      "550e8400-e29b-41d4-a716-446655443107",
			EventID: "550e8400-e29b-41d4-a716-446655443106",
			UserID:  "550e8400-e29b-41d4-a716-446655443108",
			Role:    "participant",
			Status:  "pending_approval",
			Payment: &eventsrepo.EventParticipantPayment{
				ID:               "550e8400-e29b-41d4-a716-446655443109",
				ProofMediaID:     "550e8400-e29b-41d4-a716-446655443110",
				ProofFileName:    "proof.jpg",
				ProofContentType: "image/jpeg",
				Status:           "submitted",
			},
		},
		ViewerCanViewPrivateDetails: false,
	})

	if !got.ViewerJoined || got.ViewerEventState != "pending_approval" || got.ViewerParticipationStatus != "pending_approval" {
		t.Fatalf("own private participation state was not preserved: %#v", got)
	}
	if got.ViewerParticipation == nil || got.ViewerParticipation.Status != "pending_approval" {
		t.Fatalf("own private participation record was not preserved: %#v", got)
	}
	if got.ViewerPayment != nil || got.ViewerParticipation.Payment != nil {
		t.Fatalf("private payment data leaked with viewer participation: %#v", got)
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

func privateEventFixture(canViewPrivateDetails, canManage bool) eventsrepo.Event {
	lat := 9.0714
	lng := 123.2712
	depth := 30
	capacity := 12
	price := 1500.0
	start := time.Date(2026, 5, 23, 1, 22, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	return eventsrepo.Event{
		ID:                  "147dc32c-3378-4c83-8b58-64f0e027a7a3",
		Slug:                "private-annual-event",
		Title:               "Freediving PH Annual Event",
		Description:         "Full private event logistics.",
		ShortDescription:    "A chill dive event.",
		DescriptionMarkdown: "## Full private description",
		Location:            "Apo Island, Negros Oriental",
		LocationName:        "Apo Island",
		FormattedAddress:    "Apo Island, Negros Oriental",
		Latitude:            &lat,
		Longitude:           &lng,
		StartsAt:            &start,
		EndsAt:              &end,
		Timezone:            "Asia/Manila",
		Status:              "published",
		Visibility:          "private",
		EventType:           "fun_dive",
		Difficulty:          "beginner",
		Capacity:            &capacity,
		CurrentAttendees:    4,
		InterestedCount:     5,
		GoingCount:          4,
		OrganizerUserID:     "89933f0f-7612-4181-8092-579db41ce941",
		GroupID:             "550e8400-e29b-41d4-a716-446655443241",
		DiveSiteID:          "10000000-0000-0000-0000-000000000009",
		DiveSite: &eventsrepo.DiveSiteSummary{
			ID:        "10000000-0000-0000-0000-000000000009",
			Slug:      "apo-island",
			Name:      "Apo Island",
			Area:      "Negros Oriental",
			Latitude:  &lat,
			Longitude: &lng,
		},
		RequiresApproval:            true,
		IsPaid:                      true,
		PriceAmount:                 &price,
		Currency:                    "PHP",
		PaymentInstructions:         "Send proof to organizer.",
		MeetingPoint:                "Chapel Point",
		BeginnerFriendly:            true,
		MaxDepthM:                   &depth,
		EntryType:                   "boat",
		EquipmentNotes:              "Bring long fins.",
		SafetyNotes:                 "Safety plan.",
		CancellationPolicy:          "No refund.",
		PostsEnabled:                true,
		PostCreatePolicy:            "participants",
		ViewerCanManage:             canManage,
		ViewerCanViewPrivateDetails: canViewPrivateDetails,
		PaymentMethods: []eventsrepo.EventPaymentMethod{{
			ID:      "550e8400-e29b-41d4-a716-446655443242",
			EventID: "147dc32c-3378-4c83-8b58-64f0e027a7a3",
			Type:    "manual_qr",
			Name:    "Manual QR",
		}},
		CreatedAt: time.Date(2026, 5, 23, 1, 22, 14, 0, time.UTC),
		UpdatedAt: time.Date(2026, 5, 23, 1, 22, 14, 0, time.UTC),
	}
}

func assertRedactedPrivateEvent(t *testing.T, got EventResponse) {
	t.Helper()
	if got.ID == "" || got.Slug == "" || got.Title == "" || got.ShortDescription == "" {
		t.Fatalf("minimal discovery fields missing: %#v", got)
	}
	if got.Visibility != "private" || got.Status != "published" || !got.RequiresApproval {
		t.Fatalf("safe status/visibility/join policy fields missing: %#v", got)
	}
	if got.Description != "" || got.DescriptionMarkdown != "" {
		t.Fatalf("private description leaked: %#v", got)
	}
	if got.Location != "" || got.LocationName != "" || got.FormattedAddress != "" || got.Latitude != nil || got.Longitude != nil {
		t.Fatalf("private location leaked: %#v", got)
	}
	if got.DiveSiteID != "" || got.DiveSite != nil || got.StartsAt != nil || got.EndsAt != nil || got.Timezone != "" {
		t.Fatalf("private dive site or schedule leaked: %#v", got)
	}
	if got.Type != "" || got.Difficulty != "" || got.Capacity != nil || got.CurrentAttendees != 0 || got.GoingCount != 0 || got.InterestedCount != 0 {
		t.Fatalf("private taxonomy/capacity/count fields leaked: %#v", got)
	}
	if got.PaymentInstructions != "" || len(got.PaymentMethods) != 0 || got.ViewerPayment != nil || got.IsPaid || got.PriceAmount != nil || got.Currency != "" {
		t.Fatalf("private payment fields leaked: %#v", got)
	}
	if got.MeetingPoint != "" || got.EquipmentNotes != "" || got.SafetyNotes != "" || got.CancellationPolicy != "" || got.MaxDepthM != nil || got.EntryType != "" {
		t.Fatalf("private logistics/safety fields leaked: %#v", got)
	}
	if got.PostsEnabled || got.PostCreatePolicy != "" {
		t.Fatalf("private post settings leaked: %#v", got)
	}
	if got.OrganizerUserID != "" || got.GroupID != "" || got.ViewerCanManage || got.ViewerCanViewPrivateDetails {
		t.Fatalf("private organizer/access fields leaked: %#v", got)
	}
}

func assertExpandedPrivateEvent(t *testing.T, got EventResponse) {
	t.Helper()
	if got.Visibility != "private" || !got.ViewerCanViewPrivateDetails {
		t.Fatalf("expected private expanded event: %#v", got)
	}
	if got.Description == "" || got.DescriptionMarkdown == "" || got.DiveSiteID == "" || got.DiveSite == nil || got.StartsAt == nil || got.EndsAt == nil {
		t.Fatalf("expanded private details missing: %#v", got)
	}
	if got.MeetingPoint == "" || got.EquipmentNotes == "" || got.SafetyNotes == "" || got.CancellationPolicy == "" {
		t.Fatalf("expanded private logistics missing: %#v", got)
	}
	if got.PaymentInstructions == "" || len(got.PaymentMethods) == 0 {
		t.Fatalf("expanded private payment setup missing: %#v", got)
	}
}

type eventCreateRepoStub struct {
	event       eventsrepo.Event
	events      []eventsrepo.Event
	total       int
	listInput   eventsrepo.ListEventsInput
	createInput eventsrepo.CreateEventInput
	joinInput   eventsrepo.JoinEventInput
}

func (r *eventCreateRepoStub) ListEvents(_ context.Context, input eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	r.listInput = input
	total := r.total
	if total == 0 {
		total = len(r.events)
	}
	return r.events, total, nil
}

func (r *eventCreateRepoStub) GetEventByID(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventCreateRepoStub) GetEventBySlug(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
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

func (r *eventCreateRepoStub) JoinEvent(_ context.Context, input eventsrepo.JoinEventInput) (eventsrepo.EventParticipant, error) {
	r.joinInput = input
	return eventsrepo.EventParticipant{
		ID:              "550e8400-e29b-41d4-a716-446655443243",
		EventID:         input.EventID,
		UserID:          input.UserID,
		Role:            "participant",
		Status:          input.Status,
		ParticipantNote: input.ParticipantNote,
		CreatedAt:       time.Date(2026, 5, 23, 1, 22, 14, 0, time.UTC),
		UpdatedAt:       time.Date(2026, 5, 23, 1, 22, 14, 0, time.UTC),
	}, nil
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

func (r *eventCreateRepoStub) ListCompetitions(context.Context, string) ([]eventsrepo.EventCompetition, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) CreateCompetition(context.Context, string, eventsrepo.CreateCompetitionInput) (eventsrepo.EventCompetition, error) {
	return eventsrepo.EventCompetition{}, nil
}

func (r *eventCreateRepoStub) UpdateCompetition(context.Context, string, eventsrepo.UpdateCompetitionInput) (eventsrepo.EventCompetition, error) {
	return eventsrepo.EventCompetition{}, nil
}

func (r *eventCreateRepoStub) DeleteCompetition(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) ListPrizes(context.Context, string) ([]eventsrepo.EventPrize, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) CreatePrize(context.Context, string, eventsrepo.CreatePrizeInput) (eventsrepo.EventPrize, error) {
	return eventsrepo.EventPrize{}, nil
}

func (r *eventCreateRepoStub) UpdatePrize(context.Context, string, eventsrepo.UpdatePrizeInput) (eventsrepo.EventPrize, error) {
	return eventsrepo.EventPrize{}, nil
}

func (r *eventCreateRepoStub) DeletePrize(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) CompetitionBelongsToEvent(context.Context, string, string) (bool, error) {
	return true, nil
}

func (r *eventCreateRepoStub) SponsorBelongsToEvent(context.Context, string, string) (bool, error) {
	return true, nil
}

func (r *eventCreateRepoStub) MediaBelongsToEvent(context.Context, string, string) (bool, error) {
	return true, nil
}

func (r *eventCreateRepoStub) ListSponsors(context.Context, string) ([]eventsrepo.EventSponsor, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) CreateSponsor(context.Context, string, eventsrepo.CreateSponsorInput) (eventsrepo.EventSponsor, error) {
	return eventsrepo.EventSponsor{}, nil
}

func (r *eventCreateRepoStub) UpdateSponsor(context.Context, string, eventsrepo.UpdateSponsorInput) (eventsrepo.EventSponsor, error) {
	return eventsrepo.EventSponsor{}, nil
}

func (r *eventCreateRepoStub) DeleteSponsor(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) ListPosts(context.Context, string, string, bool) ([]eventsrepo.EventPost, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) GetPost(context.Context, string, string) (eventsrepo.EventPost, error) {
	return eventsrepo.EventPost{}, nil
}

func (r *eventCreateRepoStub) CreatePost(context.Context, string, string, eventsrepo.CreatePostInput) (eventsrepo.EventPost, error) {
	return eventsrepo.EventPost{}, nil
}

func (r *eventCreateRepoStub) UpdatePost(context.Context, string, eventsrepo.UpdatePostInput) (eventsrepo.EventPost, error) {
	return eventsrepo.EventPost{}, nil
}

func (r *eventCreateRepoStub) DeletePost(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) AddPostFishReaction(context.Context, string, string, string) (eventsrepo.EventPostReactionState, error) {
	return eventsrepo.EventPostReactionState{}, nil
}

func (r *eventCreateRepoStub) DeletePostFishReaction(context.Context, string, string, string) (eventsrepo.EventPostReactionState, error) {
	return eventsrepo.EventPostReactionState{}, nil
}

func (r *eventCreateRepoStub) UpdateParticipantRole(context.Context, string, string, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) UpdateParticipantStatus(context.Context, string, string, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) UpdateEventModules(context.Context, string, eventsrepo.EventModules) (eventsrepo.Event, error) {
	return eventsrepo.Event{}, nil
}

func (r *eventCreateRepoStub) ListJoinFormFields(context.Context, string, bool) ([]eventsrepo.EventJoinFormField, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) ReplaceJoinFormFields(context.Context, string, []eventsrepo.EventJoinFormFieldInput) ([]eventsrepo.EventJoinFormField, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) ListProgramItems(context.Context, string) ([]eventsrepo.EventProgramItem, error) {
	return nil, nil
}

func (r *eventCreateRepoStub) CreateProgramItem(context.Context, string, eventsrepo.CreateProgramItemInput) (eventsrepo.EventProgramItem, error) {
	return eventsrepo.EventProgramItem{}, nil
}

func (r *eventCreateRepoStub) UpdateProgramItem(context.Context, string, eventsrepo.UpdateProgramItemInput) (eventsrepo.EventProgramItem, error) {
	return eventsrepo.EventProgramItem{}, nil
}

func (r *eventCreateRepoStub) DeleteProgramItem(context.Context, string, string) error {
	return nil
}

func (r *eventCreateRepoStub) DuplicateEvent(context.Context, string, eventsrepo.DuplicateEventInput) (eventsrepo.Event, error) {
	return eventsrepo.Event{}, nil
}

func (r *eventCreateRepoStub) GetEventPassByToken(context.Context, string, string) (eventsrepo.EventPass, error) {
	return eventsrepo.EventPass{}, nil
}

func (r *eventCreateRepoStub) RegenerateParticipantPass(context.Context, string, string) (eventsrepo.EventParticipant, error) {
	return eventsrepo.EventParticipant{}, nil
}

func (r *eventCreateRepoStub) CheckInEventPass(context.Context, string, string, string) (eventsrepo.EventPass, error) {
	return eventsrepo.EventPass{}, nil
}
