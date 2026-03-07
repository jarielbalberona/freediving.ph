package service

import (
	"context"
	"errors"
	"testing"
	"time"

	blocksrepo "fphgo/internal/features/blocks/repo"
)

type repoStub struct {
	createCalls int
	deleteCalls int
	listRows    []blocksrepo.Block
}

func (r *repoStub) CreateBlock(context.Context, string, string) error {
	r.createCalls++
	return nil
}
func (r *repoStub) DeleteBlock(context.Context, string, string) error {
	r.deleteCalls++
	return nil
}
func (r *repoStub) ListBlocksByBlocker(context.Context, blocksrepo.ListBlocksInput) ([]blocksrepo.Block, error) {
	return r.listRows, nil
}
func (r *repoStub) IsBlockedEitherDirection(context.Context, string, string) (bool, error) {
	return false, nil
}

func TestBlockUserCannotBlockSelf(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	err := svc.BlockUser(context.Background(), "550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440000")
	if err == nil {
		t.Fatal("expected validation error")
	}
	var vf ValidationFailure
	if !errors.As(err, &vf) {
		t.Fatalf("expected ValidationFailure, got %T", err)
	}
	if len(vf.Issues) == 0 {
		t.Fatal("expected validation issues")
	}
}

func TestBlockAndUnblockAreIdempotent(t *testing.T) {
	repo := &repoStub{}
	svc := New(repo)

	blocker := "550e8400-e29b-41d4-a716-446655440000"
	blocked := "550e8400-e29b-41d4-a716-446655440001"

	if err := svc.BlockUser(context.Background(), blocker, blocked); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := svc.BlockUser(context.Background(), blocker, blocked); err != nil {
		t.Fatalf("unexpected second error: %v", err)
	}
	if repo.createCalls != 2 {
		t.Fatalf("expected 2 create calls, got %d", repo.createCalls)
	}

	if err := svc.UnblockUser(context.Background(), blocker, blocked); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := svc.UnblockUser(context.Background(), blocker, blocked); err != nil {
		t.Fatalf("unexpected second error: %v", err)
	}
	if repo.deleteCalls != 2 {
		t.Fatalf("expected 2 delete calls, got %d", repo.deleteCalls)
	}
}

func TestListBlocksProvidesCursor(t *testing.T) {
	now := time.Now().UTC()
	repo := &repoStub{listRows: []blocksrepo.Block{
		{BlockedUserID: "550e8400-e29b-41d4-a716-446655440001", CreatedAt: now},
		{BlockedUserID: "550e8400-e29b-41d4-a716-446655440002", CreatedAt: now.Add(-time.Minute)},
	}}
	svc := New(repo)

	result, err := svc.ListBlocks(context.Background(), "550e8400-e29b-41d4-a716-446655440000", 1, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.NextCursor == "" {
		t.Fatal("expected next cursor")
	}
}
