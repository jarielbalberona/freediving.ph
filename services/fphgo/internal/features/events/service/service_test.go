package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	eventsrepo "fphgo/internal/features/events/repo"
	feedservice "fphgo/internal/features/feed/service"
	notificationsservice "fphgo/internal/features/notifications/service"
	apperrors "fphgo/internal/shared/errors"
)

func TestJoinEventUsesApprovalStatus(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443001"
		userID  = "550e8400-e29b-41d4-a716-446655443002"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:               eventID,
			Title:            "Freediving PH Annual Dive Event",
			Status:           "published",
			Visibility:       "public",
			RequiresApproval: true,
		},
	}
	svc := New(repo)

	participant, err := svc.JoinEvent(context.Background(), eventID, userID, "AIDA 2")
	if err != nil {
		t.Fatalf("JoinEvent returned error: %v", err)
	}
	if participant.Status != "pending_approval" {
		t.Fatalf("expected pending approval, got %q", participant.Status)
	}
	if repo.joinInput.ParticipantNote != "AIDA 2" {
		t.Fatalf("expected join note to pass through, got %q", repo.joinInput.ParticipantNote)
	}
}

func TestJoinPrivateEventDoesNotRequirePrivateDetailAccess(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443011"
		userID  = "550e8400-e29b-41d4-a716-446655443012"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          eventID,
			Title:                       "Private annual event",
			Status:                      "published",
			Visibility:                  "private",
			RequiresApproval:            true,
			ViewerCanViewPrivateDetails: false,
			ViewerCanManage:             false,
		},
	}
	svc := New(repo)

	participant, err := svc.JoinEvent(context.Background(), eventID, userID, "Would like to join")
	if err != nil {
		t.Fatalf("JoinEvent returned error: %v", err)
	}
	if participant.Status != "pending_approval" {
		t.Fatalf("expected pending approval for private approval-required event, got %q", participant.Status)
	}
}

func TestGetEventBySlugReturnsPublishedPrivateEventForUnauthorizedViewer(t *testing.T) {
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          "550e8400-e29b-41d4-a716-446655443061",
			Slug:                        "private-depth-training",
			Title:                       "Private depth training",
			Status:                      "published",
			Visibility:                  "private",
			ViewerCanViewPrivateDetails: false,
		},
	}
	svc := New(repo)

	event, err := svc.GetEventBySlug(context.Background(), "private-depth-training", "550e8400-e29b-41d4-a716-446655443062")
	if err != nil {
		t.Fatalf("GetEventBySlug returned error: %v", err)
	}
	if event.ID != repo.event.ID || event.ViewerCanViewPrivateDetails {
		t.Fatalf("expected published private event to be returned for redaction, got %#v", event)
	}
}

func TestGetEventBySlugHidesUnpublishedEventFromUnauthorizedViewer(t *testing.T) {
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:              "550e8400-e29b-41d4-a716-446655443063",
			Slug:            "draft-depth-training",
			Title:           "Draft depth training",
			Status:          "draft",
			Visibility:      "private",
			ViewerCanManage: false,
		},
	}
	svc := New(repo)

	_, err := svc.GetEventBySlug(context.Background(), "draft-depth-training", "550e8400-e29b-41d4-a716-446655443064")
	assertAppErrorStatus(t, err, http.StatusNotFound)
}

func TestListEventsDoesNotDefaultUnsetFilters(t *testing.T) {
	repo := &eventsRepoStub{}
	svc := New(repo)

	if _, _, err := svc.ListEvents(context.Background(), "", eventsrepo.ListEventsInput{
		Status: "published",
		Page:   1,
		Limit:  24,
	}); err != nil {
		t.Fatalf("ListEvents returned error: %v", err)
	}
	if repo.listInput.EventType != "" {
		t.Fatalf("unset event type should not filter list, got %q", repo.listInput.EventType)
	}
	if repo.listInput.Difficulty != "" {
		t.Fatalf("unset difficulty should not filter list, got %q", repo.listInput.Difficulty)
	}
}

func TestListEventsNormalizesExplicitFilters(t *testing.T) {
	repo := &eventsRepoStub{}
	svc := New(repo)

	if _, _, err := svc.ListEvents(context.Background(), "", eventsrepo.ListEventsInput{
		EventType:  "Depth Training",
		Difficulty: "Advanced",
	}); err != nil {
		t.Fatalf("ListEvents returned error: %v", err)
	}
	if repo.listInput.EventType != "depth_training" {
		t.Fatalf("event type filter = %q, want depth_training", repo.listInput.EventType)
	}
	if repo.listInput.Difficulty != "advanced" {
		t.Fatalf("difficulty filter = %q, want advanced", repo.listInput.Difficulty)
	}
}

func TestCreateEventNotificationIncludesSlug(t *testing.T) {
	const (
		actorID = "550e8400-e29b-41d4-a716-446655443101"
		eventID = "550e8400-e29b-41d4-a716-446655443102"
		groupID = "550e8400-e29b-41d4-a716-446655443103"
		siteID  = "550e8400-e29b-41d4-a716-446655443104"
	)
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	capacity := 12
	notifications := &eventsNotificationStub{}
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:              eventID,
			Slug:            "freediving-cleanup-dive",
			Title:           "Freediving cleanup dive",
			Status:          "published",
			Visibility:      "public",
			GroupID:         groupID,
			OrganizerUserID: actorID,
		},
	}
	svc := New(repo, WithNotifications(notifications))

	_, err := svc.CreateEvent(context.Background(), actorID, eventsrepo.CreateEventInput{
		Title:               "Freediving cleanup dive",
		ShortDescription:    "Coastal cleanup session",
		DescriptionMarkdown: "Bring gloves and a mesh bag.",
		EventType:           "cleanup_dive",
		DiveSiteID:          siteID,
		StartsAt:            &start,
		EndsAt:              &end,
		Capacity:            &capacity,
		Visibility:          "public",
		Difficulty:          "beginner",
		GroupID:             ptr(groupID),
	})
	if err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}
	if len(notifications.createdForGroup) != 1 {
		t.Fatalf("expected created event notification, got %d", len(notifications.createdForGroup))
	}
	if got := notifications.createdForGroup[0].EventSlug; got != "freediving-cleanup-dive" {
		t.Fatalf("created event notification slug = %q, want freediving-cleanup-dive", got)
	}
}

func TestJoinEventNotificationIncludesSlug(t *testing.T) {
	const (
		eventID     = "550e8400-e29b-41d4-a716-446655443111"
		organizerID = "550e8400-e29b-41d4-a716-446655443112"
		attendeeID  = "550e8400-e29b-41d4-a716-446655443113"
	)
	notifications := &eventsNotificationStub{}
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:              eventID,
			Slug:            "intro-freediving-session",
			Title:           "Intro freediving session",
			Status:          "published",
			Visibility:      "public",
			OrganizerUserID: organizerID,
		},
	}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.JoinEvent(context.Background(), eventID, attendeeID, "First session"); err != nil {
		t.Fatalf("JoinEvent returned error: %v", err)
	}
	if len(notifications.attendeeJoined) != 1 {
		t.Fatalf("expected attendee notification, got %d", len(notifications.attendeeJoined))
	}
	if got := notifications.attendeeJoined[0].EventSlug; got != "intro-freediving-session" {
		t.Fatalf("attendee event notification slug = %q, want intro-freediving-session", got)
	}
}

