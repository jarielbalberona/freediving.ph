package http

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

func TestVerifyStreamWebhookSignature(t *testing.T) {
	now := time.Unix(1_720_000_000, 0)
	body := []byte(`{"uid":"stream-123"}`)
	rawTime := "1720000000"
	mac := hmac.New(sha256.New, []byte("webhook-secret"))
	_, _ = mac.Write([]byte(rawTime + "."))
	_, _ = mac.Write(body)
	header := "time=" + rawTime + ",sig1=" + hex.EncodeToString(mac.Sum(nil))

	if err := verifyStreamWebhookSignature("webhook-secret", header, body, now); err != nil {
		t.Fatalf("expected valid signature, got %v", err)
	}
	if err := verifyStreamWebhookSignature("wrong-secret", header, body, now); err == nil {
		t.Fatal("expected invalid secret to fail")
	}
	if err := verifyStreamWebhookSignature("webhook-secret", header, body, now.Add(10*time.Minute)); err == nil {
		t.Fatal("expected stale signature to fail")
	}
}

func TestMediaRoutesRequireAuth(t *testing.T) {
	router := Routes(New(nil, validatex.New()))

	tests := []struct {
		method string
		path   string
		body   string
		header string
	}{
		{method: http.MethodPost, path: "/upload-multiple", header: "multipart/form-data; boundary=abc"},
		{method: http.MethodPost, path: "/posts/22222222-2222-4222-8222-222222222222/likes"},
		{method: http.MethodDelete, path: "/posts/22222222-2222-4222-8222-222222222222/likes"},
		{method: http.MethodPost, path: "/posts/22222222-2222-4222-8222-222222222222/saves"},
		{method: http.MethodDelete, path: "/posts/22222222-2222-4222-8222-222222222222/saves"},
		{method: http.MethodPost, path: "/posts/22222222-2222-4222-8222-222222222222/comments", body: `{"body":"hello"}`},
		{method: http.MethodDelete, path: "/posts/22222222-2222-4222-8222-222222222222/comments/33333333-3333-4333-8333-333333333333"},
		{method: http.MethodPost, path: "/posts/22222222-2222-4222-8222-222222222222/comments/33333333-3333-4333-8333-333333333333/likes"},
		{method: http.MethodDelete, path: "/posts/22222222-2222-4222-8222-222222222222/comments/33333333-3333-4333-8333-333333333333/likes"},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.header != "" {
				req.Header.Set("Content-Type", tt.header)
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d", rec.Code)
			}
		})
	}
}

func TestMediaRoutesRequirePermission(t *testing.T) {
	router := permissionRouter(authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	})

	req := httptest.NewRequest(http.MethodPost, "/upload-multiple", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestUploadMultipleValidationRequiresFiles(t *testing.T) {
	router := permissionRouter(authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionMediaWrite: true,
		},
	})

	req := httptest.NewRequest(http.MethodPost, "/upload-multiple", strings.NewReader(""))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func permissionRouter(identity authz.Identity) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), identity)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Mount("/", Routes(New(nil, validatex.New())))
	return r
}

var _ httpx.Validator = validatex.New()
