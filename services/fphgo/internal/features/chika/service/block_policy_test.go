package service

import (
	"context"
	"net/http"
	"testing"
	"time"

	chikarepo "fphgo/internal/features/chika/repo"
	apperrors "fphgo/internal/shared/errors"
)

type chikaRepoStub struct {
	thread chikarepo.Thread
}

func (s *chikaRepoStub) CreateThread(context.Context, string, string, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) ListThreads(context.Context, string, bool, time.Time, string, int32) ([]chikarepo.Thread, error) {
	return []chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) GetThread(context.Context, string) (chikarepo.Thread, error) {
	return s.thread, nil
}
func (s *chikaRepoStub) UpdateThread(context.Context, string, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) SoftDeleteThread(context.Context, string) error { return nil }
func (s *chikaRepoStub) CreatePost(context.Context, string, string, string, string) (chikarepo.Post, error) {
	return chikarepo.Post{}, nil
}
func (s *chikaRepoStub) ListPosts(context.Context, string, string, int32, int32) ([]chikarepo.Post, error) {
	return []chikarepo.Post{}, nil
}
func (s *chikaRepoStub) CreateComment(context.Context, string, string, string, string) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) ListComments(context.Context, string, string, bool, time.Time, int64, int32) ([]chikarepo.Comment, error) {
	return []chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) GetComment(context.Context, int64) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) UpdateComment(context.Context, int64, string) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) SoftDeleteComment(context.Context, int64) error { return nil }
func (s *chikaRepoStub) SetThreadReaction(context.Context, string, string, string) (chikarepo.Reaction, error) {
	return chikarepo.Reaction{}, nil
}
func (s *chikaRepoStub) RemoveThreadReaction(context.Context, string, string) error { return nil }
func (s *chikaRepoStub) CreateMediaAsset(context.Context, chikarepo.CreateMediaAssetInput) (chikarepo.MediaAsset, error) {
	return chikarepo.MediaAsset{}, nil
}
func (s *chikaRepoStub) ListMediaByEntity(context.Context, string, string) ([]chikarepo.MediaAsset, error) {
	return []chikarepo.MediaAsset{}, nil
}
func (s *chikaRepoStub) EntityExists(context.Context, string, string) (bool, error) { return true, nil }
func (s *chikaRepoStub) PseudonymEnabled(context.Context, string) (bool, error)     { return true, nil }
func (s *chikaRepoStub) Username(context.Context, string) (string, error)           { return "user", nil }

type blockCheckerStub struct {
	blocked bool
}

func (b blockCheckerStub) IsBlockedEitherDirection(context.Context, string, string) (bool, error) {
	return b.blocked, nil
}

func TestCreatePostBlockedReturnsForbidden(t *testing.T) {
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
	svc := New(repo, blockCheckerStub{blocked: true})

	_, err := svc.CreatePost(context.Background(), CreatePostInput{
		ThreadID: "550e8400-e29b-41d4-a716-446655440002",
		UserID:   "550e8400-e29b-41d4-a716-446655440000",
		Content:  "hello",
	})
	if err == nil {
		t.Fatal("expected blocked error")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
	if appErr.Code != "blocked" {
		t.Fatalf("expected blocked code, got %q", appErr.Code)
	}
}

func TestSetThreadReactionBlockedReturnsForbidden(t *testing.T) {
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
	svc := New(repo, blockCheckerStub{blocked: true})

	_, err := svc.SetThreadReaction(context.Background(), SetThreadReactionInput{
		ThreadID: "550e8400-e29b-41d4-a716-446655440002",
		UserID:   "550e8400-e29b-41d4-a716-446655440000",
		Type:     "upvote",
	})
	if err == nil {
		t.Fatal("expected blocked error")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
	if appErr.Code != "blocked" {
		t.Fatalf("expected blocked code, got %q", appErr.Code)
	}
}

func TestCreateCommentBlockedReturnsForbidden(t *testing.T) {
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
	svc := New(repo, blockCheckerStub{blocked: true})

	_, err := svc.CreateComment(context.Background(), CreateCommentInput{
		ThreadID: "550e8400-e29b-41d4-a716-446655440002",
		UserID:   "550e8400-e29b-41d4-a716-446655440000",
		Content:  "hello",
	})
	if err == nil {
		t.Fatal("expected blocked error")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", appErr.Status)
	}
	if appErr.Code != "blocked" {
		t.Fatalf("expected blocked code, got %q", appErr.Code)
	}
}
