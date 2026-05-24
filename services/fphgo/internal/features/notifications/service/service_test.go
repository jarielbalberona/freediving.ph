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

func TestNotifyDiveSiteSubmittedForReviewNotifiesExploreModeratorsAndExcludesSubmitter(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	adminID := "550e8400-e29b-41d4-a716-446655440002"
	superAdminID := "550e8400-e29b-41d4-a716-446655440003"
	repo.exploreModeratorRecipients = []string{submitterID, adminID, superAdminID}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))

	err := svc.NotifyDiveSiteSubmittedForReview(context.Background(), DiveSiteSubmittedForReviewInput{
		SiteID:          "770e8400-e29b-41d4-a716-446655440000",
		Name:            "Secret Reef",
		Area:            "Batangas",
		SubmitterUserID: submitterID,
	})
	if err != nil {
		t.Fatalf("NotifyDiveSiteSubmittedForReview returned error: %v", err)
	}
	if len(repo.created) != 2 {
		t.Fatalf("expected two moderator notifications, got %d", len(repo.created))
	}
	for _, input := range repo.created {
		if input.Type != "DIVE_SITE_SUBMITTED_FOR_REVIEW" {
			t.Fatalf("unexpected notification type %q", input.Type)
		}
		if input.UserID == submitterID {
			t.Fatal("submitter should not receive their own moderation notification")
		}
		if input.ActionURL == nil || *input.ActionURL != "/moderation/explore-sites/770e8400-e29b-41d4-a716-446655440000" {
			t.Fatalf("unexpected action url: %v", input.ActionURL)
		}
		if _, ok := input.Metadata["moderationNotes"]; ok {
			t.Fatal("review notification metadata leaked moderation notes")
		}
	}
	if len(broadcaster.targets) != 2 {
		t.Fatalf("expected two targeted realtime emissions, got %d", len(broadcaster.targets))
	}
}

func TestNotifyInstructorApplicationSubmittedNotifiesSuperAdminReviewersOnlyAndExcludesApplicant(t *testing.T) {
	repo := newNotificationRepoStub()
	applicantID := "550e8400-e29b-41d4-a716-446655440001"
	superAdminID := "550e8400-e29b-41d4-a716-446655440002"
	repo.instructorReviewerRecipients = []string{applicantID, superAdminID}
	broadcaster := &notificationBroadcasterStub{}
	svc := New(repo, WithBroadcaster(broadcaster))

	err := svc.NotifyInstructorApplicationSubmitted(context.Background(), InstructorApplicationSubmittedInput{
		ProfileID:            "770e8400-e29b-41d4-a716-446655440100",
		ApplicantUserID:      applicantID,
		ApplicantDisplayName: "Maya Santos",
		Status:               "pending",
	})
	if err != nil {
		t.Fatalf("NotifyInstructorApplicationSubmitted returned error: %v", err)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one reviewer notification, got %d", len(repo.created))
	}
	created := repo.created[0]
	if created.UserID != superAdminID || created.Type != "INSTRUCTOR_APPLICATION_SUBMITTED" {
		t.Fatalf("unexpected reviewer notification: type=%s user=%s", created.Type, created.UserID)
	}
	if derefString(created.ActionURL) != "/admin/instructors?status=pending" {
		t.Fatalf("unexpected action URL %q", derefString(created.ActionURL))
	}
	for _, forbidden := range []string{"proofMediaId", "signedUrl", "officialVerificationUrl", "reviewNotes", "adminNotes"} {
		if _, ok := created.Metadata[forbidden]; ok {
			t.Fatalf("reviewer notification metadata leaked %s", forbidden)
		}
	}
	if len(broadcaster.targets) != 1 || broadcaster.targets[0][0] != superAdminID {
		t.Fatalf("expected targeted realtime to reviewer, got %#v", broadcaster.targets)
	}
}