func TestUpdateEventNotificationIncludesSlug(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443121"
		actorID = "550e8400-e29b-41d4-a716-446655443122"
	)
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	newStart := start.Add(time.Hour)
	newEnd := end.Add(time.Hour)
	notifications := &eventsNotificationStub{}
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Slug:       "intro-freediving-session",
			Title:      "Intro freediving session",
			Status:     "published",
			Visibility: "public",
			StartsAt:   &start,
			EndsAt:     &end,
		},
		updatedEvent: eventsrepo.Event{
			ID:        eventID,
			Slug:      "intro-freediving-session",
			Title:     "Intro freediving session",
			Status:    "published",
			StartsAt:  &newStart,
			EndsAt:    &newEnd,
			UpdatedAt: time.Now().UTC(),
		},
	}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{StartsAt: &newStart, EndsAt: &newEnd}); err != nil {
		t.Fatalf("UpdateEvent returned error: %v", err)
	}
	if len(notifications.updated) != 1 {
		t.Fatalf("expected update notification, got %d", len(notifications.updated))
	}
	if got := notifications.updated[0].EventSlug; got != "intro-freediving-session" {
		t.Fatalf("updated event notification slug = %q, want intro-freediving-session", got)
	}
}

func TestCancelEventNotificationIncludesSlug(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443131"
		actorID = "550e8400-e29b-41d4-a716-446655443132"
	)
	cancelled := "cancelled"
	notifications := &eventsNotificationStub{}
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Slug:       "freediving-cleanup-dive",
			Title:      "Freediving cleanup dive",
			Status:     "published",
			Visibility: "public",
		},
		updatedEvent: eventsrepo.Event{
			ID:        eventID,
			Slug:      "freediving-cleanup-dive",
			Title:     "Freediving cleanup dive",
			Status:    "cancelled",
			UpdatedAt: time.Now().UTC(),
		},
	}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{Status: &cancelled}); err != nil {
		t.Fatalf("UpdateEvent(cancelled) returned error: %v", err)
	}
	if len(notifications.cancelled) != 1 {
		t.Fatalf("expected cancellation notification, got %d", len(notifications.cancelled))
	}
	if got := notifications.cancelled[0].EventSlug; got != "freediving-cleanup-dive" {
		t.Fatalf("cancelled event notification slug = %q, want freediving-cleanup-dive", got)
	}
}

func TestCreateEventRequiresDiveSite(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443042"
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	repo := &eventsRepoStub{}
	svc := New(repo)
	capacity := 8

	_, err := svc.CreateEvent(context.Background(), actorID, eventsrepo.CreateEventInput{
		Title:               "Line training",
		ShortDescription:    "Morning line session",
		DescriptionMarkdown: "Bring fins and buoy.",
		EventType:           "line_training",
		StartsAt:            &start,
		EndsAt:              &end,
		Capacity:            &capacity,
		Visibility:          "public",
		Difficulty:          "beginner",
	})
	if err == nil {
		t.Fatalf("expected missing dive site validation error")
	}
}

func TestCreateMinimalPaidEventAllowsDeferredPaymentSetup(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443043"
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         "550e8400-e29b-41d4-a716-446655443045",
			Title:      "Depth training",
			Status:     "published",
			Visibility: "public",
			IsPaid:     true,
		},
	}
	svc := New(repo)

	_, err := svc.CreateEvent(context.Background(), actorID, eventsrepo.CreateEventInput{
		Title:            "Depth training",
		ShortDescription: "Depth session",
		EventType:        "depth_training",
		DiveSiteID:       "550e8400-e29b-41d4-a716-446655443044",
		StartsAt:         &start,
		EndsAt:           &end,
		Visibility:       "public",
		IsPaid:           true,
	})
	if err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}
	if repo.createInput.Timezone != "Asia/Manila" {
		t.Fatalf("timezone default = %q, want Asia/Manila", repo.createInput.Timezone)
	}
	if repo.createInput.Capacity != nil {
		t.Fatalf("capacity should stay unset for minimal create, got %#v", *repo.createInput.Capacity)
	}
	if repo.createInput.DescriptionMarkdown != "" {
		t.Fatalf("description should stay unset for minimal create, got %q", repo.createInput.DescriptionMarkdown)
	}
	if repo.createInput.Difficulty != "beginner" {
		t.Fatalf("difficulty default = %q, want beginner", repo.createInput.Difficulty)
	}
	if repo.createInput.PriceAmount != nil || len(repo.createInput.PaymentMethods) != 0 {
		t.Fatalf("payment setup should be deferred, got price=%#v methods=%d", repo.createInput.PriceAmount, len(repo.createInput.PaymentMethods))
	}
}

func TestSubmitPaymentRequiresProof(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443045"
		userID  = "550e8400-e29b-41d4-a716-446655443046"
		method  = "550e8400-e29b-41d4-a716-446655443047"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:           eventID,
			Status:       "published",
			Visibility:   "public",
			IsPaid:       true,
			ViewerJoined: true,
		},
	}
	svc := New(repo)

	_, err := svc.SubmitPayment(context.Background(), eventsrepo.SubmitPaymentInput{
		EventID:         eventID,
		UserID:          userID,
		PaymentMethodID: method,
	})
	if err == nil {
		t.Fatalf("expected payment proof validation error")
	}
}

func TestSubmitPaymentRejectsBareProofAttachmentURL(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443048"
		userID  = "550e8400-e29b-41d4-a716-446655443049"
		method  = "550e8400-e29b-41d4-a716-446655443050"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:           eventID,
			Status:       "published",
			Visibility:   "public",
			IsPaid:       true,
			ViewerJoined: true,
		},
	}
	svc := New(repo)

	_, err := svc.SubmitPayment(context.Background(), eventsrepo.SubmitPaymentInput{
		EventID:            eventID,
		UserID:             userID,
		PaymentMethodID:    method,
		ProofAttachmentURL: "https://example.com/proof.jpg",
	})
	if err == nil {
		t.Fatalf("expected bare payment proof URL to be rejected")
	}
}

func TestGetPaymentProofURLAllowsOrganizer(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443061"
		paymentID = "550e8400-e29b-41d4-a716-446655443062"
		ownerID   = "550e8400-e29b-41d4-a716-446655443063"
		actorID   = "550e8400-e29b-41d4-a716-446655443064"
		mediaID   = "550e8400-e29b-41d4-a716-446655443065"
	)
	repo := &eventsRepoStub{
		canManageSet: true,
		canManage:    true,
		proof: eventsrepo.EventPaymentProof{
			PaymentID:    paymentID,
			EventID:      eventID,
			UserID:       ownerID,
			ProofMediaID: mediaID,
			ObjectKey:    "events/proofs/gcash.jpg",
			FileName:     "gcash.jpg",
			ContentType:  "image/jpeg",
		},
	}
	svc := signedProofTestService(repo)

	result, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, actorID)
	if err != nil {
		t.Fatalf("GetPaymentProofURL returned error: %v", err)
	}
	if !strings.HasPrefix(result.URL, "https://cdn.example.com/events/proofs/gcash.jpg?") {
		t.Fatalf("expected signed CDN URL, got %q", result.URL)
	}
	if result.ProofMediaID != mediaID || result.ProofFileName != "gcash.jpg" || result.ProofContentType != "image/jpeg" {
		t.Fatalf("unexpected proof metadata: %#v", result)
	}
}

func TestGetPaymentProofURLAllowsPaymentOwner(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443066"
		paymentID = "550e8400-e29b-41d4-a716-446655443067"
		ownerID   = "550e8400-e29b-41d4-a716-446655443068"
		mediaID   = "550e8400-e29b-41d4-a716-446655443069"
	)
	repo := &eventsRepoStub{
		canManageSet: true,
		canManage:    false,
		proof: eventsrepo.EventPaymentProof{
			PaymentID:    paymentID,
			EventID:      eventID,
			UserID:       ownerID,
			ProofMediaID: mediaID,
			ObjectKey:    "events/proofs/maya.jpg",
			FileName:     "maya.jpg",
			ContentType:  "image/jpeg",
		},
	}
	svc := signedProofTestService(repo)

	if _, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, ownerID); err != nil {
		t.Fatalf("expected owner to view payment proof: %v", err)
	}
}

