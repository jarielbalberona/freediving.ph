package service

import (
	"context"
	"errors"
	"testing"
	"time"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	"fphgo/internal/realtime/ws"
)

func TestValidateCreateInputRejectsInvalidValues(t *testing.T) {
	issues := validateCreateInput(CreateInput{
		UserID:   "not-a-uuid",
		Type:     "INVALID",
		Title:    "",
		Message:  "",
		Priority: "BAD",
	})
	if len(issues) < 5 {
		t.Fatalf("expected multiple validation issues, got %d", len(issues))
	}
}

func TestValidateCreateInputRejectsExternalActionURL(t *testing.T) {
	for _, actionURL := range []string{"https://example.com/private", "http://example.com/private", "//example.com/private", "javascript:alert(1)"} {
		t.Run(actionURL, func(t *testing.T) {
			issues := validateCreateInput(CreateInput{
				UserID:    "550e8400-e29b-41d4-a716-446655440001",
				Type:      "SYSTEM",
				Title:     "Test",
				Message:   "Body",
				ActionURL: ptr(actionURL),
			})
			if len(issues) != 1 || issues[0].Path[0] != "actionUrl" {
				t.Fatalf("expected actionUrl validation issue, got %+v", issues)
			}
		})
	}
}

func TestValidateCreateInputAcceptsAppRelativeActionURL(t *testing.T) {
	issues := validateCreateInput(CreateInput{
		UserID:    "550e8400-e29b-41d4-a716-446655440001",
		Type:      "SYSTEM",
		Title:     "Test",
		Message:   "Body",
		ActionURL: ptr("/explore/sites/reef-point"),
	})
	if len(issues) != 0 {
		t.Fatalf("expected no validation issues for safe app-relative action URL, got %+v", issues)
	}
}

func TestValidateInternalCreateInputRejectsProtocolRelativeActionURL(t *testing.T) {
	issues := validateInternalCreateInput(InternalCreateInput{
		RecipientUserIDs: []string{"550e8400-e29b-41d4-a716-446655440001"},
		Type:             "SYSTEM",
		Title:            "Test",
		Message:          "Body",
		ActionURL:        "//example.com/private",
	})
	if len(issues) != 1 || issues[0].Path[0] != "actionUrl" {
		t.Fatalf("expected actionUrl validation issue, got %+v", issues)
	}
}

func TestValidateListInputRejectsOutOfRangePaging(t *testing.T) {
	issues := validateListInput(ListInput{
		Limit:    0,
		Offset:   -1,
		Status:   ptr("NOPE"),
		Type:     ptr("NOPE"),
		Priority: ptr("NOPE"),
	})
	if len(issues) != 5 {
		t.Fatalf("expected 5 issues, got %d", len(issues))
	}
}

func TestValidateSettingsInputRejectsDigestFrequency(t *testing.T) {
	issues := validateSettingsInput(UpdateSettingsInput{
		DigestFrequency: ptr("YEARLY"),
	})
	if len(issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(issues))
	}
}

func TestCreateInternalPersistsAndEmitsOnlyIntendedRecipient(t *testing.T) {
	repo := newNotificationRepoStub()
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))
	recipientID := "550e8400-e29b-41d4-a716-446655440001"

	created, err := svc.CreateInternal(context.Background(), InternalCreateInput{
		RecipientUserIDs:  []string{recipientID},
		Type:              "SYSTEM",
		Category:          "system",
		Title:             "Test notification",
		Message:           "This is persisted first.",
		RelatedEntityType: "test",
		RelatedEntityID:   "entity-1",
		ActionURL:         "/notifications",
		IdempotencyKey:    "test:notification:1",
	})
	if err != nil {
		t.Fatalf("CreateInternal returned error: %v", err)
	}
	if len(created) != 1 {
		t.Fatalf("expected one created notification, got %d", len(created))
	}
	if repo.created[0].UserID != recipientID {
		t.Fatalf("expected persisted recipient %s, got %s", recipientID, repo.created[0].UserID)
	}
	if len(broadcaster.targets) != 1 || broadcaster.targets[0][0] != recipientID {
		t.Fatalf("expected targeted realtime to recipient, got %#v", broadcaster.targets)
	}

	unread, err := svc.GetUnreadCount(context.Background(), recipientID)
	if err != nil {
		t.Fatalf("GetUnreadCount returned error: %v", err)
	}
	if unread != 1 {
		t.Fatalf("expected unread count 1, got %d", unread)
	}

	if _, err := svc.MarkAsRead(context.Background(), recipientID, created[0].ID); err != nil {
		t.Fatalf("MarkAsRead returned error: %v", err)
	}
	unread, err = svc.GetUnreadCount(context.Background(), recipientID)
	if err != nil {
		t.Fatalf("GetUnreadCount after read returned error: %v", err)
	}
	if unread != 0 {
		t.Fatalf("expected unread count 0 after mark read, got %d", unread)
	}
}

