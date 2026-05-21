package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/validatex"
)

func TestNotificationOutboxAdminRoutes(t *testing.T) {
	now := time.Now().UTC()
	handler := New(notificationsservice.New(&outboxAdminRepoStub{
		listed: []notificationsrepo.NotificationOutbox{{
			ID:             "550e8400-e29b-41d4-a716-446655440099",
			EventType:      notificationsrepo.OutboxEventNewDiveSitePublished,
			AggregateType:  "dive_site",
			AggregateID:    "550e8400-e29b-41d4-a716-446655440010",
			Status:         "failed",
			Attempts:       8,
			NextRetryAt:    now,
			LastError:      ptr("failed"),
			IdempotencyKey: "explore:site:550e8400-e29b-41d4-a716-446655440010:published",
			Payload: map[string]any{
				"name":            "Secret Reef",
				"moderationNotes": "private",
			},
			CreatedAt: now,
			UpdatedAt: now,
		}},
		retry: notificationsrepo.NotificationOutbox{
			ID:             "550e8400-e29b-41d4-a716-446655440099",
			EventType:      notificationsrepo.OutboxEventNewDiveSitePublished,
			AggregateType:  "dive_site",
			AggregateID:    "550e8400-e29b-41d4-a716-446655440010",
			Status:         "pending",
			Attempts:       8,
			NextRetryAt:    now,
			IdempotencyKey: "explore:site:550e8400-e29b-41d4-a716-446655440010:published",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	}), validatex.New())

	t.Run("admin can list outbox rows", func(t *testing.T) {
		router := buildOutboxAdminRouter(adminIdentity(), handler)
		req := httptest.NewRequest(http.MethodGet, "/?status=failed", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 for admin list, got %d body=%s", rec.Code, rec.Body.String())
		}
		if strings.Contains(rec.Body.String(), "moderationNotes") {
			t.Fatalf("list response leaked private payload: %s", rec.Body.String())
		}
	})

	t.Run("member cannot list outbox rows", func(t *testing.T) {
		router := buildOutboxAdminRouter(memberIdentity(), handler)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for member list, got %d", rec.Code)
		}
	})

	t.Run("admin can retry failed outbox row", func(t *testing.T) {
		router := buildOutboxAdminRouter(adminIdentity(), handler)
		req := httptest.NewRequest(http.MethodPost, "/550e8400-e29b-41d4-a716-446655440099/retry", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 for admin retry, got %d body=%s", rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), `"status":"pending"`) {
			t.Fatalf("expected pending retry response, got %s", rec.Body.String())
		}
	})

	t.Run("member cannot retry outbox row", func(t *testing.T) {
		router := buildOutboxAdminRouter(memberIdentity(), handler)
		req := httptest.NewRequest(http.MethodPost, "/550e8400-e29b-41d4-a716-446655440099/retry", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for member retry, got %d", rec.Code)
		}
	})
}

func buildOutboxAdminRouter(identity authz.Identity, h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", AdminOutboxRoutes(h))
	return r
}

func adminIdentity() authz.Identity {
	return authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "admin",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("admin"),
	}
}

func memberIdentity() authz.Identity {
	return authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440001",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   authz.RolePermissions("member"),
	}
}

func ptr[T any](v T) *T { return &v }

type outboxAdminRepoStub struct {
	listed []notificationsrepo.NotificationOutbox
	retry  notificationsrepo.NotificationOutbox
}

func (r *outboxAdminRepoStub) Create(context.Context, notificationsrepo.CreateInput) (notificationsrepo.Notification, error) {
	return notificationsrepo.Notification{}, nil
}
func (r *outboxAdminRepoStub) ListByUser(context.Context, notificationsrepo.ListInput) ([]notificationsrepo.Notification, error) {
	return nil, nil
}
func (r *outboxAdminRepoStub) GetByIDForUser(context.Context, string, int64) (notificationsrepo.Notification, error) {
	return notificationsrepo.Notification{}, nil
}
func (r *outboxAdminRepoStub) MarkReadForUser(context.Context, string, int64) (notificationsrepo.Notification, error) {
	return notificationsrepo.Notification{}, nil
}
func (r *outboxAdminRepoStub) MarkAllReadForUser(context.Context, string) (int64, error) {
	return 0, nil
}
func (r *outboxAdminRepoStub) DeleteForUser(context.Context, string, int64) error { return nil }
func (r *outboxAdminRepoStub) CountByStatusForUser(context.Context, string, string) (int64, error) {
	return 0, nil
}
func (r *outboxAdminRepoStub) CountVisibleForUser(context.Context, string) (int64, error) {
	return 0, nil
}
func (r *outboxAdminRepoStub) GetSettingsForUser(context.Context, string) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}
func (r *outboxAdminRepoStub) CreateDefaultSettingsForUser(context.Context, string) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}
func (r *outboxAdminRepoStub) UpdateSettingsForUser(context.Context, string, notificationsrepo.SettingsUpdateInput) (notificationsrepo.NotificationSettings, error) {
	return notificationsrepo.NotificationSettings{}, nil
}
func (r *outboxAdminRepoStub) ListActiveNewDiveSiteRecipients(context.Context, string) ([]string, error) {
	return nil, nil
}
func (r *outboxAdminRepoStub) ClaimPendingOutbox(context.Context, time.Time, int) ([]notificationsrepo.NotificationOutbox, error) {
	return nil, nil
}
func (r *outboxAdminRepoStub) ListOutbox(context.Context, notificationsrepo.OutboxListInput) ([]notificationsrepo.NotificationOutbox, error) {
	return r.listed, nil
}
func (r *outboxAdminRepoStub) RetryOutbox(context.Context, string, time.Time) (notificationsrepo.NotificationOutbox, error) {
	return r.retry, nil
}
func (r *outboxAdminRepoStub) MarkOutboxProcessed(context.Context, string) error { return nil }
func (r *outboxAdminRepoStub) MarkOutboxRetry(context.Context, string, time.Time, string) error {
	return nil
}
func (r *outboxAdminRepoStub) MarkOutboxFailed(context.Context, string, string) error { return nil }
