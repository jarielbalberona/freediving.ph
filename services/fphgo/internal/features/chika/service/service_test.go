package service

import (
	"context"
	"testing"
	"time"

	chikarepo "fphgo/internal/features/chika/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	"fphgo/internal/realtime/ws"
)

func TestNormalizePagination(t *testing.T) {
	tests := []struct {
		limit, offset int32
		wantLimit     int32
		wantOffset    int32
	}{
		{0, 0, 20, 0},
		{-1, -1, 20, 0},
		{10, 5, 10, 5},
		{100, 0, 100, 0},
		{101, 0, 20, 0},
		{50, 100, 50, 100},
	}
	for _, tt := range tests {
		gotLimit, gotOffset := normalizePagination(tt.limit, tt.offset)
		if gotLimit != tt.wantLimit || gotOffset != tt.wantOffset {
			t.Errorf("normalizePagination(%d, %d) = (%d, %d), want (%d, %d)",
				tt.limit, tt.offset, gotLimit, gotOffset, tt.wantLimit, tt.wantOffset)
		}
	}
}

func TestIsModeratorRole(t *testing.T) {
	tests := []struct {
		role string
		want bool
	}{
		{"member", false},
		{"moderator", true},
		{"admin", true},
		{"super_admin", true},
		{"", false},
		{"unknown", false},
	}
	for _, tt := range tests {
		got := isModeratorRole(tt.role)
		if got != tt.want {
			t.Errorf("isModeratorRole(%q) = %v, want %v", tt.role, got, tt.want)
		}
	}
}

type chikaRealtimeCapture struct {
	events []ws.Envelope
}

func (c *chikaRealtimeCapture) BroadcastEnvelope(event ws.Envelope) {
	c.events = append(c.events, event)
}

func lastCommentReactionEvent(t *testing.T, events []ws.Envelope) map[string]any {
	t.Helper()
	for i := len(events) - 1; i >= 0; i-- {
		if events[i].Type != "chika.comment.reaction.updated" {
			continue
		}
		payload, ok := events[i].Payload.(map[string]any)
		if !ok {
			t.Fatalf("expected map payload, got %T", events[i].Payload)
		}
		return payload
	}
	t.Fatal("missing chika.comment.reaction.updated event")
	return nil
}

func assertCommentReactionState(
	t *testing.T,
	got CommentReactionResult,
	wantCount int64,
	wantReaction string,
) {
	t.Helper()
	if got.VoteCount != wantCount {
		t.Fatalf("VoteCount = %d, want %d", got.VoteCount, wantCount)
	}
	if got.UserReaction != wantReaction {
		t.Fatalf("UserReaction = %q, want %q", got.UserReaction, wantReaction)
	}
}

func assertLastBroadcastVoteCount(t *testing.T, rt *chikaRealtimeCapture, want int64) {
	t.Helper()
	payload := lastCommentReactionEvent(t, rt.events)
	if got := payload["voteCount"]; got != want {
		t.Fatalf("broadcast voteCount = %v (%T), want %d", got, got, want)
	}
	if _, ok := payload["userReaction"]; ok {
		t.Fatal("global realtime payload must not include viewer-specific userReaction")
	}
}