func TestNotifyDiveSiteApprovedFansOutToOptedInUsersAndExcludesSubmitterFromPublicAnnouncement(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	optedInID := "550e8400-e29b-41d4-a716-446655440002"
	repo.newDiveSiteRecipients = []string{
		submitterID,
		optedInID,
		"550e8400-e29b-41d4-a716-446655440003", // omitted by repo to represent opted-out/inactive filtering in DB.
	}
	repo.excludedNewDiveSiteRecipientIDs = map[string]bool{
		submitterID:                            true,
		"550e8400-e29b-41d4-a716-446655440003": true,
	}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))

	err := svc.NotifyDiveSiteApproved(context.Background(), DiveSiteApprovedInput{
		SiteID:          "site-1",
		Slug:            "reef-point",
		Name:            "Reef Point",
		Area:            "Batangas",
		SubmitterUserID: submitterID,
		ReviewerUserID:  "550e8400-e29b-41d4-a716-446655440099",
	})
	if err != nil {
		t.Fatalf("NotifyDiveSiteApproved returned error: %v", err)
	}

	var submitterApproval, publicAnnouncement int
	for _, input := range repo.created {
		switch input.Type {
		case "SYSTEM":
			if input.UserID == submitterID && input.Category == "explore" {
				submitterApproval++
			}
		case "NEW_DIVE_SITE_PUBLISHED":
			publicAnnouncement++
			if input.UserID == submitterID {
				t.Fatal("submitter should not receive duplicate public announcement")
			}
			if input.UserID != optedInID {
				t.Fatalf("unexpected public announcement recipient %s", input.UserID)
			}
			if _, ok := input.Metadata["reviewerNotes"]; ok {
				t.Fatal("public notification metadata leaked moderation fields")
			}
		}
	}
	if submitterApproval != 1 {
		t.Fatalf("expected one submitter approval notification, got %d", submitterApproval)
	}
	if publicAnnouncement != 1 {
		t.Fatalf("expected one public announcement, got %d", publicAnnouncement)
	}
	if len(broadcaster.targets) != 2 {
		t.Fatalf("expected two targeted realtime emissions, got %d", len(broadcaster.targets))
	}
}

func TestNotifyDiveSiteApprovedIsIdempotentOnRetry(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	recipientID := "550e8400-e29b-41d4-a716-446655440002"
	secondRecipientID := "550e8400-e29b-41d4-a716-446655440003"
	repo.newDiveSiteRecipients = []string{recipientID, secondRecipientID}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))
	input := DiveSiteApprovedInput{
		SiteID:          "site-1",
		Slug:            "reef-point",
		Name:            "Reef Point",
		Area:            "Batangas",
		SubmitterUserID: submitterID,
		ReviewerUserID:  "550e8400-e29b-41d4-a716-446655440099",
	}

	if err := svc.NotifyDiveSiteApproved(context.Background(), input); err != nil {
		t.Fatalf("first approval notification returned error: %v", err)
	}
	createdAfterFirst := len(repo.notifications)
	emitsAfterFirst := len(broadcaster.targets)
	repo.newDiveSiteRecipients = []string{recipientID}
	if err := svc.NotifyDiveSiteApproved(context.Background(), input); err != nil {
		t.Fatalf("retry approval notification returned error: %v", err)
	}
	if len(repo.notifications) != createdAfterFirst {
		t.Fatalf("expected no duplicate rows on retry, got %d then %d", createdAfterFirst, len(repo.notifications))
	}
	if len(broadcaster.targets) != emitsAfterFirst {
		t.Fatalf("expected no duplicate realtime emit on retry, got %d then %d", emitsAfterFirst, len(broadcaster.targets))
	}
}