func TestGetPaymentProofURLRejectsUnrelatedParticipant(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443070"
		paymentID = "550e8400-e29b-41d4-a716-446655443071"
		ownerID   = "550e8400-e29b-41d4-a716-446655443072"
		actorID   = "550e8400-e29b-41d4-a716-446655443073"
	)
	repo := &eventsRepoStub{
		canManageSet: true,
		canManage:    false,
		proof: eventsrepo.EventPaymentProof{
			PaymentID: paymentID,
			EventID:   eventID,
			UserID:    ownerID,
			ObjectKey: "events/proofs/other.jpg",
		},
	}
	svc := signedProofTestService(repo)

	_, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, actorID)
	assertAppErrorStatus(t, err, http.StatusForbidden)
}

func TestGetPaymentProofURLRejectsUnauthenticated(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443074"
		paymentID = "550e8400-e29b-41d4-a716-446655443075"
	)
	repo := &eventsRepoStub{}
	svc := signedProofTestService(repo)

	_, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, "")
	assertAppErrorStatus(t, err, http.StatusUnauthorized)
}

func TestGetPaymentProofURLRejectsWrongEvent(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443076"
		paymentID = "550e8400-e29b-41d4-a716-446655443077"
		actorID   = "550e8400-e29b-41d4-a716-446655443078"
	)
	repo := &eventsRepoStub{proofErr: pgx.ErrNoRows}
	svc := signedProofTestService(repo)

	_, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, actorID)
	assertAppErrorStatus(t, err, http.StatusNotFound)
}

func TestGetPaymentProofURLRejectsMissingOrInactiveProofMedia(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443079"
		paymentID = "550e8400-e29b-41d4-a716-446655443080"
		actorID   = "550e8400-e29b-41d4-a716-446655443081"
	)
	repo := &eventsRepoStub{proofErr: pgx.ErrNoRows}
	svc := signedProofTestService(repo)

	_, err := svc.GetPaymentProofURL(context.Background(), eventID, paymentID, actorID)
	assertAppErrorStatus(t, err, http.StatusNotFound)
}

func TestVerifyEventPassAllowsOwnerAndOrganizerOnly(t *testing.T) {
	const (
		eventID       = "550e8400-e29b-41d4-a716-446655443081"
		ownerID       = "550e8400-e29b-41d4-a716-446655443082"
		organizerID   = "550e8400-e29b-41d4-a716-446655443083"
		unrelatedID   = "550e8400-e29b-41d4-a716-446655443084"
		passToken     = "secure-random-token"
		eventSlug     = "annual-line-training"
		participantID = "550e8400-e29b-41d4-a716-446655443085"
	)
	participant := eventsrepo.EventParticipant{
		ID:      participantID,
		EventID: eventID,
		UserID:  ownerID,
		Role:    "participant",
		Status:  "confirmed",
		QRToken: passToken,
		Payment: &eventsrepo.EventParticipantPayment{Status: "verified"},
	}

	t.Run("owner can view own pass", func(t *testing.T) {
		repo := &eventsRepoStub{
			event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
			participant:  participant,
			canManageSet: true,
			canManage:    false,
		}
		pass, err := New(repo).VerifyEventPass(context.Background(), eventSlug, passToken, ownerID)
		if err != nil {
			t.Fatalf("owner should view pass: %v", err)
		}
		if !pass.IsOwner || pass.Participant.UserID != ownerID {
			t.Fatalf("unexpected owner pass result: %#v", pass)
		}
	})

	t.Run("organizer can verify member pass", func(t *testing.T) {
		repo := &eventsRepoStub{
			event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
			participant:  participant,
			canManageSet: true,
			canManage:    true,
		}
		pass, err := New(repo).VerifyEventPass(context.Background(), eventSlug, passToken, organizerID)
		if err != nil {
			t.Fatalf("organizer should verify pass: %v", err)
		}
		if !pass.CanManage || pass.IsOwner {
			t.Fatalf("unexpected organizer pass result: %#v", pass)
		}
	})

	t.Run("unrelated user is forbidden", func(t *testing.T) {
		repo := &eventsRepoStub{
			event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
			participant:  participant,
			canManageSet: true,
			canManage:    false,
		}
		_, err := New(repo).VerifyEventPass(context.Background(), eventSlug, passToken, unrelatedID)
		assertAppErrorStatus(t, err, http.StatusForbidden)
	})
}

func TestVerifyEventPassRejectsMismatchedOrRevokedToken(t *testing.T) {
	repo := &eventsRepoStub{passErr: pgx.ErrNoRows}
	_, err := New(repo).VerifyEventPass(context.Background(), "wrong-event", "revoked-or-missing-token", "550e8400-e29b-41d4-a716-446655443086")
	assertAppErrorStatus(t, err, http.StatusNotFound)
}

func TestRegenerateParticipantPassRequiresOrganizer(t *testing.T) {
	const (
		eventID       = "550e8400-e29b-41d4-a716-446655443087"
		participantID = "550e8400-e29b-41d4-a716-446655443088"
		actorID       = "550e8400-e29b-41d4-a716-446655443089"
	)
	repo := &eventsRepoStub{canManageSet: true, canManage: false}
	_, err := New(repo).RegenerateParticipantPass(context.Background(), eventID, participantID, actorID)
	assertAppErrorStatus(t, err, http.StatusForbidden)
}

func TestCheckInEventPassRequiresOrganizerAndSetsCheckInFields(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443090"
		eventSlug = "check-in-day"
		actorID   = "550e8400-e29b-41d4-a716-446655443091"
		userID    = "550e8400-e29b-41d4-a716-446655443092"
		token     = "secure-random-token"
	)
	repo := &eventsRepoStub{
		event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
		participant:  eventsrepo.EventParticipant{EventID: eventID, UserID: userID, QRToken: token, Status: "confirmed", Payment: &eventsrepo.EventParticipantPayment{Status: "submitted"}},
		canManageSet: true,
		canManage:    true,
	}
	pass, err := New(repo).CheckInEventPass(context.Background(), eventSlug, token, actorID)
	if err != nil {
		t.Fatalf("organizer should check in pass: %v", err)
	}
	if !repo.checkInCalled {
		t.Fatalf("expected repo check-in to be called")
	}
	if pass.Participant.CheckedInAt == nil || pass.Participant.CheckedInBy != actorID {
		t.Fatalf("expected check-in fields to be set: %#v", pass.Participant)
	}
	if pass.Participant.Payment == nil || pass.Participant.Payment.Status != "submitted" {
		t.Fatalf("check-in must not alter payment status: %#v", pass.Participant.Payment)
	}

	repo = &eventsRepoStub{
		event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
		participant:  eventsrepo.EventParticipant{EventID: eventID, UserID: userID, QRToken: token, Status: "confirmed"},
		canManageSet: true,
		canManage:    false,
	}
	_, err = New(repo).CheckInEventPass(context.Background(), eventSlug, token, actorID)
	assertAppErrorStatus(t, err, http.StatusForbidden)
}

func TestCheckInEventPassIsIdempotentAndRejectsInvalidToken(t *testing.T) {
	const (
		eventID   = "550e8400-e29b-41d4-a716-446655443093"
		eventSlug = "already-checked-in"
		actorID   = "550e8400-e29b-41d4-a716-446655443094"
		userID    = "550e8400-e29b-41d4-a716-446655443095"
		token     = "secure-random-token"
	)
	checkedInAt := time.Date(2026, 5, 23, 7, 30, 0, 0, time.UTC)
	repo := &eventsRepoStub{
		event:        eventsrepo.Event{ID: eventID, Slug: eventSlug, Status: "published"},
		participant:  eventsrepo.EventParticipant{EventID: eventID, UserID: userID, QRToken: token, Status: "confirmed", CheckedInAt: &checkedInAt, CheckedInBy: actorID},
		canManageSet: true,
		canManage:    true,
	}
	pass, err := New(repo).CheckInEventPass(context.Background(), eventSlug, token, actorID)
	if err != nil {
		t.Fatalf("already checked-in pass should succeed: %v", err)
	}
	if !pass.AlreadyCheckedIn || repo.checkInCalled {
		t.Fatalf("expected idempotent result without overwrite: %#v called=%v", pass, repo.checkInCalled)
	}

	repo = &eventsRepoStub{passErr: pgx.ErrNoRows}
	_, err = New(repo).CheckInEventPass(context.Background(), eventSlug, "invalid-token", actorID)
	assertAppErrorStatus(t, err, http.StatusNotFound)
}

