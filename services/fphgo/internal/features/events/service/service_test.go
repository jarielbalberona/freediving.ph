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
			Title:            "Mabini line training",
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

func TestGetEventBySlugRejectsUnauthorizedPrivateViewer(t *testing.T) {
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

	_, err := svc.GetEventBySlug(context.Background(), "private-depth-training", "550e8400-e29b-41d4-a716-446655443062")
	assertAppErrorStatus(t, err, http.StatusForbidden)
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

func TestCreatePaidEventRequiresPaymentMethods(t *testing.T) {
	const actorID = "550e8400-e29b-41d4-a716-446655443043"
	start := time.Now().UTC().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	repo := &eventsRepoStub{}
	svc := New(repo)
	capacity := 8
	price := 1500.0

	_, err := svc.CreateEvent(context.Background(), actorID, eventsrepo.CreateEventInput{
		Title:               "Depth training",
		ShortDescription:    "Depth session",
		DescriptionMarkdown: "Depth training details.",
		EventType:           "depth_training",
		DiveSiteID:          "550e8400-e29b-41d4-a716-446655443044",
		StartsAt:            &start,
		EndsAt:              &end,
		Capacity:            &capacity,
		Visibility:          "public",
		Difficulty:          "advanced",
		IsPaid:              true,
		PriceAmount:         &price,
	})
	if err == nil {
		t.Fatalf("expected paid event without payment methods to fail")
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

func TestUpdateEventRejectsPaidToggleWithoutPrice(t *testing.T) {
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
	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{IsPaid: &isPaid}); err == nil {
		t.Fatalf("expected paid toggle without price to be rejected")
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

type eventsRepoStub struct {
	event                    eventsrepo.Event
	updatedEvent             eventsrepo.Event
	participant              eventsrepo.EventParticipant
	proof                    eventsrepo.EventPaymentProof
	proofErr                 error
	joinInput                eventsrepo.JoinEventInput
	updatePaymentMethodInput eventsrepo.UpdatePaymentMethodInput
	leftStatus               string
	markInterestedCalled     bool
	markUninterestedCalled   bool
	canManage                bool
	canManageSet             bool
}

func (r *eventsRepoStub) ListEvents(context.Context, eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	return nil, 0, nil
}

func (r *eventsRepoStub) GetEventByID(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) GetEventBySlug(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) CreateEvent(context.Context, eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) UpdateEvent(context.Context, eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
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
