package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	blocksrepo "fphgo/internal/features/blocks/repo"
	blocksservice "fphgo/internal/features/blocks/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

type memoryRepo struct {
	rows map[string]time.Time
}

func newMemoryRepo() *memoryRepo { return &memoryRepo{rows: map[string]time.Time{}} }

func (m *memoryRepo) CreateBlock(_ context.Context, blockerID, blockedID string) error {
	m.rows[blockerID+":"+blockedID] = time.Now().UTC()
	return nil
}
func (m *memoryRepo) DeleteBlock(_ context.Context, blockerID, blockedID string) error {
	delete(m.rows, blockerID+":"+blockedID)
	return nil
}
func (m *memoryRepo) ListBlocksByBlocker(_ context.Context, input blocksrepo.ListBlocksInput) ([]blocksrepo.Block, error) {
	items := []blocksrepo.Block{}
	for key, created := range m.rows {
		if len(key) < 37 || key[:36] != input.BlockerUserID {
			continue
		}
		blocked := key[37:]
		items = append(items, blocksrepo.Block{BlockedUserID: blocked, Username: "u", DisplayName: "d", CreatedAt: created})
	}
	return items, nil
}
func (m *memoryRepo) IsBlockedEitherDirection(_ context.Context, a, b string) (bool, error) {
	_, ab := m.rows[a+":"+b]
	_, ba := m.rows[b+":"+a]
	return ab || ba, nil
}

func TestBlocksEndpointsIdempotencyAndPagination(t *testing.T) {
	actor := "550e8400-e29b-41d4-a716-446655440000"
	blocked := "550e8400-e29b-41d4-a716-446655440001"
	secondBlocked := "550e8400-e29b-41d4-a716-446655440002"

	repo := newMemoryRepo()
	svc := blocksservice.New(repo)
	h := New(svc, validatex.New())

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        actor,
				GlobalRole:    "member",
				AccountStatus: "active",
				Permissions: map[authz.Permission]bool{
					authz.PermissionBlocksRead:  true,
					authz.PermissionBlocksWrite: true,
				},
			})
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))

	body, _ := json.Marshal(CreateBlockRequest{BlockedUserID: blocked})

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201 on block call %d, got %d", i+1, rec.Code)
		}
	}

	secondBody, _ := json.Marshal(CreateBlockRequest{BlockedUserID: secondBlocked})
	secondReq := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(secondBody))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	r.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on second user block, got %d", secondRec.Code)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/?limit=1", nil)
	getRec := httptest.NewRecorder()
	r.ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for list, got %d", getRec.Code)
	}

	var payload ListBlocksResponse
	if err := json.Unmarshal(getRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if len(payload.Items) == 0 {
		t.Fatal("expected listed blocks")
	}
	if payload.NextCursor == "" {
		t.Fatal("expected nextCursor for paginated list")
	}

	for i := 0; i < 2; i++ {
		delReq := httptest.NewRequest(http.MethodDelete, "/"+blocked, nil)
		delRec := httptest.NewRecorder()
		r.ServeHTTP(delRec, delReq)
		if delRec.Code != http.StatusNoContent {
			t.Fatalf("expected 204 on delete call %d, got %d", i+1, delRec.Code)
		}
	}
}

func TestBlocksSelfValidation(t *testing.T) {
	actor := "550e8400-e29b-41d4-a716-446655440000"
	repo := newMemoryRepo()
	svc := blocksservice.New(repo)
	h := New(svc, validatex.New())

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        actor,
				GlobalRole:    "member",
				AccountStatus: "active",
				Permissions: map[authz.Permission]bool{
					authz.PermissionBlocksRead:  true,
					authz.PermissionBlocksWrite: true,
				},
			})
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))

	body, _ := json.Marshal(CreateBlockRequest{BlockedUserID: actor})
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	errObj, ok := payload["error"].(map[string]any)
	if !ok || errObj["code"] != "validation_error" {
		t.Fatalf("expected validation_error payload, got %v", payload)
	}
}