func TestCommentReactionMutationsReturnFreshStateAndBroadcastAggregate(t *testing.T) {
	const (
		threadID  = "550e8400-e29b-41d4-a716-446655440010"
		authorID  = "550e8400-e29b-41d4-a716-446655440011"
		viewerID  = "550e8400-e29b-41d4-a716-446655440012"
		commentID = int64(44)
	)

	repo := &chikaRepoStub{
		thread: chikarepo.Thread{
			ID:              threadID,
			Mode:            "normal",
			CreatedByUserID: authorID,
		},
		comment: chikarepo.Comment{
			ID:           commentID,
			ThreadID:     threadID,
			AuthorUserID: authorID,
			Pseudonym:    "Test",
			Content:      "hello",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}
	rt := &chikaRealtimeCapture{}
	svc := New(repo, blockCheckerStub{}, WithRealtimeBroadcaster(rt))

	upvoted, err := svc.SetCommentReaction(context.Background(), SetCommentReactionInput{
		CommentID: commentID,
		UserID:    viewerID,
		Type:      "upvote",
	})
	if err != nil {
		t.Fatalf("set upvote: %v", err)
	}
	assertCommentReactionState(t, upvoted, 1, "upvote")
	assertLastBroadcastVoteCount(t, rt, 1)

	switchedDown, err := svc.SetCommentReaction(context.Background(), SetCommentReactionInput{
		CommentID: commentID,
		UserID:    viewerID,
		Type:      "downvote",
	})
	if err != nil {
		t.Fatalf("switch to downvote: %v", err)
	}
	assertCommentReactionState(t, switchedDown, -1, "downvote")
	assertLastBroadcastVoteCount(t, rt, -1)

	switchedUp, err := svc.SetCommentReaction(context.Background(), SetCommentReactionInput{
		CommentID: commentID,
		UserID:    viewerID,
		Type:      "upvote",
	})
	if err != nil {
		t.Fatalf("switch to upvote: %v", err)
	}
	assertCommentReactionState(t, switchedUp, 1, "upvote")
	assertLastBroadcastVoteCount(t, rt, 1)

	removed, err := svc.RemoveCommentReaction(context.Background(), RemoveCommentReactionInput{
		CommentID: commentID,
		UserID:    viewerID,
	})
	if err != nil {
		t.Fatalf("remove reaction: %v", err)
	}
	assertCommentReactionState(t, removed, 0, "")
	assertLastBroadcastVoteCount(t, rt, 0)

	downvoted, err := svc.SetCommentReaction(context.Background(), SetCommentReactionInput{
		CommentID: commentID,
		UserID:    viewerID,
		Type:      "downvote",
	})
	if err != nil {
		t.Fatalf("set downvote: %v", err)
	}
	assertCommentReactionState(t, downvoted, -1, "downvote")
	assertLastBroadcastVoteCount(t, rt, -1)
}

func TestCreateCommentNotifiesThreadOwnerWithPseudonymousLabel(t *testing.T) {
	const (
		threadID  = "550e8400-e29b-41d4-a716-446655441010"
		ownerID   = "550e8400-e29b-41d4-a716-446655441011"
		actorID   = "550e8400-e29b-41d4-a716-446655441012"
		commentID = int64(77)
	)
	repo := &chikaRepoStub{
		thread: chikarepo.Thread{
			ID:              threadID,
			Title:           "Mabini line check",
			Mode:            "pseudonymous",
			Pseudonymous:    true,
			CreatedByUserID: ownerID,
		},
		createdComment: chikarepo.Comment{
			ID:           commentID,
			ThreadID:     threadID,
			AuthorUserID: actorID,
			Pseudonym:    "Blue Fin",
			Content:      "Safe conditions today.",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}
	rt := &chikaRealtimeCapture{}
	notifications := &chikaNotificationCapture{}
	svc := New(repo, blockCheckerStub{}, WithRealtimeBroadcaster(rt), WithNotifications(notifications))

	if _, err := svc.CreateComment(context.Background(), CreateCommentInput{
		ThreadID: threadID,
		UserID:   actorID,
		Content:  "Safe conditions today.",
	}); err != nil {
		t.Fatalf("CreateComment returned error: %v", err)
	}
	if len(notifications.threadComments) != 1 {
		t.Fatalf("expected one thread owner notification, got %d", len(notifications.threadComments))
	}
	got := notifications.threadComments[0]
	if got.RecipientUserID != ownerID {
		t.Fatalf("expected owner recipient %s, got %s", ownerID, got.RecipientUserID)
	}
	if got.ActorDisplayName != "Blue Fin" || !got.Pseudonymous {
		t.Fatalf("expected pseudonymous actor label, got label=%q pseudonymous=%v", got.ActorDisplayName, got.Pseudonymous)
	}
	for _, event := range rt.events {
		payload, ok := event.Payload.(map[string]any)
		if !ok {
			continue
		}
		if _, ok := payload["authorUserId"]; ok {
			t.Fatal("Chika realtime comment payload must not expose authorUserId")
		}
	}
}

func TestCreateCommentDoesNotNotifyCommenter(t *testing.T) {
	const (
		threadID = "550e8400-e29b-41d4-a716-446655441020"
		actorID  = "550e8400-e29b-41d4-a716-446655441021"
	)
	repo := &chikaRepoStub{
		thread: chikarepo.Thread{
			ID:              threadID,
			Mode:            "normal",
			CreatedByUserID: actorID,
		},
	}
	notifications := &chikaNotificationCapture{}
	svc := New(repo, blockCheckerStub{}, WithNotifications(notifications))

	if _, err := svc.CreateComment(context.Background(), CreateCommentInput{
		ThreadID: threadID,
		UserID:   actorID,
		Content:  "self comment",
	}); err != nil {
		t.Fatalf("CreateComment returned error: %v", err)
	}
	if len(notifications.threadComments) != 0 || len(notifications.commentReplies) != 0 {
		t.Fatalf("expected no self-notification, got thread=%d replies=%d", len(notifications.threadComments), len(notifications.commentReplies))
	}
}

func TestCreateCommentReplyNotifiesParentOnly(t *testing.T) {
	const (
		threadID        = "550e8400-e29b-41d4-a716-446655441030"
		threadOwnerID   = "550e8400-e29b-41d4-a716-446655441031"
		replierID       = "550e8400-e29b-41d4-a716-446655441032"
		parentCommentID = int64(55)
		replyCommentID  = int64(56)
	)
	repo := &chikaRepoStub{
		thread: chikarepo.Thread{
			ID:              threadID,
			Title:           "Pool line",
			Mode:            "normal",
			CreatedByUserID: threadOwnerID,
		},
		comments: map[int64]chikarepo.Comment{
			parentCommentID: {
				ID:           parentCommentID,
				ThreadID:     threadID,
				AuthorUserID: threadOwnerID,
				Content:      "Parent",
			},
		},
		createdComment: chikarepo.Comment{
			ID:           replyCommentID,
			ThreadID:     threadID,
			ParentID:     ptr(parentCommentID),
			AuthorUserID: replierID,
			Content:      "Reply",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		usernameByID: map[string]string{replierID: "linebuddy"},
	}
	notifications := &chikaNotificationCapture{}
	svc := New(repo, blockCheckerStub{}, WithNotifications(notifications))

	if _, err := svc.CreateComment(context.Background(), CreateCommentInput{
		ThreadID:        threadID,
		UserID:          replierID,
		Content:         "Reply",
		ParentCommentID: ptr(parentCommentID),
	}); err != nil {
		t.Fatalf("CreateComment returned error: %v", err)
	}
	if len(notifications.commentReplies) != 1 {
		t.Fatalf("expected one reply notification, got %d", len(notifications.commentReplies))
	}
	if len(notifications.threadComments) != 0 {
		t.Fatalf("expected no duplicate thread owner notification, got %d", len(notifications.threadComments))
	}
	got := notifications.commentReplies[0]
	if got.RecipientUserID != threadOwnerID || got.ActorDisplayName != "linebuddy" {
		t.Fatalf("unexpected reply notification recipient=%s actor=%s", got.RecipientUserID, got.ActorDisplayName)
	}
}

type chikaNotificationCapture struct {
	threadComments []notificationsservice.ChikaThreadCommentedInput
	commentReplies []notificationsservice.ChikaCommentRepliedInput
}

func (c *chikaNotificationCapture) NotifyChikaThreadCommented(_ context.Context, input notificationsservice.ChikaThreadCommentedInput) error {
	c.threadComments = append(c.threadComments, input)
	return nil
}

func (c *chikaNotificationCapture) NotifyChikaCommentReplied(_ context.Context, input notificationsservice.ChikaCommentRepliedInput) error {
	c.commentReplies = append(c.commentReplies, input)
	return nil
}

func ptr[T any](value T) *T { return &value }
