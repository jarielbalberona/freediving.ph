package service

import (
	"context"
	"testing"
	"time"

	eventsrepo "fphgo/internal/features/events/repo"
	feedservice "fphgo/internal/features/feed/service"
	notificationsservice "fphgo/internal/features/notifications/service"
)

func TestJoinEventNotifiesOrganizer(t *testing.T) {
	const (
		eventID     = "550e8400-e29b-41d4-a716-446655443001"
		organizerID = "550e8400-e29b-41d4-a716-446655443002"
		attendeeID  = "550e8400-e29b-41d4-a716-446655443003"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:              eventID,
			Title:           "Depth session",
			Status:          "published",
			Visibility:      "public",
			OrganizerUserID: organizerID,
		},
		attendee: eventsrepo.EventAttendee{
			EventID: eventID,
			UserID:  attendeeID,
			Role:    "attendee",
			Status:  "active",
		},
	}
	notifications := &eventsNotificationCapture{}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.JoinEvent(context.Background(), eventID, attendeeID, ""); err != nil {
		t.Fatalf("JoinEvent returned error: %v", err)
	}
	if len(notifications.attendeeJoined) != 1 {
		t.Fatalf("expected attendee joined notification trigger, got %d", len(notifications.attendeeJoined))
	}
	got := notifications.attendeeJoined[0]
	if got.OrganizerUserID != organizerID || got.AttendeeUserID != attendeeID || got.EventID != eventID {
		t.Fatalf("unexpected notification input: %+v", got)
	}
}

func TestUpdateEventNotifiesOnlyMeaningfulUpdates(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443011"
		actorID = "550e8400-e29b-41d4-a716-446655443012"
	)
	start := time.Now().UTC().Add(24 * time.Hour)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Title:      "Pool session",
			Status:     "published",
			Visibility: "public",
			StartsAt:   &start,
			Location:   "Old pool",
		},
		updatedEvent: eventsrepo.Event{
			ID:          eventID,
			Title:       "Pool session copy edit",
			Description: "Better description",
			Status:      "published",
			Visibility:  "public",
			StartsAt:    &start,
			Location:    "Old pool",
			UpdatedAt:   time.Now().UTC(),
		},
	}
	notifications := &eventsNotificationCapture{}
	svc := New(repo, WithNotifications(notifications))

	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{Description: strPtr("Better description")}); err != nil {
		t.Fatalf("UpdateEvent returned error: %v", err)
	}
	if len(notifications.updated) != 0 {
		t.Fatalf("expected copy edit not to notify attendees, got %d", len(notifications.updated))
	}

	later := start.Add(time.Hour)
	repo.updatedEvent.StartsAt = &later
	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{StartsAt: &later}); err != nil {
		t.Fatalf("UpdateEvent time change returned error: %v", err)
	}
	if len(notifications.updated) != 1 {
		t.Fatalf("expected meaningful update notification, got %d", len(notifications.updated))
	}
}

func TestUpdateEventCancellationNotifiesAttendees(t *testing.T) {
	const (
		eventID = "550e8400-e29b-41d4-a716-446655443021"
		actorID = "550e8400-e29b-41d4-a716-446655443022"
	)
	repo := &eventsRepoStub{
		event: eventsrepo.Event{
			ID:         eventID,
			Title:      "Line session",
			Status:     "published",
			Visibility: "public",
		},
		updatedEvent: eventsrepo.Event{
			ID:         eventID,
			Title:      "Line session",
			Status:     "cancelled",
			Visibility: "public",
			UpdatedAt:  time.Now().UTC(),
		},
	}
	notifications := &eventsNotificationCapture{}
	svc := New(repo, WithNotifications(notifications))
	status := "cancelled"

	if _, err := svc.UpdateEvent(context.Background(), eventID, actorID, eventsrepo.UpdateEventInput{Status: &status}); err != nil {
		t.Fatalf("UpdateEvent cancellation returned error: %v", err)
	}
	if len(notifications.cancelled) != 1 {
		t.Fatalf("expected cancellation notification trigger, got %d", len(notifications.cancelled))
	}
}

type eventsNotificationCapture struct {
	createdForGroup []notificationsservice.EventCreatedForGroupInput
	attendeeJoined  []notificationsservice.EventAttendeeJoinedInput
	updated         []notificationsservice.EventUpdatedInput
	cancelled       []notificationsservice.EventCancelledInput
}

func (c *eventsNotificationCapture) NotifyEventCreatedForGroup(_ context.Context, input notificationsservice.EventCreatedForGroupInput) error {
	c.createdForGroup = append(c.createdForGroup, input)
	return nil
}

func (c *eventsNotificationCapture) NotifyEventAttendeeJoined(_ context.Context, input notificationsservice.EventAttendeeJoinedInput) error {
	c.attendeeJoined = append(c.attendeeJoined, input)
	return nil
}

func (c *eventsNotificationCapture) NotifyEventUpdated(_ context.Context, input notificationsservice.EventUpdatedInput) error {
	c.updated = append(c.updated, input)
	return nil
}

func (c *eventsNotificationCapture) NotifyEventCancelled(_ context.Context, input notificationsservice.EventCancelledInput) error {
	c.cancelled = append(c.cancelled, input)
	return nil
}

type eventsRepoStub struct {
	event        eventsrepo.Event
	updatedEvent eventsrepo.Event
	attendee     eventsrepo.EventAttendee
}

func (r *eventsRepoStub) ListEvents(context.Context, eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	return nil, 0, nil
}

func (r *eventsRepoStub) GetEventByID(context.Context, string, string) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) CreateEvent(context.Context, eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	return r.event, nil
}

func (r *eventsRepoStub) AddOrganizerMembership(context.Context, string, string) error { return nil }

func (r *eventsRepoStub) UpdateEvent(context.Context, eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
	return r.updatedEvent, nil
}

func (r *eventsRepoStub) GetGroupRole(context.Context, string, string) (string, error) {
	return "owner", nil
}

func (r *eventsRepoStub) UpsertAttendee(context.Context, string, string, string, string, string) (eventsrepo.EventAttendee, error) {
	return r.attendee, nil
}

func (r *eventsRepoStub) LeaveEvent(context.Context, string, string) error { return nil }

func (r *eventsRepoStub) GetAttendee(context.Context, string, string) (eventsrepo.EventAttendee, error) {
	return r.attendee, nil
}

func (r *eventsRepoStub) ListAttendees(context.Context, string, int, int) ([]eventsrepo.EventAttendee, int, error) {
	return nil, 0, nil
}

type eventsActivityStub struct{}

func (eventsActivityStub) PublishActivity(context.Context, feedservice.ActivityPublishInput) error {
	return nil
}

func (eventsActivityStub) MarkActivityBySource(context.Context, string, string, string, feedservice.ActivityState) error {
	return nil
}

func strPtr(value string) *string { return &value }