func TestProcessDueOutboxCreatesDiveSiteNotificationsAndMarksProcessed(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	recipientID := "550e8400-e29b-41d4-a716-446655440002"
	repo.newDiveSiteRecipients = []string{recipientID}
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{newDiveSiteOutboxEvent(1, submitterID)}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))

	result, err := svc.ProcessDueOutbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("ProcessDueOutbox returned error: %v", err)
	}
	if result.Claimed != 1 || result.Processed != 1 || result.Retried != 0 || result.Failed != 0 {
		t.Fatalf("unexpected process result: %+v", result)
	}
	if len(repo.processedOutboxIDs) != 1 || repo.processedOutboxIDs[0] != repo.claimedOutbox[0].ID {
		t.Fatalf("expected outbox marked processed, got %#v", repo.processedOutboxIDs)
	}

	var submitterApproval, publicAnnouncement int
	for _, input := range repo.created {
		switch input.Type {
		case "SYSTEM":
			if input.UserID == submitterID {
				submitterApproval++
			}
		case "NEW_DIVE_SITE_PUBLISHED":
			publicAnnouncement++
			if input.UserID == submitterID {
				t.Fatal("submitter should not receive public announcement from outbox processor")
			}
		}
	}
	if submitterApproval != 1 || publicAnnouncement != 1 {
		t.Fatalf("expected submitter approval and public notification, got submitter=%d public=%d", submitterApproval, publicAnnouncement)
	}
	if len(broadcaster.targets) != 2 {
		t.Fatalf("expected two realtime emissions after persistence, got %d", len(broadcaster.targets))
	}
}

func TestProcessDueOutboxRetriesOnFailureWithBackoff(t *testing.T) {
	repo := newNotificationRepoStub()
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{newDiveSiteOutboxEvent(1, "550e8400-e29b-41d4-a716-446655440001")}
	repo.failCreateForUser = map[string]error{
		"550e8400-e29b-41d4-a716-446655440001": errors.New("database unavailable"),
	}
	svc := New(repo)

	start := time.Now().UTC()
	result, err := svc.ProcessDueOutbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("ProcessDueOutbox returned error: %v", err)
	}
	if result.Claimed != 1 || result.Retried != 1 || result.Processed != 0 {
		t.Fatalf("unexpected process result: %+v", result)
	}
	if len(repo.retryOutbox) != 1 {
		t.Fatalf("expected retry scheduled, got %#v", repo.retryOutbox)
	}
	if repo.retryOutbox[0].nextRetryAt.Before(start.Add(50 * time.Second)) {
		t.Fatalf("expected first retry roughly one minute later, got %s", repo.retryOutbox[0].nextRetryAt)
	}
	if repo.retryOutbox[0].lastError == "" {
		t.Fatal("expected retry to record last error")
	}
}

func TestProcessDueOutboxMarksFailedAfterMaxAttempts(t *testing.T) {
	repo := newNotificationRepoStub()
	event := newDiveSiteOutboxEvent(maxOutboxAttempts, "550e8400-e29b-41d4-a716-446655440001")
	event.Payload["name"] = ""
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{event}
	svc := New(repo)

	result, err := svc.ProcessDueOutbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("ProcessDueOutbox returned error: %v", err)
	}
	if result.Claimed != 1 || result.Failed != 1 || result.Retried != 0 || result.Processed != 0 {
		t.Fatalf("unexpected process result: %+v", result)
	}
	if len(repo.failedOutboxIDs) != 1 || repo.failedOutboxIDs[0] != event.ID {
		t.Fatalf("expected event marked failed, got %#v", repo.failedOutboxIDs)
	}
}