func TestUpdateEventRejectsInvalidTimeRange(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443051"
		actorID = "550e8400-e29b-41d4-a716-446655443052"
	)
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			StartsAt:   &start,
			EndsAt:     &end,
			Status:     "published",
			Visibility: "public",
		},
	}
	svc := New(repo)

	invalidEnd := start
	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{EndsAt: &invalidEnd}); err == nil {
		t.Fatalf("expected invalid time range to be rejected")
	}
}

func TestCreateEventRejectsInvalidTimezone(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443082"
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	repo := &eventsRepoStub{}
	svc := New(repo)
	capacity := 8

	_, err := svc.CreateEvent(context.Background(), actorID, eventsrepo.CreateEventInput{
		Title:               "Line training",
		ShortDescription:    "Morning line session",
		DescriptionMarkdown: "Bring fins and buoy.",
		EventType:           "line_training",
		DiveSiteID:          "550e8400-e29b-41d4-a716-446655443083",
		StartsAt:            &start,
		EndsAt:              &end,
		Timezone:            "Philippines/NotReal",
		Capacity:            &capacity,
		Visibility:          "public",
		Difficulty:          "beginner",
	})
	if err == nil {
		t.Fatalf("expected invalid timezone validation error")
	}
}

func TestUpdateEventAllowsPaidToggleWithoutPrice(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443053"
		actorID = "550e8400-e29b-41d4-a716-446655443054"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Status:     "published",
			Visibility: "public",
			IsPaid:     false,
		},
	}
	svc := New(repo)

	isPaid := true
	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{IsPaid: &isPaid}); err != nil {
		t.Fatalf("UpdateEvent returned error: %v", err)
	}
	if repo.updateInput.IsPaid == nil || !*repo.updateInput.IsPaid {
		t.Fatalf("expected paid toggle to reach repo, got %#v", repo.updateInput.IsPaid)
	}
}

func TestUpdatePaymentMethodKeepsPatchFieldsPartial(t *testing.T) {
	const (
		eventID         = "550e8400-e29b-41d4-a716-446655443087"
		paymentMethodID = "550e8400-e29b-41d4-a716-446655443088"
		actorID         = "550e8400-e29b-41d4-a716-446655443089"
	)
	repo := &eventsRepoStub{}
	svc := New(repo)
	name := "Updated GCash QR"

	if _, err := svc.UpdatePaymentMethod(context.Background(), eventID, paymentMethodID, actorID, eventsrepo.UpdatePaymentMethodInput{Name: &name}); err != nil {
		t.Fatalf("UpdatePaymentMethod returned error: %v", err)
	}
	if repo.updatePaymentMethodInput.Name == nil || *repo.updatePaymentMethodInput.Name != name {
		t.Fatalf("expected name patch to pass through, got %#v", repo.updatePaymentMethodInput)
	}
	if repo.updatePaymentMethodInput.Type != nil || repo.updatePaymentMethodInput.QRImageURL != nil || repo.updatePaymentMethodInput.BankName != nil {
		t.Fatalf("partial update should not synthesize absent fields: %#v", repo.updatePaymentMethodInput)
	}
}

func TestJoinEventAutoConfirmsWhenApprovalDisabled(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443011"
		userID  = "550e8400-e29b-41d4-a716-446655443012"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:               eventID,
			Title:            "Pool session",
			Status:           "published",
			Visibility:       "public",
			RequiresApproval: false,
		},
	}
	svc := New(repo)

	participant, err := svc.JoinEvent(context.Background(), eventID, userID, "")
	if err != nil {
		t.Fatalf("JoinEvent returned error: %v", err)
	}
	if participant.Status != "confirmed" {
		t.Fatalf("expected confirmed, got %q", participant.Status)
	}
}

func TestJoinEventPreventsDuplicateParticipation(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443021"
		userID  = "550e8400-e29b-41d4-a716-446655443022"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Title:      "Depth day",
			Status:     "published",
			Visibility: "public",
			ViewerParticipation: &eventsrepo.EventParticipant{
				ID:     "550e8400-e29b-41d4-a716-446655443023",
				Status: "confirmed",
			},
		},
	}
	svc := New(repo)

	if _, err := svc.JoinEvent(context.Background(), eventID, userID, ""); err == nil {
		t.Fatalf("expected duplicate participation error")
	}
}

func TestJoinEventBlocksRejoinAfterTerminalParticipation(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443084"
		userID  = "550e8400-e29b-41d4-a716-446655443085"
	)
	for _, status := range []string{"left", "rejected"} {
		t.Run(status, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:         eventID,
					Title:      "Depth day",
					Status:     "published",
					Visibility: "public",
					ViewerParticipation: &eventsrepo.EventParticipant{
						ID:     "550e8400-e29b-41d4-a716-446655443086",
						Status: status,
					},
				},
			}
			svc := New(repo)

			_, err := svc.JoinEvent(context.Background(), eventID, userID, "")
			assertAppErrorStatus(t, err, http.StatusConflict)
		})
	}
}

func TestMarkEventInterestedAllowsEligibleViewer(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443141"
		userID  = "550e8400-e29b-41d4-a716-446655443142"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Status:     "published",
			Visibility: "public",
		},
	}
	svc := New(repo)

	if _, err := svc.MarkEventInterested(context.Background(), eventID, userID); err != nil {
		t.Fatalf("MarkEventInterested returned error: %v", err)
	}
	if !repo.markInterestedCalled {
		t.Fatalf("expected repository interest write")
	}
}

func TestMarkEventUninterestedIsIdempotentAtServiceBoundary(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443143"
		userID  = "550e8400-e29b-41d4-a716-446655443144"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Status:     "published",
			Visibility: "public",
		},
	}
	svc := New(repo)

	if _, err := svc.MarkEventUninterested(context.Background(), eventID, userID); err != nil {
		t.Fatalf("MarkEventUninterested returned error: %v", err)
	}
	if !repo.markUninterestedCalled {
		t.Fatalf("expected repository uninterest write")
	}
}

func TestMarkEventInterestedRequiresAuthentication(t *testing.T) {
	const eventID = "550e8400-e29b-41d4-a716-446655443145"
	repo := &eventsRepoStub{}
	svc := New(repo)

	_, err := svc.MarkEventInterested(context.Background(), eventID, "")
	assertAppErrorStatus(t, err, http.StatusUnauthorized)
}

func TestMarkEventInterestedRejectsClosedEvents(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443146"
		userID  = "550e8400-e29b-41d4-a716-446655443147"
	)
	for _, status := range []string{"draft", "cancelled", "completed"} {
		t.Run(status, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:         eventID,
					Status:     status,
					Visibility: "public",
				},
			}
			svc := New(repo)

			_, err := svc.MarkEventInterested(context.Background(), eventID, userID)
			assertAppErrorStatus(t, err, http.StatusConflict)
			if repo.markInterestedCalled {
				t.Fatalf("closed event should not write interest")
			}
		})
	}
}

func TestMarkEventInterestedRejectsActiveParticipation(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443148"
		userID  = "550e8400-e29b-41d4-a716-446655443149"
	)
	for _, status := range []string{"pending_approval", "confirmed", "attended"} {
		t.Run(status, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:         eventID,
					Status:     "published",
					Visibility: "public",
					ViewerParticipation: &eventsrepo.EventParticipant{
						ID:     "550e8400-e29b-41d4-a716-446655443150",
						Status: status,
					},
				},
			}
			svc := New(repo)

			_, err := svc.MarkEventInterested(context.Background(), eventID, userID)
			assertAppErrorStatus(t, err, http.StatusConflict)
			if repo.markInterestedCalled {
				t.Fatalf("active participant should not write interest")
			}
		})
	}
}

