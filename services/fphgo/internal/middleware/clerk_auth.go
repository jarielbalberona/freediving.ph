package middleware

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/go-chi/chi/v5"

	"fphgo/internal/config"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
)

type identityContextKey struct{}
type scopeContextKey struct{}

type IdentityResolver interface {
	ResolveIdentity(ctx context.Context, clerkUserID string) (*authz.Identity, error)
	ResolveScope(ctx context.Context, userID, groupID, eventID string) (authz.Scope, error)
}

func AttachClerkAuth(cfg config.Config) func(http.Handler) http.Handler {
	if cfg.DevAuth && cfg.ClerkSecretKey == "" {
		return attachDevAuth()
	}

	options := []clerkhttp.AuthorizationOption{
		clerkhttp.AuthorizationFailureHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "invalid or expired bearer token", map[string]any{
				"reason": "invalid_or_expired_token",
			})
		})),
	}
	if cfg.ClerkJWTKey != "" {
		options = append(options, clerkhttp.JSONWebKey(cfg.ClerkJWTKey))
	}
	return clerkhttp.WithHeaderAuthorization(options...)
}

func AttachIdentityContext(resolver IdentityResolver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if resolver == nil {
				next.ServeHTTP(w, r)
				return
			}

			clerkUserID, ok := CurrentAuth(r.Context())
			if !ok || clerkUserID == "" {
				next.ServeHTTP(w, r)
				return
			}

			identity, err := resolver.ResolveIdentity(r.Context(), clerkUserID)
			if err != nil {
				httpx.Error(w, RequestIDFromContext(r.Context()), err)
				return
			}

			groupID := paramOrQuery(r, "groupId")
			eventID := paramOrQuery(r, "eventId")

			scope, err := resolver.ResolveScope(r.Context(), identity.UserID, groupID, eventID)
			if err != nil {
				httpx.Error(w, RequestIDFromContext(r.Context()), apperrors.New(http.StatusInternalServerError, "scope_resolve_failed", "failed to resolve authorization scope", err))
				return
			}

			ctx := context.WithValue(r.Context(), identityContextKey{}, *identity)
			ctx = context.WithValue(ctx, scopeContextKey{}, scope)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func EnforceTokenClaims(cfg config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := clerk.SessionClaimsFromContext(r.Context())
			if !ok || claims == nil {
				next.ServeHTTP(w, r)
				return
			}

			if cfg.ClerkJWTIssuer != "" && strings.TrimSpace(claims.Issuer) != cfg.ClerkJWTIssuer {
				writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "invalid token issuer", map[string]any{
					"expectedIssuer": cfg.ClerkJWTIssuer,
				})
				return
			}

			if len(cfg.ClerkJWTAudience) > 0 && !audienceMatch(claims.Audience, cfg.ClerkJWTAudience) {
				writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "invalid token audience", map[string]any{
					"expectedAudience": cfg.ClerkJWTAudience,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireMember(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := CurrentIdentity(r.Context())
		if !ok || !identity.IsAuthenticated() {
			writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "authentication required", nil)
			return
		}

		if identity.AccountStatus == "suspended" {
			writeAuthError(w, http.StatusForbidden, "forbidden", "account is suspended", map[string]any{
				"reason": "suspended",
			})
			return
		}

		if identity.IsReadOnly() && isWriteMethod(r.Method) {
			writeAuthError(w, http.StatusForbidden, "forbidden", "account is read-only", map[string]any{
				"reason": "read_only",
				"method": r.Method,
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequirePermission enforces that the identity has the given permission (global or scoped).
// Must be used together with RequireMember so suspended and read_only users are blocked.
func RequirePermission(permission authz.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identity, ok := CurrentIdentity(r.Context())
			if !ok || !identity.IsAuthenticated() {
				writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "authentication required", nil)
				return
			}

			scope, _ := CurrentScope(r.Context())
			if !identity.Can(permission, scope) {
				writeAuthError(w, http.StatusForbidden, "forbidden", "insufficient permission", map[string]any{
					"requiredPermission": permission,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func CurrentAuth(ctx context.Context) (userID string, ok bool) {
	claims, ok := clerk.SessionClaimsFromContext(ctx)
	if !ok || claims == nil || claims.Subject == "" {
		return "", false
	}
	return claims.Subject, true
}

func CurrentIdentity(ctx context.Context) (authz.Identity, bool) {
	value := ctx.Value(identityContextKey{})
	identity, ok := value.(authz.Identity)
	return identity, ok
}

func CurrentScope(ctx context.Context) (authz.Scope, bool) {
	value := ctx.Value(scopeContextKey{})
	scope, ok := value.(authz.Scope)
	return scope, ok
}

func WithIdentity(ctx context.Context, identity authz.Identity) context.Context {
	return context.WithValue(ctx, identityContextKey{}, identity)
}

func WithScope(ctx context.Context, scope authz.Scope) context.Context {
	return context.WithValue(ctx, scopeContextKey{}, scope)
}

func attachDevAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
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

func isWriteMethod(method string) bool {
	return method == http.MethodPost ||
		method == http.MethodPut ||
		method == http.MethodPatch ||
		method == http.MethodDelete
}

func paramOrQuery(r *http.Request, key string) string {
	if value := chi.URLParam(r, key); strings.TrimSpace(value) != "" {
		return value
	}
	return queryParam(r.URL.Query(), key)
}

func queryParam(values url.Values, key string) string {
	return strings.TrimSpace(values.Get(key))
}

func audienceMatch(claimAudiences, expected []string) bool {
	if len(expected) == 0 {
		return true
	}
	allowed := make(map[string]struct{}, len(expected))
	for _, value := range expected {
		normalized := strings.TrimSpace(value)
		if normalized != "" {
			allowed[normalized] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return true
	}
	for _, claim := range claimAudiences {
		if _, ok := allowed[strings.TrimSpace(claim)]; ok {
			return true
		}
	}
	return false
}

func writeAuthError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	errorPayload := map[string]any{
		"code":    code,
		"message": message,
	}
	if len(details) > 0 {
		errorPayload["details"] = details
	}
	httpx.JSON(w, status, map[string]any{"error": errorPayload})
}
