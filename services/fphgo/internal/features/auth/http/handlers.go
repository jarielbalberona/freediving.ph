package http

import (
	"net/http"
	"sort"

	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	"fphgo/internal/shared/httpx"
)

type Handlers struct{}

func New() *Handlers {
	return &Handlers{}
}

func (h *Handlers) GetSession(w http.ResponseWriter, r *http.Request) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || !identity.IsAuthenticated() {
		httpx.JSON(w, http.StatusUnauthorized, map[string]any{
			"error": map[string]any{
				"code":    "unauthenticated",
				"message": "authentication required",
			},
		})
		return
	}

	scope, _ := middleware.CurrentScope(r.Context())

	response := sessionResponse{
		UserID:        identity.UserID,
		ClerkSubject:  identity.ClerkUserID,
		GlobalRole:    identity.GlobalRole,
		AccountStatus: identity.AccountStatus,
		Permissions:   serializePermissions(identity.Permissions),
		Scopes: sessionScopesResponse{
			Group: groupScope(scope.GroupID, scope.GroupRole),
			Event: eventScope(scope.EventID, scope.EventRole),
		},
	}

	httpx.JSON(w, http.StatusOK, response)
}

func serializePermissions(permissions map[authz.Permission]bool) []string {
	results := make([]string, 0, len(permissions))
	for permission, allowed := range permissions {
		if allowed {
			results = append(results, string(permission))
		}
	}
	sort.Strings(results)
	return results
}

func groupScope(scopeID, role string) *groupScopeResponse {
	if scopeID == "" || role == "" {
		return nil
	}
	return &groupScopeResponse{
		GroupID: scopeID,
		Role:    role,
	}
}

func eventScope(scopeID, role string) *eventScopeResponse {
	if scopeID == "" || role == "" {
		return nil
	}
	return &eventScopeResponse{
		EventID: scopeID,
		Role:    role,
	}
}
