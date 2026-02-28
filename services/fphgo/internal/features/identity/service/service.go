package service

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"

	identityrepo "fphgo/internal/features/identity/repo"
	"fphgo/internal/shared/authz"
	apperrors "fphgo/internal/shared/errors"
)

type Service struct {
	repo *identityrepo.Repo
}

func New(repo *identityrepo.Repo) *Service {
	return &Service{repo: repo}
}

func (s *Service) ResolveIdentity(ctx context.Context, clerkUserID string) (*authz.Identity, error) {
	exists, err := s.repo.ClerkUserExists(ctx, clerkUserID)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "identity_check_failed", "failed to check user existence", err)
	}

	if !exists {
		username, displayName, emailVerified, phoneVerified := fetchClerkUserInfo(ctx, clerkUserID)
		if err := s.repo.EnsureUserForClerk(ctx, clerkUserID, username, displayName, emailVerified, phoneVerified); err != nil {
			return nil, apperrors.New(http.StatusInternalServerError, "identity_bootstrap_failed", "failed to bootstrap local identity", err)
		}
	}

	record, err := s.repo.ResolveIdentityByClerkUserID(ctx, clerkUserID)
	if err != nil {
		return nil, apperrors.New(http.StatusUnauthorized, "unauthorized", "failed to resolve identity", err)
	}

	decodedOverrides, err := identityrepo.DecodeOverrides(record.OverridesRaw)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "identity_overrides_failed", "failed to parse identity overrides", err)
	}

	overridePermissions := make(map[authz.Permission]bool, len(decodedOverrides))
	for name, value := range decodedOverrides {
		overridePermissions[authz.Permission(name)] = value
	}

	identity := &authz.Identity{
		UserID:        record.UserID,
		ClerkUserID:   clerkUserID,
		GlobalRole:    record.GlobalRole,
		AccountStatus: record.AccountStatus,
		Overrides:     overridePermissions,
		Permissions:   authz.ApplyOverrides(authz.RolePermissions(record.GlobalRole), overridePermissions),
	}

	return identity, nil
}

func (s *Service) ResolveScope(ctx context.Context, userID, groupID, eventID string) (authz.Scope, error) {
	scope := authz.Scope{
		GroupID: groupID,
		EventID: eventID,
	}

	if groupID != "" {
		role, err := s.repo.GroupRole(ctx, userID, groupID)
		if err != nil {
			return authz.Scope{}, fmt.Errorf("resolve group role: %w", err)
		}
		scope.GroupRole = role
	}

	if eventID != "" {
		role, err := s.repo.EventRole(ctx, userID, eventID)
		if err != nil {
			return authz.Scope{}, fmt.Errorf("resolve event role: %w", err)
		}
		scope.EventRole = role
	}

	return scope, nil
}

func fetchClerkUserInfo(ctx context.Context, clerkUserID string) (username, displayName string, emailVerified, phoneVerified bool) {
	u, err := clerkuser.Get(ctx, clerkUserID)
	if err != nil || u == nil {
		return "", "", false, false
	}

	if u.Username != nil {
		username = *u.Username
	}

	var parts []string
	if u.FirstName != nil && *u.FirstName != "" {
		parts = append(parts, *u.FirstName)
	}
	if u.LastName != nil && *u.LastName != "" {
		parts = append(parts, *u.LastName)
	}
	displayName = strings.Join(parts, " ")

	for _, email := range u.EmailAddresses {
		if email != nil && email.Verification != nil && email.Verification.Status == "verified" {
			emailVerified = true
			break
		}
	}
	for _, phone := range u.PhoneNumbers {
		if phone != nil && phone.Verification != nil && phone.Verification.Status == "verified" {
			phoneVerified = true
			break
		}
	}

	return username, displayName, emailVerified, phoneVerified
}
