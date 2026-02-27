package middleware

import (
	"context"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"

	"fph-api-go/internal/config"
	apperrors "fph-api-go/internal/shared/errors"
	"fph-api-go/internal/shared/httpx"
)

func AttachClerkAuth(cfg config.Config) func(http.Handler) http.Handler {
	if cfg.DevAuth && cfg.ClerkSecretKey == "" {
		return attachDevAuth()
	}

	options := []clerkhttp.AuthorizationOption{
		clerkhttp.AuthorizationFailureHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			httpx.Error(w, RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid or expired bearer token", nil))
		})),
	}
	if cfg.ClerkJWTKey != "" {
		options = append(options, clerkhttp.JSONWebKey(cfg.ClerkJWTKey))
	}
	return clerkhttp.WithHeaderAuthorization(options...)
}

func RequireMember(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := CurrentAuth(r.Context())
		if !ok || userID == "" {
			httpx.Error(w, RequestIDFromContext(r.Context()), apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func CurrentAuth(ctx context.Context) (userID string, ok bool) {
	claims, ok := clerk.SessionClaimsFromContext(ctx)
	if !ok || claims == nil || claims.Subject == "" {
		return "", false
	}
	return claims.Subject, true
}

func attachDevAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				next.ServeHTTP(w, r)
				return
			}

			claims := &clerk.SessionClaims{
				RegisteredClaims: clerk.RegisteredClaims{
					Subject: userID,
				},
			}
			ctx := clerk.ContextWithSessionClaims(r.Context(), claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
