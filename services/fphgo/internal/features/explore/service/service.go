package service

import (
	"context"
	"net/http"
	"strings"

	explorerepo "fphgo/internal/features/explore/repo"
	apperrors "fphgo/internal/shared/errors"
)

type Service struct {
	repo *explorerepo.Repo
}

func New(repo *explorerepo.Repo) *Service { return &Service{repo: repo} }

func (s *Service) ListDiveSites(ctx context.Context, search string) ([]explorerepo.DiveSite, error) {
	items, err := s.repo.ListDiveSites(ctx, strings.TrimSpace(search))
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "list_dive_sites_failed", "failed to list dive sites", err)
	}
	return items, nil
}
