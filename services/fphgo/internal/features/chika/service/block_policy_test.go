package service

import (
	"context"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	chikarepo "fphgo/internal/features/chika/repo"
	apperrors "fphgo/internal/shared/errors"
)

type chikaRepoStub struct {
	thread           chikarepo.Thread
	comment          chikarepo.Comment
	createdComment   chikarepo.Comment
	comments         map[int64]chikarepo.Comment
	commentReactions map[int64]map[string]string
	usernameByID     map[string]string
}

func (s *chikaRepoStub) ListCategories(context.Context) ([]chikarepo.Category, error) {
	return []chikarepo.Category{}, nil
}
func (s *chikaRepoStub) GetCategoryByID(context.Context, string) (chikarepo.Category, error) {
	return chikarepo.Category{}, nil
}
func (s *chikaRepoStub) CreateThread(context.Context, string, string, string, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) ListThreads(context.Context, string, bool, time.Time, string, int32) ([]chikarepo.Thread, error) {
	return []chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) ListThreadsByCategory(context.Context, string, bool, string, time.Time, string, int32) ([]chikarepo.Thread, error) {
	return []chikarepo.Thread{}, nil
}
func (s *chikaRepoStub) GetThread(context.Context, string) (chikarepo.Thread, error) {
	return s.thread, nil
}
func (s *chikaRepoStub) GetThreadForViewer(context.Context, string, string) (chikarepo.Thread, error) {
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
func (s *chikaRepoStub) CreateComment(_ context.Context, threadID, userID, pseudonym, content string, parentID *int64) (chikarepo.Comment, error) {
	if s.createdComment.ID != 0 {
		return s.createdComment, nil
	}
	now := time.Now().UTC()
	return chikarepo.Comment{
		ID:           1,
		ThreadID:     threadID,
		ParentID:     parentID,
		AuthorUserID: userID,
		Pseudonym:    pseudonym,
		Content:      content,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}
func (s *chikaRepoStub) ListComments(context.Context, string, string, bool, time.Time, int64, int32) ([]chikarepo.Comment, error) {
	return []chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) GetComment(_ context.Context, commentID int64, viewerID string) (chikarepo.Comment, error) {
	comment := s.comment
	if s.comments != nil {
		if item, ok := s.comments[commentID]; ok {
			comment = item
		}
	}
	if comment.ID == 0 {
		comment.ID = commentID
	}
	if comment.ThreadID == "" {
		comment.ThreadID = s.thread.ID
	}
	reactions := s.commentReactions[commentID]
	comment.VoteCount = 0
	comment.ViewerReaction = ""
	for userID, reaction := range reactions {
		switch reaction {
		case "upvote":
			comment.VoteCount++
		case "downvote":
			comment.VoteCount--
		}
		if userID == viewerID {
			comment.ViewerReaction = reaction
		}
	}
	return comment, nil
}
func (s *chikaRepoStub) UpdateComment(context.Context, int64, string) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (s *chikaRepoStub) SoftDeleteComment(context.Context, int64) error { return nil }
func (s *chikaRepoStub) SetThreadReaction(context.Context, string, string, string) (chikarepo.Reaction, error) {
	return chikarepo.Reaction{}, nil
}
func (s *chikaRepoStub) RemoveThreadReaction(context.Context, string, string) error { return nil }
func (s *chikaRepoStub) SetCommentReaction(_ context.Context, commentID int64, userID, reactionType string) (chikarepo.Reaction, error) {
	if s.commentReactions == nil {
		s.commentReactions = map[int64]map[string]string{}
	}
	if s.commentReactions[commentID] == nil {
		s.commentReactions[commentID] = map[string]string{}
	}
	s.commentReactions[commentID][userID] = reactionType
	return chikarepo.Reaction{ThreadID: strconv.FormatInt(commentID, 10), UserID: userID, Type: reactionType}, nil
}
func (s *chikaRepoStub) RemoveCommentReaction(_ context.Context, commentID int64, userID string) error {
	if s.commentReactions != nil {
		delete(s.commentReactions[commentID], userID)
	}
	return nil
}
func (s *chikaRepoStub) CreateMediaAsset(context.Context, chikarepo.CreateMediaAssetInput) (chikarepo.MediaAsset, error) {
	return chikarepo.MediaAsset{}, nil
}
func (s *chikaRepoStub) ListMediaByEntity(context.Context, string, string) ([]chikarepo.MediaAsset, error) {
	return []chikarepo.MediaAsset{}, nil
}
func (s *chikaRepoStub) EntityExists(context.Context, string, string) (bool, error) { return true, nil }
func (s *chikaRepoStub) GetThreadAlias(context.Context, string, string) (string, error) {
	return "", pgx.ErrNoRows
}
func (s *chikaRepoStub) FindHistoricalThreadPseudonym(context.Context, string, string) (string, error) {
	return "", pgx.ErrNoRows
}
func (s *chikaRepoStub) UpsertThreadAlias(_ context.Context, _ string, _ string, pseudonym string) (string, error) {
	return pseudonym, nil
}
func (s *chikaRepoStub) PseudonymEnabled(context.Context, string) (bool, error) { return true, nil }
func (s *chikaRepoStub) Username(_ context.Context, userID string) (string, error) {
	if s.usernameByID != nil {
		if username, ok := s.usernameByID[userID]; ok {
			return username, nil
		}
	}
	return "user", nil
}

type blockCheckerStub struct {
	blocked bool
}

func (b blockCheckerStub) IsBlockedEitherDirection(context.Context, string, string) (bool, error) {
	return b.blocked, nil
}

func TestCreatePostBlockedReturnsForbidden(t *testing.T) {
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", AuthorUsername: "user1", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
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
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", AuthorUsername: "user1", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
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
	repo := &chikaRepoStub{thread: chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440002", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440001", AuthorUsername: "user1", CreatedAt: time.Now(), UpdatedAt: time.Now()}}
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