func TestMarkEventInterestedAllowsTerminalParticipationInterestOnly(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443151"
		userID  = "550e8400-e29b-41d4-a716-446655443152"
	)
	for _, status := range []string{"left", "rejected"} {
		t.Run(status, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:         eventID,
					Status:     "published",
					Visibility: "public",
					ViewerParticipation: &eventsrepo.EventParticipant{
						ID:     "550e8400-e29b-41d4-a716-446655443153",
						Status: status,
					},
				},
			}
			svc := New(repo)

			if _, err := svc.MarkEventInterested(context.Background(), eventID, userID); err != nil {
				t.Fatalf("MarkEventInterested returned error: %v", err)
			}
			if !repo.markInterestedCalled || repo.joinInput.EventID != "" {
				t.Fatalf("terminal participation should only write interest, repo=%#v", repo)
			}
		})
	}
}

func TestMarkEventInterestedRejectsUnauthorizedPrivateViewer(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443154"
		userID  = "550e8400-e29b-41d4-a716-446655443155"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          eventID,
			Status:                      "published",
			Visibility:                  "private",
			ViewerCanViewPrivateDetails: false,
			ViewerCanManage:             false,
		},
	}
	svc := New(repo)

	_, err := svc.MarkEventInterested(context.Background(), eventID, userID)
	assertAppErrorStatus(t, err, http.StatusForbidden)
	if repo.markInterestedCalled {
		t.Fatalf("unauthorized private viewer should not write interest")
	}
}

func TestLeaveEventUsesLeftLifecycle(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443031"
		userID  = "550e8400-e29b-41d4-a716-446655443032"
	)
	repo := &eventsRepoStub{
		participant: eventsrepo.EventParticipant{
			ID:      "550e8400-e29b-41d4-a716-446655443033",
			EventID: eventID,
			UserID:  userID,
			Role:    "participant",
			Status:  "confirmed",
		},
	}
	svc := New(repo)

	if err := svc.LeaveEvent(context.Background(), eventID, userID); err != nil {
		t.Fatalf("LeaveEvent returned error: %v", err)
	}
	if repo.leftStatus != "left" {
		t.Fatalf("expected repo leave lifecycle to record left, got %q", repo.leftStatus)
	}
}

func TestCreateCompetitionRequiresOrganizer(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444101"
		actorID = "550e8400-e29b-41d4-a716-446655444102"
	)
	repo := &eventsRepoStub{canManageSet: true, canManage: false}
	svc := New(repo)

	_, err := svc.CreateCompetition(context.Background(), eventID, actorID, eventsrepo.CreateCompetitionInput{Name: "Underwater Photography"})
	assertAppErrorStatus(t, err, http.StatusForbidden)
	if repo.competitionInput.Name != "" {
		t.Fatalf("non-organizer should not create competition: %#v", repo.competitionInput)
	}
}

func TestOrganizerCanCreateCompetitionAndPrize(t *testing.T) {
	const (
		eventID       = "550e8400-e29b-41d4-a716-446655444111"
		actorID       = "550e8400-e29b-41d4-a716-446655444112"
		competitionID = "550e8400-e29b-41d4-a716-446655444113"
	)
	repo := &eventsRepoStub{canManageSet: true, canManage: true}
	svc := New(repo)

	if _, err := svc.CreateCompetition(context.Background(), eventID, actorID, eventsrepo.CreateCompetitionInput{Name: "Best Static"}); err != nil {
		t.Fatalf("CreateCompetition returned error: %v", err)
	}
	if repo.competitionInput.Name != "Best Static" {
		t.Fatalf("competition input not captured: %#v", repo.competitionInput)
	}
	if _, err := svc.CreatePrize(context.Background(), eventID, actorID, eventsrepo.CreatePrizeInput{
		CompetitionID: competitionID,
		Title:         "Champion",
		Placement:     "champion",
		PrizeType:     "certificate",
	}); err != nil {
		t.Fatalf("CreatePrize returned error: %v", err)
	}
	if repo.prizeInput.CompetitionID != competitionID || repo.prizeInput.Placement != "champion" {
		t.Fatalf("linked prize input not preserved: %#v", repo.prizeInput)
	}
	if _, err := svc.CreatePrize(context.Background(), eventID, actorID, eventsrepo.CreatePrizeInput{
		Title:          "People's Choice",
		Placement:      "custom",
		PlacementLabel: "People's Choice",
	}); err != nil {
		t.Fatalf("CreatePrize without competition returned error: %v", err)
	}
}

func TestCreatePrizeRejectsCrossEventReferences(t *testing.T) {
	const (
		eventID       = "550e8400-e29b-41d4-a716-446655444114"
		actorID       = "550e8400-e29b-41d4-a716-446655444115"
		competitionID = "550e8400-e29b-41d4-a716-446655444116"
		sponsorID     = "550e8400-e29b-41d4-a716-446655444117"
	)

	t.Run("competition from another event", func(t *testing.T) {
		repo := &eventsRepoStub{
			canManageSet:          true,
			canManage:             true,
			competitionBelongsSet: true,
			competitionBelongs:    false,
		}
		svc := New(repo)

		_, err := svc.CreatePrize(context.Background(), eventID, actorID, eventsrepo.CreatePrizeInput{
			CompetitionID: competitionID,
			Title:         "Champion",
			Placement:     "champion",
		})
		assertAppErrorStatus(t, err, http.StatusNotFound)
		if repo.prizeInput.Title != "" {
			t.Fatalf("cross-event competition should not reach repo: %#v", repo.prizeInput)
		}
	})

	t.Run("sponsor from another event", func(t *testing.T) {
		repo := &eventsRepoStub{
			canManageSet:      true,
			canManage:         true,
			sponsorBelongsSet: true,
			sponsorBelongs:    false,
		}
		svc := New(repo)

		_, err := svc.CreatePrize(context.Background(), eventID, actorID, eventsrepo.CreatePrizeInput{
			SponsorID: sponsorID,
			Title:     "Sponsor Award",
			Placement: "sponsor_award",
		})
		assertAppErrorStatus(t, err, http.StatusNotFound)
		if repo.prizeInput.Title != "" {
			t.Fatalf("cross-event sponsor should not reach repo: %#v", repo.prizeInput)
		}
	})
}

func TestListSponsorsStripsPrivateContactsForNonOrganizer(t *testing.T) {
	const eventID = "550e8400-e29b-41d4-a716-446655444121"
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          eventID,
			Status:                      "published",
			Visibility:                  "public",
			ViewerCanViewPrivateDetails: true,
			ViewerCanManage:             false,
		},
		sponsors: []eventsrepo.EventSponsor{{
			ID:           "550e8400-e29b-41d4-a716-446655444122",
			EventID:      eventID,
			Name:         "Dive Shop",
			ContactName:  "Private Contact",
			ContactEmail: "private@example.com",
			IsActive:     true,
		}, {
			ID:           "550e8400-e29b-41d4-a716-446655444127",
			EventID:      eventID,
			Name:         "Inactive Sponsor",
			ContactName:  "Inactive Contact",
			ContactEmail: "inactive@example.com",
			IsActive:     false,
		}},
	}
	svc := New(repo)

	items, err := svc.ListSponsors(context.Background(), eventID, "550e8400-e29b-41d4-a716-446655444123")
	if err != nil {
		t.Fatalf("ListSponsors returned error: %v", err)
	}
	if len(items) != 1 || items[0].Name != "Dive Shop" {
		t.Fatalf("inactive sponsor leaked to non-organizer: %#v", items)
	}
	if items[0].ContactName != "" || items[0].ContactEmail != "" {
		t.Fatalf("private sponsor contacts leaked: %#v", items)
	}
}