func TestProcessDueOutboxDoesNotDuplicateNotificationsAfterPartialFailureRetry(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	recipientID := "550e8400-e29b-41d4-a716-446655440002"
	secondRecipientID := "550e8400-e29b-41d4-a716-446655440003"
	repo.newDiveSiteRecipients = []string{recipientID, secondRecipientID}
	repo.failCreateForUserOnce = map[string]error{
		secondRecipientID: errors.New("transient insert failure"),
	}
	event := newDiveSiteOutboxEvent(1, submitterID)
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{event}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))

	first, err := svc.ProcessDueOutbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("first ProcessDueOutbox returned error: %v", err)
	}
	if first.Retried != 1 || first.Processed != 0 {
		t.Fatalf("expected first attempt to retry after partial failure, got %+v", first)
	}
	if len(repo.notifications) != 2 {
		t.Fatalf("expected submitter and first public notification before failure, got %d", len(repo.notifications))
	}
	emitsAfterFirst := len(broadcaster.targets)

	event.Attempts = 2
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{event}
	second, err := svc.ProcessDueOutbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("second ProcessDueOutbox returned error: %v", err)
	}
	if second.Processed != 1 || second.Retried != 0 {
		t.Fatalf("expected retry to process successfully, got %+v", second)
	}
	if len(repo.notifications) != 3 {
		t.Fatalf("expected retry to create only missing recipient notification, got %d rows", len(repo.notifications))
	}
	if len(broadcaster.targets) != emitsAfterFirst+1 {
		t.Fatalf("expected retry to emit only missing notification, got %d then %d", emitsAfterFirst, len(broadcaster.targets))
	}
}

type notificationRepoStub struct {
	notifications                        []notificationsrepo.Notification
	created                              []notificationsrepo.CreateInput
	nextID                               int64
	newDiveSiteRecipients                []string
	excludedNewDiveSiteRecipientIDs      map[string]bool
	notificationsByUserAndIdempotencyKey map[string]notificationsrepo.Notification
	claimedOutbox                        []notificationsrepo.NotificationOutbox
	processedOutboxIDs                   []string
	retryOutbox                          []outboxRetry
	failedOutboxIDs                      []string
	failCreateForUser                    map[string]error
	failCreateForUserOnce                map[string]error
}

func newNotificationRepoStub() *notificationRepoStub {
	return &notificationRepoStub{
		nextID:                               1,
		notificationsByUserAndIdempotencyKey: map[string]notificationsrepo.Notification{},
	}
}

func (r *notificationRepoStub) Create(_ context.Context, input notificationsrepo.CreateInput) (notificationsrepo.Notification, error) {
	if err, ok := r.failCreateForUser[input.UserID]; ok {
		return notificationsrepo.Notification{}, err
	}
	if err, ok := r.failCreateForUserOnce[input.UserID]; ok {
		delete(r.failCreateForUserOnce, input.UserID)
		return notificationsrepo.Notification{}, err
	}
	key := input.UserID + ":" + derefString(input.IdempotencyKey)
	if input.IdempotencyKey != nil {
		if existing, ok := r.notificationsByUserAndIdempotencyKey[key]; ok {
			existing.Deduplicated = true
			return existing, nil
		}
	}
	now := time.Now().UTC()
	item := notificationsrepo.Notification{
		ID:                r.nextID,
		UserID:            input.UserID,
		Type:              input.Type,
		Category:          input.Category,
		Title:             input.Title,
		Message:           input.Message,
		Status:            "UNREAD",
		Priority:          input.Priority,
		ActorUserID:       input.ActorUserID,
		RelatedUserID:     input.RelatedUserID,
		RelatedEntityType: input.RelatedEntityType,
		RelatedEntityID:   input.RelatedEntityID,
		ImageURL:          input.ImageURL,
		ActionURL:         input.ActionURL,
		Metadata:          input.Metadata,
		IdempotencyKey:    input.IdempotencyKey,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	r.nextID++
	r.created = append(r.created, input)
	r.notifications = append(r.notifications, item)
	if input.IdempotencyKey != nil {
		r.notificationsByUserAndIdempotencyKey[key] = item
	}
	return item, nil
}

func (r *notificationRepoStub) ListByUser(_ context.Context, input notificationsrepo.ListInput) ([]notificationsrepo.Notification, error) {
	items := make([]notificationsrepo.Notification, 0)
	for _, item := range r.notifications {
		if item.UserID == input.UserID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (r *notificationRepoStub) GetByIDForUser(_ context.Context, userID string, notificationID int64) (notificationsrepo.Notification, error) {
	for _, item := range r.notifications {
		if item.UserID == userID && item.ID == notificationID {
			return item, nil
		}
	}
	return notificationsrepo.Notification{}, nil
}

func (r *notificationRepoStub) MarkReadForUser(_ context.Context, userID string, notificationID int64) (notificationsrepo.Notification, error) {
	for i, item := range r.notifications {
		if item.UserID == userID && item.ID == notificationID {
			now := time.Now().UTC()
			r.notifications[i].Status = "READ"
			r.notifications[i].ReadAt = &now
			return r.notifications[i], nil
		}
	}
	return notificationsrepo.Notification{}, nil
}

func (r *notificationRepoStub) MarkAllReadForUser(_ context.Context, userID string) (int64, error) {
	var count int64
	for i, item := range r.notifications {
		if item.UserID == userID && item.Status == "UNREAD" {
			r.notifications[i].Status = "READ"
			count++
		}
	}
	return count, nil
}

func (r *notificationRepoStub) DeleteForUser(context.Context, string, int64) error { return nil }

func (r *notificationRepoStub) CountByStatusForUser(_ context.Context, userID string, status string) (int64, error) {
	var count int64
	for _, item := range r.notifications {
		if item.UserID == userID && item.Status == status {
			count++
		}
	}
	return count, nil
}

func (r *notificationRepoStub) CountVisibleForUser(_ context.Context, userID string) (int64, error) {
	var count int64
	for _, item := range r.notifications {
		if item.UserID == userID && item.Status != "DELETED" {
			count++
		}
	}
	return count, nil
}

func (r *notificationRepoStub) GetSettingsForUser(context.Context, string) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}

func (r *notificationRepoStub) CreateDefaultSettingsForUser(context.Context, string) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}

func (r *notificationRepoStub) UpdateSettingsForUser(context.Context, string, notificationsrepo.SettingsUpdateInput) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}

