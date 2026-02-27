package http

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	moderationrepo "fphgo/internal/features/moderation_actions/repo"
	moderationservice "fphgo/internal/features/moderation_actions/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

type memoryModerationRepo struct {
	userStatuses map[string]string
	threads      map[string]bool
	comments     map[int64]bool
	reports      map[string]bool
	actions      []moderationrepo.ModerationAction
}

func newMemoryModerationRepo() *memoryModerationRepo {
	return &memoryModerationRepo{
		userStatuses: map[string]string{},
		threads:      map[string]bool{},
		comments:     map[int64]bool{},
		reports:      map[string]bool{},
		actions:      []moderationrepo.ModerationAction{},
	}
}

func (m *memoryModerationRepo) SetUserStatusAndAudit(_ context.Context, userID, accountStatus string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error) {
	if _, ok := m.userStatuses[userID]; !ok {
		return moderationrepo.ModerationAction{}, pgx.ErrNoRows
	}
	m.userStatuses[userID] = accountStatus
	return m.appendAction(action), nil
}

func (m *memoryModerationRepo) HideThreadAndAudit(_ context.Context, threadID string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error) {
	if !m.threads[threadID] {
		return moderationrepo.ModerationAction{}, pgx.ErrNoRows
	}
	return m.appendAction(action), nil
}

func (m *memoryModerationRepo) UnhideThreadAndAudit(_ context.Context, threadID string, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error) {
	if !m.threads[threadID] {
		return moderationrepo.ModerationAction{}, pgx.ErrNoRows
	}
	return m.appendAction(action), nil
}

func (m *memoryModerationRepo) HideCommentAndAudit(_ context.Context, commentID int64, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error) {
	if !m.comments[commentID] {
		return moderationrepo.ModerationAction{}, pgx.ErrNoRows
	}
	return m.appendAction(action), nil
}

func (m *memoryModerationRepo) UnhideCommentAndAudit(_ context.Context, commentID int64, action moderationrepo.ActionInput) (moderationrepo.ModerationAction, error) {
	if !m.comments[commentID] {
		return moderationrepo.ModerationAction{}, pgx.ErrNoRows
	}
	return m.appendAction(action), nil
}

func (m *memoryModerationRepo) ReportExists(_ context.Context, reportID string) (bool, error) {
	return m.reports[reportID], nil
}

func (m *memoryModerationRepo) appendAction(action moderationrepo.ActionInput) moderationrepo.ModerationAction {
	targetID := ""
	if action.Target.UUID != nil {
		targetID = *action.Target.UUID
	} else if action.Target.Bigint != nil {
		targetID = strconv.FormatInt(*action.Target.Bigint, 10)
	}
	item := moderationrepo.ModerationAction{
		ID:          uuid.NewString(),
		ActorUserID: action.ActorUserID,
		TargetType:  action.Target.Type,
		TargetID:    targetID,
		Action:      action.Action,
		Reason:      action.Reason,
		CreatedAt:   time.Now().UTC(),
	}
	if action.ReportID != nil {
		item.ReportID = *action.ReportID
	}
	m.actions = append(m.actions, item)
	return item
}

func TestModerationActionsRequireAuthAndPermission(t *testing.T) {
	moderatorID := "550e8400-e29b-41d4-a716-446655440000"
	targetUserID := "550e8400-e29b-41d4-a716-446655440001"

	repo := newMemoryModerationRepo()
	repo.userStatuses[targetUserID] = "active"
	svc := moderationservice.New(repo)
	h := New(svc, validatex.New())

	body := []byte(`{"reason":"harassment"}`)

	unauthRouter := chi.NewRouter()
	unauthRouter.Use(middleware.RequireMember)
	unauthRouter.Mount("/", Routes(h))
	unauthReq := httptest.NewRequest(http.MethodPost, "/users/"+targetUserID+"/suspend", bytes.NewReader(body))
	unauthReq.Header.Set("Content-Type", "application/json")
	unauthRec := httptest.NewRecorder()
	unauthRouter.ServeHTTP(unauthRec, unauthReq)
	if unauthRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", unauthRec.Code)
	}

	noPermRouter := buildModerationRouter(h, authz.Identity{
		UserID:        moderatorID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	})
	noPermReq := httptest.NewRequest(http.MethodPost, "/users/"+targetUserID+"/suspend", bytes.NewReader(body))
	noPermReq.Header.Set("Content-Type", "application/json")
	noPermRec := httptest.NewRecorder()
	noPermRouter.ServeHTTP(noPermRec, noPermReq)
	if noPermRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", noPermRec.Code)
	}
}

func TestSuspendUserWritesAuditLog(t *testing.T) {
	moderatorID := "550e8400-e29b-41d4-a716-446655440000"
	targetUserID := "550e8400-e29b-41d4-a716-446655440001"
	reportID := "550e8400-e29b-41d4-a716-446655440010"

	repo := newMemoryModerationRepo()
	repo.userStatuses[targetUserID] = "active"
	repo.reports[reportID] = true
	svc := moderationservice.New(repo)
	h := New(svc, validatex.New())

	router := buildModerationRouter(h, authz.Identity{
		UserID:        moderatorID,
		GlobalRole:    "moderator",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionModerationWrite: true,
		},
	})

	payload := []byte(`{"reason":"confirmed abuse","reportId":"` + reportID + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/users/"+targetUserID+"/suspend", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	if got := repo.userStatuses[targetUserID]; got != "suspended" {
		t.Fatalf("expected user status suspended, got %q", got)
	}
	if len(repo.actions) != 1 {
		t.Fatalf("expected 1 audit action, got %d", len(repo.actions))
	}
	action := repo.actions[0]
	if action.ActorUserID != moderatorID {
		t.Fatalf("expected actor %s, got %s", moderatorID, action.ActorUserID)
	}
	if action.TargetType != "user" || action.TargetID != targetUserID {
		t.Fatalf("unexpected action target: %+v", action)
	}
	if action.Action != "suspend_user" {
		t.Fatalf("expected suspend_user action, got %s", action.Action)
	}
	if action.Reason != "confirmed abuse" {
		t.Fatalf("expected reason to match, got %s", action.Reason)
	}
	if action.ReportID != reportID {
		t.Fatalf("expected reportID %s, got %s", reportID, action.ReportID)
	}
}

func buildModerationRouter(h *Handlers, identity authz.Identity) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(h))
	return r
}