func TestSponsorInputHardening(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444124"
		actorID = "550e8400-e29b-41d4-a716-446655444125"
		logoID  = "550e8400-e29b-41d4-a716-446655444126"
	)

	t.Run("rejects unsafe sponsor URL", func(t *testing.T) {
		repo := &eventsRepoStub{canManageSet: true, canManage: true}
		svc := New(repo)

		_, err := svc.CreateSponsor(context.Background(), eventID, actorID, eventsrepo.CreateSponsorInput{
			Name:       "Unsafe Sponsor",
			WebsiteURL: "javascript:alert(1)",
		})
		assertValidationFailure(t, err)
		if repo.sponsorInput.Name != "" {
			t.Fatalf("unsafe sponsor URL should not reach repo: %#v", repo.sponsorInput)
		}
	})

	t.Run("rejects cross-event sponsor logo", func(t *testing.T) {
		repo := &eventsRepoStub{
			canManageSet:    true,
			canManage:       true,
			mediaBelongsSet: true,
			mediaBelongs:    false,
		}
		svc := New(repo)

		_, err := svc.CreateSponsor(context.Background(), eventID, actorID, eventsrepo.CreateSponsorInput{
			Name:        "Dive Shop",
			LogoMediaID: logoID,
			WebsiteURL:  "https://example.com",
		})
		assertAppErrorStatus(t, err, http.StatusNotFound)
		if repo.sponsorInput.Name != "" {
			t.Fatalf("cross-event logo should not reach repo: %#v", repo.sponsorInput)
		}
	})
}

func TestEventPostPermissions(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444131"
		userID  = "550e8400-e29b-41d4-a716-446655444132"
	)

	t.Run("disabled blocks confirmed participant", func(t *testing.T) {
		repo := &eventsRepoStub{
			event: eventsrepo.Event{
				ID:               eventID,
				Status:           "published",
				Visibility:       "public",
				PostsEnabled:     false,
				PostCreatePolicy: "participants",
				ViewerParticipation: &eventsrepo.EventParticipant{
					Status: "confirmed",
				},
			},
		}
		svc := New(repo)

		_, err := svc.CreatePost(context.Background(), eventID, userID, eventsrepo.CreatePostInput{BodyMarkdown: "Update"})
		assertAppErrorStatus(t, err, http.StatusConflict)
	})

	t.Run("organizers only blocks participant", func(t *testing.T) {
		repo := &eventsRepoStub{
			event: eventsrepo.Event{
				ID:               eventID,
				Status:           "published",
				Visibility:       "public",
				PostsEnabled:     true,
				PostCreatePolicy: "organizers_only",
				ViewerParticipation: &eventsrepo.EventParticipant{
					Status: "confirmed",
				},
			},
		}
		svc := New(repo)

		_, err := svc.CreatePost(context.Background(), eventID, userID, eventsrepo.CreatePostInput{BodyMarkdown: "Update"})
		assertAppErrorStatus(t, err, http.StatusForbidden)
	})

	t.Run("participants policy allows confirmed participant", func(t *testing.T) {
		repo := &eventsRepoStub{
			event: eventsrepo.Event{
				ID:               eventID,
				Status:           "published",
				Visibility:       "public",
				PostsEnabled:     true,
				PostCreatePolicy: "participants",
				ViewerParticipation: &eventsrepo.EventParticipant{
					Status: "confirmed",
				},
			},
		}
		svc := New(repo)

		if _, err := svc.CreatePost(context.Background(), eventID, userID, eventsrepo.CreatePostInput{BodyMarkdown: "Update"}); err != nil {
			t.Fatalf("CreatePost returned error: %v", err)
		}
		if repo.postInput.BodyMarkdown != "Update" {
			t.Fatalf("post body did not reach repo: %#v", repo.postInput)
		}
	})

	for _, status := range []string{"pending_approval", "rejected", "left", "cancelled"} {
		t.Run("participants policy blocks "+status, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:               eventID,
					Status:           "published",
					Visibility:       "public",
					PostsEnabled:     true,
					PostCreatePolicy: "participants",
					ViewerParticipation: &eventsrepo.EventParticipant{
						Status: status,
					},
				},
			}
			svc := New(repo)

			_, err := svc.CreatePost(context.Background(), eventID, userID, eventsrepo.CreatePostInput{BodyMarkdown: "Update"})
			assertAppErrorStatus(t, err, http.StatusForbidden)
		})
	}
}

func TestListPostsRespectsDisabledStateForParticipants(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444136"
		userID  = "550e8400-e29b-41d4-a716-446655444137"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:               eventID,
			Status:           "published",
			Visibility:       "public",
			PostsEnabled:     false,
			PostCreatePolicy: "participants",
			ViewerParticipation: &eventsrepo.EventParticipant{
				Status: "confirmed",
			},
		},
		posts: []eventsrepo.EventPost{{
			ID:           "550e8400-e29b-41d4-a716-446655444138",
			EventID:      eventID,
			AuthorUserID: userID,
			BodyMarkdown: "Hidden while disabled",
			Status:       "published",
		}},
	}
	svc := New(repo)

	_, err := svc.ListPosts(context.Background(), eventID, userID)
	assertAppErrorStatus(t, err, http.StatusForbidden)
}

func TestPostAuthorMutationsRequireActivePostingAccess(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444139"
		userID  = "550e8400-e29b-41d4-a716-446655444140"
		postID  = "550e8400-e29b-41d4-a716-446655444129"
	)

	t.Run("confirmed participant can edit own published post", func(t *testing.T) {
		repo := &eventsRepoStub{
			event: eventsrepo.Event{
				ID:               eventID,
				Status:           "published",
				Visibility:       "public",
				PostsEnabled:     true,
				PostCreatePolicy: "participants",
				ViewerParticipation: &eventsrepo.EventParticipant{
					Status: "confirmed",
				},
			},
			post: eventsrepo.EventPost{
				ID:           postID,
				EventID:      eventID,
				AuthorUserID: userID,
				BodyMarkdown: "Original",
				Status:       "published",
			},
		}
		svc := New(repo)

		body := "Updated"
		if _, err := svc.UpdatePost(context.Background(), eventID, postID, userID, eventsrepo.UpdatePostInput{BodyMarkdown: &body}); err != nil {
			t.Fatalf("UpdatePost returned error: %v", err)
		}
	})

	for _, tc := range []struct {
		name         string
		status       string
		postStatus   string
		postsEnabled bool
		policy       string
	}{
		{name: "left author", status: "left", postStatus: "published", postsEnabled: true, policy: "participants"},
		{name: "hidden post", status: "confirmed", postStatus: "hidden", postsEnabled: true, policy: "participants"},
		{name: "posts disabled", status: "confirmed", postStatus: "published", postsEnabled: false, policy: "participants"},
		{name: "participants no longer allowed", status: "confirmed", postStatus: "published", postsEnabled: true, policy: "organizers_only"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &eventsRepoStub{
				event: eventsrepo.Event{
					ID:               eventID,
					Status:           "published",
					Visibility:       "public",
					PostsEnabled:     tc.postsEnabled,
					PostCreatePolicy: tc.policy,
					ViewerParticipation: &eventsrepo.EventParticipant{
						Status: tc.status,
					},
				},
				post: eventsrepo.EventPost{
					ID:           postID,
					EventID:      eventID,
					AuthorUserID: userID,
					BodyMarkdown: "Original",
					Status:       tc.postStatus,
				},
			}
			svc := New(repo)

			body := "Updated"
			_, err := svc.UpdatePost(context.Background(), eventID, postID, userID, eventsrepo.UpdatePostInput{BodyMarkdown: &body})
			assertAppErrorStatus(t, err, http.StatusForbidden)
			err = svc.DeletePost(context.Background(), eventID, postID, userID)
			assertAppErrorStatus(t, err, http.StatusForbidden)
		})
	}
}

