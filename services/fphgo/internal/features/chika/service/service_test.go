package service

import (
	"context"
	"testing"
	"time"

	chikarepo "fphgo/internal/features/chika/repo"
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