func TestNotifyInstructorApplicationApprovalAndRejectionNotifyApplicantOnly(t *testing.T) {
	repo := newNotificationRepoStub()
	applicantID := "550e8400-e29b-41d4-a716-446655440001"
	reviewerID := "550e8400-e29b-41d4-a716-446655440002"
	svc := New(repo)

	if err := svc.NotifyInstructorApplicationApproved(context.Background(), InstructorApplicationStatusInput{
		ProfileID:       "770e8400-e29b-41d4-a716-446655440100",
		ApplicantUserID: applicantID,
		ReviewerUserID:  reviewerID,
		Status:          "verified",
	}); err != nil {
		t.Fatalf("approved notification failed: %v", err)
	}
	if err := svc.NotifyInstructorApplicationRejected(context.Background(), InstructorApplicationStatusInput{
		ProfileID:       "770e8400-e29b-41d4-a716-446655440100",
		ApplicantUserID: applicantID,
		ReviewerUserID:  reviewerID,
		Status:          "rejected",
	}); err != nil {
		t.Fatalf("rejected notification failed: %v", err)
	}
	if len(repo.created) != 2 {
		t.Fatalf("expected two applicant notifications, got %d", len(repo.created))
	}
	want := map[string]string{
		"INSTRUCTOR_APPLICATION_APPROVED": "/instructor/profile",
		"INSTRUCTOR_APPLICATION_REJECTED": "/instructor/apply",
	}
	for _, created := range repo.created {
		if created.UserID != applicantID {
			t.Fatalf("approval/rejection should notify applicant only, got %s", created.UserID)
		}
		if derefString(created.ActionURL) != want[created.Type] {
			t.Fatalf("unexpected action URL for %s: %q", created.Type, derefString(created.ActionURL))
		}
		for _, forbidden := range []string{"proofMediaId", "signedUrl", "officialVerificationUrl", "reviewNotes", "adminNotes", "rejectionReason"} {
			if _, ok := created.Metadata[forbidden]; ok {
				t.Fatalf("%s metadata leaked %s", created.Type, forbidden)
			}
		}
	}
}

func TestNotifyInstructorApplicationStatusHonorsApplicantSetting(t *testing.T) {
	repo := newNotificationRepoStub()
	applicantID := "550e8400-e29b-41d4-a716-446655440001"
	repo.instructorStatusEnabled = map[string]bool{applicantID: false}
	svc := New(repo)

	err := svc.NotifyInstructorApplicationApproved(context.Background(), InstructorApplicationStatusInput{
		ProfileID:       "770e8400-e29b-41d4-a716-446655440100",
		ApplicantUserID: applicantID,
		Status:          "verified",
	})
	if err != nil {
		t.Fatalf("approved notification returned error: %v", err)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected applicant status setting to suppress notification, got %d", len(repo.created))
	}
}

func TestNotifyChikaThreadCommentedUsesPseudonymousSafePayload(t *testing.T) {
	repo := newNotificationRepoStub()
	recipientID := "550e8400-e29b-41d4-a716-446655440101"
	svc := New(repo)

	err := svc.NotifyChikaThreadCommented(context.Background(), ChikaThreadCommentedInput{
		ThreadID:         "550e8400-e29b-41d4-a716-446655440201",
		ThreadTitle:      "Depth talk",
		CommentID:        44,
		RecipientUserID:  recipientID,
		ActorDisplayName: "Blue Fin",
		Pseudonymous:     true,
	})
	if err != nil {
		t.Fatalf("NotifyChikaThreadCommented returned error: %v", err)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one notification, got %d", len(repo.created))
	}
	created := repo.created[0]
	if created.Type != "CHIKA_THREAD_COMMENTED" || created.UserID != recipientID {
		t.Fatalf("unexpected notification: type=%s user=%s", created.Type, created.UserID)
	}
	if created.ActorUserID != nil {
		t.Fatal("Chika notification must not expose real actor user id")
	}
	if _, ok := created.Metadata["authorUserId"]; ok {
		t.Fatal("Chika notification metadata must not expose authorUserId")
	}
	if got := created.Metadata["actorLabel"]; got != "Blue Fin" {
		t.Fatalf("expected pseudonymous actor label, got %v", got)
	}
	if got := created.Metadata["pseudonymous"]; got != true {
		t.Fatalf("expected pseudonymous metadata marker, got %v", got)
	}
}