func (r *notificationRepoStub) ListActiveNewDiveSiteRecipients(_ context.Context, excludeUserID string) ([]string, error) {
	recipients := make([]string, 0, len(r.newDiveSiteRecipients))
	for _, userID := range r.newDiveSiteRecipients {
		if userID == excludeUserID || r.excludedNewDiveSiteRecipientIDs[userID] {
			continue
		}
		recipients = append(recipients, userID)
	}
	return recipients, nil
}

func (r *notificationRepoStub) ClaimPendingOutbox(context.Context, time.Time, int) ([]notificationsrepo.NotificationOutbox, error) {
	return r.claimedOutbox, nil
}

func (r *notificationRepoStub) MarkOutboxProcessed(_ context.Context, id string) error {
	r.processedOutboxIDs = append(r.processedOutboxIDs, id)
	return nil
}

func (r *notificationRepoStub) MarkOutboxRetry(_ context.Context, id string, nextRetryAt time.Time, lastError string) error {
	r.retryOutbox = append(r.retryOutbox, outboxRetry{id: id, nextRetryAt: nextRetryAt, lastError: lastError})
	return nil
}

func (r *notificationRepoStub) MarkOutboxFailed(_ context.Context, id string, _ string) error {
	r.failedOutboxIDs = append(r.failedOutboxIDs, id)
	return nil
}

type outboxRetry struct {
	id          string
	nextRetryAt time.Time
	lastError   string
}

type notificationBroadcasterStub struct {
	targets [][]string
	events  []ws.Envelope
}

func (b *notificationBroadcasterStub) BroadcastEnvelopeToUsers(userIDs []string, env ws.Envelope) {
	b.targets = append(b.targets, append([]string{}, userIDs...))
	b.events = append(b.events, env)
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func ptr[T any](v T) *T { return &v }

func newDiveSiteOutboxEvent(attempts int, submitterID string) notificationsrepo.NotificationOutbox {
	return notificationsrepo.NotificationOutbox{
		ID:        "660e8400-e29b-41d4-a716-446655440000",
		EventType: notificationsrepo.OutboxEventNewDiveSitePublished,
		Attempts:  attempts,
		Payload: map[string]any{
			"siteId":          "770e8400-e29b-41d4-a716-446655440000",
			"slug":            "reef-point",
			"name":            "Reef Point",
			"area":            "Batangas",
			"submitterUserId": submitterID,
			"reviewerUserId":  "550e8400-e29b-41d4-a716-446655440099",
		},
	}
}