func TestUnauthorizedPrivateViewerCannotSeePosts(t *testing.T) {
	const eventID = "550e8400-e29b-41d4-a716-446655444141"
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          eventID,
			Status:                      "published",
			Visibility:                  "private",
			ViewerCanViewPrivateDetails: false,
			ViewerCanManage:             false,
		},
	}
	svc := New(repo)

	_, err := svc.ListPosts(context.Background(), eventID, "550e8400-e29b-41d4-a716-446655444142")
	assertAppErrorStatus(t, err, http.StatusForbidden)
}

func TestUnauthorizedPrivateViewerCannotSeeEventExtensions(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655444143"
		userID  = "550e8400-e29b-41d4-a716-446655444144"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:                          eventID,
			Status:                      "published",
			Visibility:                  "private",
			ViewerCanViewPrivateDetails: false,
			ViewerCanManage:             false,
		},
	}
	svc := New(repo)

	if _, err := svc.ListCompetitions(context.Background(), eventID, userID); err == nil {
		t.Fatalf("unauthorized private viewer should not list competitions")
	} else {
		assertAppErrorStatus(t, err, http.StatusForbidden)
	}
	if _, err := svc.ListPrizes(context.Background(), eventID, userID); err == nil {
		t.Fatalf("unauthorized private viewer should not list prizes")
	} else {
		assertAppErrorStatus(t, err, http.StatusForbidden)
	}
	if _, err := svc.ListSponsors(context.Background(), eventID, userID); err == nil {
		t.Fatalf("unauthorized private viewer should not list sponsors")
	} else {
		assertAppErrorStatus(t, err, http.StatusForbidden)
	}
}

func TestParticipantRoleManagementGuards(t *testing.T) {
	const (
		eventID       = "550e8400-e29b-41d4-a716-446655444151"
		participantID = "550e8400-e29b-41d4-a716-446655444152"
		actorID       = "550e8400-e29b-41d4-a716-446655444153"
	)

	t.Run("non organizer cannot promote", func(t *testing.T) {
		repo := &eventsRepoStub{canManageSet: true, canManage: false}
		svc := New(repo)

		_, err := svc.UpdateParticipantRole(context.Background(), eventID, participantID, actorID, "organizer")
		assertAppErrorStatus(t, err, http.StatusForbidden)
	})

	t.Run("cannot remove last organizer", func(t *testing.T) {
		repo := &eventsRepoStub{roleErr: eventsrepo.ErrLastOrganizer}
		svc := New(repo)

		_, err := svc.UpdateParticipantRole(context.Background(), eventID, participantID, actorID, "participant")
		assertAppErrorStatus(t, err, http.StatusConflict)
	})
}

type eventsRepoStub struct {
	event                    eventsrepo.Event
	updatedEvent             eventsrepo.Event
	participant              eventsrepo.EventParticipant
	proof                    eventsrepo.EventPaymentProof
	proofErr                 error
	passErr                  error
	competitions             []eventsrepo.EventCompetition
	prizes                   []eventsrepo.EventPrize
	sponsors                 []eventsrepo.EventSponsor
	posts                    []eventsrepo.EventPost
	post                     eventsrepo.EventPost
	listInput                eventsrepo.ListEventsInput
	joinInput                eventsrepo.JoinEventInput
	createInput              eventsrepo.CreateEventInput
	updateInput              eventsrepo.UpdateEventInput
	updatePaymentMethodInput eventsrepo.UpdatePaymentMethodInput
	competitionInput         eventsrepo.CreateCompetitionInput
	prizeInput               eventsrepo.CreatePrizeInput
	sponsorInput             eventsrepo.CreateSponsorInput
	postInput                eventsrepo.CreatePostInput
	roleUpdate               string
	roleErr                  error
	checkInCalled            bool
	competitionBelongs       bool
	competitionBelongsSet    bool
	sponsorBelongs           bool
	sponsorBelongsSet        bool
	mediaBelongs             bool
	mediaBelongsSet          bool
	leftStatus               string
	markInterestedCalled     bool
	markUninterestedCalled   bool
	canManage                bool
	canManageSet             bool
}

func (r *eventsRepoStub) ListEvents(_ context.Context, input eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	r.listInput = input
	return nil, 0, nil
}

func (r *eventsRepoStub) GetEventByID(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) GetEventBySlug(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) CreateEvent(_ context.Context, input eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	r.createInput = input
	return r.event, nil
}

func (r *eventsRepoStub) UpdateEvent(_ context.Context, input eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
	r.updateInput = input
	return r.updatedEvent, nil
}

func (r *eventsRepoStub) GetGroupRole(context.Context, string, string) (string, error) {
	return "owner", nil
}

func (r *eventsRepoStub) CanManageEvent(context.Context, string, string) (bool, error) {
	if r.canManageSet {
		return r.canManage, nil
	}
	return true, nil
}

func (r *eventsRepoStub) MarkEventInterested(context.Context, string, string) error {
	r.markInterestedCalled = true
	return nil
}

func (r *eventsRepoStub) MarkEventUninterested(context.Context, string, string) error {
	r.markUninterestedCalled = true
	return nil
}

func (r *eventsRepoStub) JoinEvent(_ context.Context, input eventsrepo.JoinEventInput) (eventsrepo.EventParticipant, error) {
	r.joinInput = input
	return eventsrepo.EventParticipant{
		ID:              "550e8400-e29b-41d4-a716-446655443999",
		EventID:         input.EventID,
		UserID:          input.UserID,
		Role:            "participant",
		Status:          input.Status,
		ParticipantNote: input.ParticipantNote,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}, nil
}

func (r *eventsRepoStub) LeaveEvent(context.Context, string, string) error {
	r.leftStatus = "left"
	return nil
}

func (r *eventsRepoStub) GetParticipant(context.Context, string, string) (eventsrepo.EventParticipant, error) {
	return r.participant, nil
}

func (r *eventsRepoStub) GetAttendee(context.Context, string, string) (eventsrepo.EventAttendee, error) {
	return r.participant, nil
}

func (r *eventsRepoStub) ListParticipants(context.Context, string, eventsrepo.ListParticipantsInput) ([]eventsrepo.EventParticipant, int, error) {
	return nil, 0, nil
}

func (r *eventsRepoStub) ListAttendees(context.Context, string, int, int) ([]eventsrepo.EventAttendee, int, error) {
	return nil, 0, nil
}

func (r *eventsRepoStub) ApproveParticipant(context.Context, string, string, string) (eventsrepo.EventParticipant, error) {
	return r.participant, nil
}

func (r *eventsRepoStub) RejectParticipant(context.Context, string, string, string) (eventsrepo.EventParticipant, error) {
	return r.participant, nil
}

func (r *eventsRepoStub) ListPaymentMethods(context.Context, string, bool) ([]eventsrepo.EventPaymentMethod, error) {
	return nil, nil
}

func (r *eventsRepoStub) CreatePaymentMethod(context.Context, string, eventsrepo.CreatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	return eventsrepo.EventPaymentMethod{}, nil
}

func (r *eventsRepoStub) UpdatePaymentMethod(_ context.Context, _ string, input eventsrepo.UpdatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	r.updatePaymentMethodInput = input
	return eventsrepo.EventPaymentMethod{}, nil
}

func (r *eventsRepoStub) SubmitPayment(context.Context, eventsrepo.SubmitPaymentInput) (eventsrepo.EventParticipantPayment, error) {
	return eventsrepo.EventParticipantPayment{}, nil
}

func (r *eventsRepoStub) ReviewPayment(context.Context, string, string, string, string, string) (eventsrepo.EventParticipantPayment, error) {
	return eventsrepo.EventParticipantPayment{}, nil
}

func (r *eventsRepoStub) GetPaymentProof(context.Context, string, string) (eventsrepo.EventPaymentProof, error) {
	if r.proofErr != nil {
		return eventsrepo.EventPaymentProof{}, r.proofErr
	}
	return r.proof, nil
}