func TestNotifyChikaThreadCommentedHonorsOptOut(t *testing.T) {
	repo := newNotificationRepoStub()
	recipientID := "550e8400-e29b-41d4-a716-446655440101"
	repo.chikaRepliesEnabled = map[string]bool{recipientID: false}
	svc := New(repo)

	err := svc.NotifyChikaThreadCommented(context.Background(), ChikaThreadCommentedInput{
		ThreadID:         "550e8400-e29b-41d4-a716-446655440201",
		CommentID:        44,
		RecipientUserID:  recipientID,
		ActorDisplayName: "Blue Fin",
		Pseudonymous:     true,
	})
	if err != nil {
		t.Fatalf("NotifyChikaThreadCommented returned error: %v", err)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected opt-out to prevent notification row, got %d", len(repo.created))
	}
}

func TestNotifyGroupPostCreatedUsesActiveOptedInRecipients(t *testing.T) {
	repo := newNotificationRepoStub()
	groupID := "550e8400-e29b-41d4-a716-446655440301"
	authorID := "550e8400-e29b-41d4-a716-446655440302"
	recipientID := "550e8400-e29b-41d4-a716-446655440303"
	repo.groupPostRecipients = map[string][]string{groupID: []string{authorID, recipientID}}
	svc := New(repo)

	err := svc.NotifyGroupPostCreated(context.Background(), GroupPostCreatedInput{
		GroupID:      groupID,
		GroupName:    "Batangas Line Divers",
		PostID:       "550e8400-e29b-41d4-a716-446655440304",
		PostTitle:    "Training this weekend",
		AuthorUserID: authorID,
	})
	if err != nil {
		t.Fatalf("NotifyGroupPostCreated returned error: %v", err)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one notification, got %d", len(repo.created))
	}
	if repo.created[0].Type != "GROUP_POST_CREATED" || repo.created[0].UserID != recipientID {
		t.Fatalf("unexpected group notification: type=%s user=%s", repo.created[0].Type, repo.created[0].UserID)
	}
}

func TestNotifyGroupInviteReceivedTargetsInviteeOnly(t *testing.T) {
	repo := newNotificationRepoStub()
	svc := New(repo)
	groupID := "550e8400-e29b-41d4-a716-446655440305"
	inviterID := "550e8400-e29b-41d4-a716-446655440306"
	inviteeID := "550e8400-e29b-41d4-a716-446655440307"

	err := svc.NotifyGroupInviteReceived(context.Background(), GroupInviteReceivedInput{
		GroupID:       groupID,
		GroupName:     "Batangas Line Divers",
		InviterUserID: inviterID,
		InvitedUserID: inviteeID,
	})
	if err != nil {
		t.Fatalf("NotifyGroupInviteReceived returned error: %v", err)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one invite notification, got %d", len(repo.created))
	}
	if repo.created[0].Type != "GROUP_INVITE_RECEIVED" || repo.created[0].UserID != inviteeID {
		t.Fatalf("unexpected invite notification: type=%s user=%s", repo.created[0].Type, repo.created[0].UserID)
	}
	if _, ok := repo.created[0].Metadata["inviterUserId"]; ok {
		t.Fatal("group invite notification metadata should not expose inviterUserId")
	}
}