func (r *eventsRepoStub) ListCompetitions(context.Context, string) ([]eventsrepo.EventCompetition, error) {
	return r.competitions, nil
}

func (r *eventsRepoStub) CreateCompetition(_ context.Context, eventID string, input eventsrepo.CreateCompetitionInput) (eventsrepo.EventCompetition, error) {
	r.competitionInput = input
	return eventsrepo.EventCompetition{ID: "550e8400-e29b-41d4-a716-446655444001", EventID: eventID, Name: input.Name}, nil
}

func (r *eventsRepoStub) UpdateCompetition(context.Context, string, eventsrepo.UpdateCompetitionInput) (eventsrepo.EventCompetition, error) {
	return eventsrepo.EventCompetition{}, nil
}

func (r *eventsRepoStub) DeleteCompetition(context.Context, string, string) error {
	return nil
}

func (r *eventsRepoStub) ListPrizes(context.Context, string) ([]eventsrepo.EventPrize, error) {
	return r.prizes, nil
}

func (r *eventsRepoStub) CreatePrize(_ context.Context, eventID string, input eventsrepo.CreatePrizeInput) (eventsrepo.EventPrize, error) {
	r.prizeInput = input
	return eventsrepo.EventPrize{ID: "550e8400-e29b-41d4-a716-446655444002", EventID: eventID, Title: input.Title, Placement: input.Placement, Currency: input.Currency}, nil
}

func (r *eventsRepoStub) UpdatePrize(context.Context, string, eventsrepo.UpdatePrizeInput) (eventsrepo.EventPrize, error) {
	return eventsrepo.EventPrize{}, nil
}

func (r *eventsRepoStub) DeletePrize(context.Context, string, string) error {
	return nil
}

func (r *eventsRepoStub) CompetitionBelongsToEvent(context.Context, string, string) (bool, error) {
	if r.competitionBelongsSet {
		return r.competitionBelongs, nil
	}
	return true, nil
}

func (r *eventsRepoStub) SponsorBelongsToEvent(context.Context, string, string) (bool, error) {
	if r.sponsorBelongsSet {
		return r.sponsorBelongs, nil
	}
	return true, nil
}

func (r *eventsRepoStub) MediaBelongsToEvent(context.Context, string, string) (bool, error) {
	if r.mediaBelongsSet {
		return r.mediaBelongs, nil
	}
	return true, nil
}

func (r *eventsRepoStub) ListSponsors(context.Context, string) ([]eventsrepo.EventSponsor, error) {
	return r.sponsors, nil
}

func (r *eventsRepoStub) CreateSponsor(_ context.Context, eventID string, input eventsrepo.CreateSponsorInput) (eventsrepo.EventSponsor, error) {
	r.sponsorInput = input
	return eventsrepo.EventSponsor{ID: "550e8400-e29b-41d4-a716-446655444003", EventID: eventID, Name: input.Name, IsActive: input.IsActive}, nil
}

func (r *eventsRepoStub) UpdateSponsor(context.Context, string, eventsrepo.UpdateSponsorInput) (eventsrepo.EventSponsor, error) {
	return eventsrepo.EventSponsor{}, nil
}

func (r *eventsRepoStub) DeleteSponsor(context.Context, string, string) error {
	return nil
}

func (r *eventsRepoStub) ListPosts(context.Context, string, bool) ([]eventsrepo.EventPost, error) {
	return r.posts, nil
}

func (r *eventsRepoStub) GetPost(context.Context, string, string) (eventsrepo.EventPost, error) {
	return r.post, nil
}

func (r *eventsRepoStub) CreatePost(_ context.Context, eventID, authorUserID string, input eventsrepo.CreatePostInput) (eventsrepo.EventPost, error) {
	r.postInput = input
	return eventsrepo.EventPost{ID: "550e8400-e29b-41d4-a716-446655444004", EventID: eventID, AuthorUserID: authorUserID, BodyMarkdown: input.BodyMarkdown, Status: "published"}, nil
}

func (r *eventsRepoStub) UpdatePost(context.Context, string, eventsrepo.UpdatePostInput) (eventsrepo.EventPost, error) {
	return r.post, nil
}

func (r *eventsRepoStub) DeletePost(context.Context, string, string) error {
	return nil
}

func (r *eventsRepoStub) UpdateParticipantRole(_ context.Context, _ string, _ string, role string, _ string) (eventsrepo.EventParticipant, error) {
	if r.roleErr != nil {
		return eventsrepo.EventParticipant{}, r.roleErr
	}
	r.roleUpdate = role
	r.participant.Role = role
	return r.participant, nil
}

func (r *eventsRepoStub) GetEventPassByToken(context.Context, string, string) (eventsrepo.EventPass, error) {
	if r.passErr != nil {
		return eventsrepo.EventPass{}, r.passErr
	}
	return eventsrepo.EventPass{Event: r.event, Participant: r.participant}, nil
}

func (r *eventsRepoStub) RegenerateParticipantPass(context.Context, string, string) (eventsrepo.EventParticipant, error) {
	return r.participant, nil
}

func (r *eventsRepoStub) CheckInEventPass(_ context.Context, _ string, _ string, actorID string) (eventsrepo.EventPass, error) {
	r.checkInCalled = true
	if r.passErr != nil {
		return eventsrepo.EventPass{}, r.passErr
	}
	now := time.Date(2026, 5, 23, 8, 0, 0, 0, time.UTC)
	r.participant.CheckedInAt = &now
	r.participant.CheckedInBy = actorID
	return eventsrepo.EventPass{Event: r.event, Participant: r.participant}, nil
}

func signedProofTestService(repo *eventsRepoStub) *Service {
	fixedNow := time.Date(2026, 5, 22, 12, 0, 0, 0, time.UTC)
	return New(
		repo,
		WithNow(func() time.Time { return fixedNow }),
		WithPaymentProofSigning("https://cdn.example.com", "test-secret", 1),
	)
}

func assertAppErrorStatus(t *testing.T, err error, want int) {
	t.Helper()
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected app error status %d, got %v", want, err)
	}
	if appErr.Status != want {
		t.Fatalf("expected status %d, got %d (%v)", want, appErr.Status, err)
	}
}

func assertValidationFailure(t *testing.T, err error) {
	t.Helper()
	var validationErr ValidationFailure
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected validation failure, got %v", err)
	}
	if len(validationErr.Issues) == 0 {
		t.Fatalf("expected validation issues, got none")
	}
}

type eventsActivityStub struct{}

func (eventsActivityStub) PublishActivity(context.Context, feedservice.ActivityPublishInput) error {
	return nil
}

func (eventsActivityStub) MarkActivityBySource(context.Context, string, string, string, feedservice.ActivityState) error {
	return nil
}

type eventsNotificationStub struct {
	createdForGroup []notificationsservice.EventCreatedForGroupInput
	attendeeJoined  []notificationsservice.EventAttendeeJoinedInput
	updated         []notificationsservice.EventUpdatedInput
	cancelled       []notificationsservice.EventCancelledInput
}

func (s *eventsNotificationStub) NotifyEventCreatedForGroup(_ context.Context, input notificationsservice.EventCreatedForGroupInput) error {
	s.createdForGroup = append(s.createdForGroup, input)
	return nil
}

func (s *eventsNotificationStub) NotifyEventAttendeeJoined(_ context.Context, input notificationsservice.EventAttendeeJoinedInput) error {
	s.attendeeJoined = append(s.attendeeJoined, input)
	return nil
}

func (s *eventsNotificationStub) NotifyEventUpdated(_ context.Context, input notificationsservice.EventUpdatedInput) error {
	s.updated = append(s.updated, input)
	return nil
}

func (s *eventsNotificationStub) NotifyEventCancelled(_ context.Context, input notificationsservice.EventCancelledInput) error {
	s.cancelled = append(s.cancelled, input)
	return nil
}

func ptr[T any](value T) *T {
	return &value
}