func TestNotifyEventAttendeeJoinedHonorsOrganizerSetting(t *testing.T) {
	repo := newNotificationRepoStub()
	organizerID := "550e8400-e29b-41d4-a716-446655440401"
	repo.eventNotificationsEnabled = map[string]bool{organizerID: false}
	svc := New(repo)

	err := svc.NotifyEventAttendeeJoined(context.Background(), EventAttendeeJoinedInput{
		EventID:         "550e8400-e29b-41d4-a716-446655440402",
		EventTitle:      "Pool session",
		OrganizerUserID: organizerID,
		AttendeeUserID:  "550e8400-e29b-41d4-a716-446655440403",
	})
	if err != nil {
		t.Fatalf("NotifyEventAttendeeJoined returned error: %v", err)
	}
	if len(repo.created) != 0 {
		t.Fatalf("expected event opt-out to prevent notification row, got %d", len(repo.created))
	}
}

func TestEventNotificationsUseSlugActionURLs(t *testing.T) {
	const (
		eventID     = "550e8400-e29b-41d4-a716-446655440402"
		groupID     = "550e8400-e29b-41d4-a716-446655440404"
		organizerID = "550e8400-e29b-41d4-a716-446655440405"
		attendeeID  = "550e8400-e29b-41d4-a716-446655440406"
		recipientID = "550e8400-e29b-41d4-a716-446655440407"
	)
	updatedAt := time.Date(2026, 5, 22, 12, 0, 0, 0, time.UTC)

	t.Run("created for group", func(t *testing.T) {
		repo := newNotificationRepoStub()
		repo.groupEventRecipients = map[string][]string{groupID: []string{organizerID, recipientID}}
		svc := New(repo)

		if err := svc.NotifyEventCreatedForGroup(context.Background(), EventCreatedForGroupInput{
			EventID:         eventID,
			EventSlug:       "freediving-cleanup-dive",
			EventTitle:      "Freediving cleanup dive",
			GroupID:         groupID,
			OrganizerUserID: organizerID,
		}); err != nil {
			t.Fatalf("NotifyEventCreatedForGroup returned error: %v", err)
		}
		assertCreatedActionURL(t, repo, "/events/freediving-cleanup-dive")
	})

	t.Run("attendee joined", func(t *testing.T) {
		repo := newNotificationRepoStub()
		svc := New(repo)

		if err := svc.NotifyEventAttendeeJoined(context.Background(), EventAttendeeJoinedInput{
			EventID:         eventID,
			EventSlug:       "intro-freediving-session",
			EventTitle:      "Intro freediving session",
			OrganizerUserID: organizerID,
			AttendeeUserID:  attendeeID,
		}); err != nil {
			t.Fatalf("NotifyEventAttendeeJoined returned error: %v", err)
		}
		assertCreatedActionURL(t, repo, "/events/intro-freediving-session")
	})

	t.Run("updated", func(t *testing.T) {
		repo := newNotificationRepoStub()
		repo.eventAttendeeRecipients = map[string][]string{eventID: []string{organizerID, attendeeID}}
		svc := New(repo)

		if err := svc.NotifyEventUpdated(context.Background(), EventUpdatedInput{
			EventID:     eventID,
			EventSlug:   "intro-freediving-session",
			EventTitle:  "Intro freediving session",
			ActorUserID: organizerID,
			UpdatedAt:   updatedAt,
		}); err != nil {
			t.Fatalf("NotifyEventUpdated returned error: %v", err)
		}
		assertCreatedActionURL(t, repo, "/events/intro-freediving-session")
	})

	t.Run("cancelled", func(t *testing.T) {
		repo := newNotificationRepoStub()
		repo.eventAttendeeRecipients = map[string][]string{eventID: []string{organizerID, attendeeID}}
		svc := New(repo)

		if err := svc.NotifyEventCancelled(context.Background(), EventCancelledInput{
			EventID:     eventID,
			EventSlug:   "freediving-cleanup-dive",
			EventTitle:  "Freediving cleanup dive",
			ActorUserID: organizerID,
			UpdatedAt:   updatedAt,
		}); err != nil {
			t.Fatalf("NotifyEventCancelled returned error: %v", err)
		}
		assertCreatedActionURL(t, repo, "/events/freediving-cleanup-dive")
	})
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
				if input.ActorUserID != nil {
					t.Fatalf("outbox processor should not depend on reviewer user id payload, got actor %s", *input.ActorUserID)
				}
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

func TestProcessDueOutboxCreatesDiveSiteReviewNotificationsAndMarksProcessed(t *testing.T) {
	repo := newNotificationRepoStub()
	submitterID := "550e8400-e29b-41d4-a716-446655440001"
	adminID := "550e8400-e29b-41d4-a716-446655440002"
	repo.exploreModeratorRecipients = []string{adminID}
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{newDiveSiteSubmissionOutboxEvent(1, submitterID)}
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
	if len(repo.created) != 1 {
		t.Fatalf("expected one review notification, got %d", len(repo.created))
	}
	created := repo.created[0]
	if created.Type != "DIVE_SITE_SUBMITTED_FOR_REVIEW" || created.UserID != adminID {
		t.Fatalf("unexpected review notification: type=%s user=%s", created.Type, created.UserID)
	}
	if len(broadcaster.targets) != 1 {
		t.Fatalf("expected one targeted realtime emission after persistence, got %d", len(broadcaster.targets))
	}
}

func TestProcessDueOutboxCreatesInstructorApplicationNotificationsAndMarksProcessed(t *testing.T) {
	repo := newNotificationRepoStub()
	applicantID := "550e8400-e29b-41d4-a716-446655440001"
	superAdminID := "550e8400-e29b-41d4-a716-446655440002"
	repo.instructorReviewerRecipients = []string{superAdminID}
	repo.claimedOutbox = []notificationsrepo.NotificationOutbox{newInstructorApplicationSubmittedOutboxEvent(1, applicantID)}
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
	if len(repo.created) != 1 {
		t.Fatalf("expected one instructor review notification, got %d", len(repo.created))
	}
	created := repo.created[0]
	if created.Type != "INSTRUCTOR_APPLICATION_SUBMITTED" || created.UserID != superAdminID {
		t.Fatalf("unexpected instructor notification: type=%s user=%s", created.Type, created.UserID)
	}
	if len(broadcaster.targets) != 1 || broadcaster.targets[0][0] != superAdminID {
		t.Fatalf("expected one targeted realtime emission after persistence, got %#v", broadcaster.targets)
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

func TestListOutboxReturnsSafeSummary(t *testing.T) {
	repo := newNotificationRepoStub()
	now := time.Now().UTC()
	repo.listedOutbox = []notificationsrepo.NotificationOutbox{{
		ID:             "550e8400-e29b-41d4-a716-446655440099",
		EventType:      "NEW_DIVE_SITE_PUBLISHED",
		AggregateType:  "dive_site",
		AggregateID:    "550e8400-e29b-41d4-a716-446655440010",
		Status:         "failed",
		Attempts:       8,
		NextRetryAt:    now,
		LastError:      ptr("failed"),
		IdempotencyKey: "explore:site:550e8400-e29b-41d4-a716-446655440010:published",
		Payload: map[string]any{
			"siteId":          "550e8400-e29b-41d4-a716-446655440010",
			"slug":            "secret-reef",
			"name":            "Secret Reef",
			"area":            "Batangas",
			"submitterUserId": "550e8400-e29b-41d4-a716-446655440001",
			"reviewerUserId":  "550e8400-e29b-41d4-a716-446655440002",
			"moderationNotes": "private",
		},
		CreatedAt: now,
		UpdatedAt: now,
	}}
	svc := New(repo)
	status := "failed"

	items, err := svc.ListOutbox(context.Background(), OutboxListInput{Status: &status, Limit: 10})
	if err != nil {
		t.Fatalf("ListOutbox returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one outbox item, got %d", len(items))
	}
	if repo.listOutboxInput.Status == nil || *repo.listOutboxInput.Status != "failed" {
		t.Fatalf("expected failed status filter passed to repo, got %+v", repo.listOutboxInput.Status)
	}
	if items[0].Summary["name"] != "Secret Reef" {
		t.Fatalf("expected public summary field, got %+v", items[0].Summary)
	}
	if _, ok := items[0].Summary["moderationNotes"]; ok {
		t.Fatal("outbox summary leaked private moderation notes")
	}
	if _, ok := items[0].Summary["reviewerUserId"]; ok {
		t.Fatal("outbox summary leaked reviewer user id")
	}
}

func TestRetryOutboxSchedulesFailedRowDueWithoutResettingAttempts(t *testing.T) {
	repo := newNotificationRepoStub()
	now := time.Now().UTC()
	repo.retryOutboxResult = notificationsrepo.NotificationOutbox{
		ID:             "550e8400-e29b-41d4-a716-446655440099",
		EventType:      "NEW_DIVE_SITE_PUBLISHED",
		AggregateType:  "dive_site",
		AggregateID:    "550e8400-e29b-41d4-a716-446655440010",
		Status:         "pending",
		Attempts:       8,
		NextRetryAt:    now,
		IdempotencyKey: "explore:site:550e8400-e29b-41d4-a716-446655440010:published",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	svc := New(repo)

	item, err := svc.RetryOutbox(context.Background(), repo.retryOutboxResult.ID)
	if err != nil {
		t.Fatalf("RetryOutbox returned error: %v", err)
	}
	if repo.retriedOutboxID != repo.retryOutboxResult.ID {
		t.Fatalf("expected retry id passed to repo, got %s", repo.retriedOutboxID)
	}
	if item.Status != "pending" || item.Attempts != 8 {
		t.Fatalf("expected retry to preserve attempts and schedule pending, got status=%s attempts=%d", item.Status, item.Attempts)
	}
}

type notificationRepoStub struct {
	notifications                        []notificationsrepo.Notification
	created                              []notificationsrepo.CreateInput
	nextID                               int64
	exploreModeratorRecipients           []string
	instructorReviewerRecipients         []string
	newDiveSiteRecipients                []string
	excludedNewDiveSiteRecipientIDs      map[string]bool
	chikaRepliesEnabled                  map[string]bool
	instructorStatusEnabled              map[string]bool
	eventNotificationsEnabled            map[string]bool
	groupInviteNotificationsEnabled      map[string]bool
	groupPostRecipients                  map[string][]string
	groupEventRecipients                 map[string][]string
	eventAttendeeRecipients              map[string][]string
	notificationsByUserAndIdempotencyKey map[string]notificationsrepo.Notification
	claimedOutbox                        []notificationsrepo.NotificationOutbox
	listedOutbox                         []notificationsrepo.NotificationOutbox
	listOutboxInput                      notificationsrepo.OutboxListInput
	retryOutboxResult                    notificationsrepo.NotificationOutbox
	retriedOutboxID                      string
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

func (r *notificationRepoStub) ListActiveExploreModeratorRecipients(_ context.Context, excludeUserID string) ([]string, error) {
	return filteredRecipients(r.exploreModeratorRecipients, excludeUserID), nil
}

func (r *notificationRepoStub) ListActiveInstructorReviewerRecipients(_ context.Context, excludeUserID string) ([]string, error) {
	return filteredRecipients(r.instructorReviewerRecipients, excludeUserID), nil
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

func (r *notificationRepoStub) ChikaRepliesEnabled(_ context.Context, userID string) (bool, error) {
	if r.chikaRepliesEnabled == nil {
		return true, nil
	}
	enabled, ok := r.chikaRepliesEnabled[userID]
	if !ok {
		return true, nil
	}
	return enabled, nil
}

func (r *notificationRepoStub) EventNotificationsEnabled(_ context.Context, userID string) (bool, error) {
	if r.eventNotificationsEnabled == nil {
		return true, nil
	}
	enabled, ok := r.eventNotificationsEnabled[userID]
	if !ok {
		return true, nil
	}
	return enabled, nil
}

func (r *notificationRepoStub) GroupInviteNotificationsEnabled(_ context.Context, userID string) (bool, error) {
	if r.groupInviteNotificationsEnabled == nil {
		return true, nil
	}
	enabled, ok := r.groupInviteNotificationsEnabled[userID]
	if !ok {
		return true, nil
	}
	return enabled, nil
}

func (r *notificationRepoStub) InstructorStatusNotificationsEnabled(_ context.Context, userID string) (bool, error) {
	if r.instructorStatusEnabled == nil {
		return true, nil
	}
	enabled, ok := r.instructorStatusEnabled[userID]
	if !ok {
		return true, nil
	}
	return enabled, nil
}

func (r *notificationRepoStub) ListGroupPostRecipients(_ context.Context, groupID, excludeUserID string) ([]string, error) {
	return filteredRecipients(r.groupPostRecipients[groupID], excludeUserID), nil
}

func (r *notificationRepoStub) ListGroupEventRecipients(_ context.Context, groupID, excludeUserID string) ([]string, error) {
	return filteredRecipients(r.groupEventRecipients[groupID], excludeUserID), nil
}

func (r *notificationRepoStub) ListEventAttendeeRecipients(_ context.Context, eventID, excludeUserID string) ([]string, error) {
	return filteredRecipients(r.eventAttendeeRecipients[eventID], excludeUserID), nil
}

func (r *notificationRepoStub) ClaimPendingOutbox(context.Context, time.Time, int) ([]notificationsrepo.NotificationOutbox, error) {
	return r.claimedOutbox, nil
}

func (r *notificationRepoStub) ListOutbox(_ context.Context, input notificationsrepo.OutboxListInput) ([]notificationsrepo.NotificationOutbox, error) {
	r.listOutboxInput = input
	return r.listedOutbox, nil
}

func (r *notificationRepoStub) RetryOutbox(_ context.Context, id string, _ time.Time) (notificationsrepo.NotificationOutbox, error) {
	r.retriedOutboxID = id
	return r.retryOutboxResult, nil
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

func assertCreatedActionURL(t *testing.T, repo *notificationRepoStub, want string) {
	t.Helper()
	if len(repo.created) != 1 {
		t.Fatalf("expected one notification, got %d", len(repo.created))
	}
	if got := derefString(repo.created[0].ActionURL); got != want {
		t.Fatalf("notification action URL = %q, want %q", got, want)
	}
}

func filteredRecipients(values []string, excludeUserID string) []string {
	recipients := make([]string, 0, len(values))
	for _, value := range values {
		if value == excludeUserID {
			continue
		}
		recipients = append(recipients, value)
	}
	return recipients
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
		},
	}
}

func newDiveSiteSubmissionOutboxEvent(attempts int, submitterID string) notificationsrepo.NotificationOutbox {
	return notificationsrepo.NotificationOutbox{
		ID:        "660e8400-e29b-41d4-a716-446655440010",
		EventType: notificationsrepo.OutboxEventDiveSiteSubmittedForReview,
		Attempts:  attempts,
		Payload: map[string]any{
			"siteId":          "770e8400-e29b-41d4-a716-446655440000",
			"name":            "Secret Reef",
			"area":            "Batangas",
			"submitterUserId": submitterID,
		},
	}
}

func newInstructorApplicationSubmittedOutboxEvent(attempts int, applicantID string) notificationsrepo.NotificationOutbox {
	return notificationsrepo.NotificationOutbox{
		ID:        "660e8400-e29b-41d4-a716-446655440020",
		EventType: notificationsrepo.OutboxEventInstructorApplicationSubmitted,
		Attempts:  attempts,
		Payload: map[string]any{
			"profileId":            "770e8400-e29b-41d4-a716-446655440100",
			"applicantUserId":      applicantID,
			"applicantDisplayName": "Maya Santos",
			"status":               "pending",
		},
	}
}
