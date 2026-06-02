package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	profilesrepo "fphgo/internal/features/profiles/repo"
)

type diveMemoriesPageRepo struct {
	badgeTestRepo
	viewErr error
	pageErr error
	page    profilesrepo.ProfileDiveMemoriesPage
}

func (r *diveMemoriesPageRepo) GetProfileViewByUsername(_ context.Context, username, viewerUserID string) (profilesrepo.ProfileView, error) {
	if r.viewErr != nil {
		return profilesrepo.ProfileView{}, r.viewErr
	}
	return profilesrepo.ProfileView{
		UserID:      "550e8400-e29b-41d4-a716-446655440011",
		Username:    username,
		DisplayName: "Member User",
		AvatarURL:   "avatar.jpg",
		CreatedAt:   time.Now().UTC(),
		IsFollowing: viewerUserID == "550e8400-e29b-41d4-a716-446655440099",
	}, nil
}

func (r *diveMemoriesPageRepo) GetProfileDiveMemoriesPageByUsername(_ context.Context, _ string, diveSiteSlug, _ string) (profilesrepo.ProfileDiveMemoriesPage, error) {
	if r.pageErr != nil {
		return profilesrepo.ProfileDiveMemoriesPage{}, r.pageErr
	}
	page := r.page
	if page.Site.Slug == "" {
		page.Site = profilesrepo.DiveMemoriesPageSite{
			DiveSiteID: "550e8400-e29b-41d4-a716-446655440092",
			Slug:       diveSiteSlug,
			Name:       "Napaling Reef",
			Area:       "Panglao, Bohol",
		}
	}
	if page.Marker.DiveSiteID == "" {
		page.Marker = profilesrepo.ProfileDiveMapMarker{
			UserID:           "550e8400-e29b-41d4-a716-446655440011",
			DiveSiteID:       "550e8400-e29b-41d4-a716-446655440092",
			DiveSiteSlug:     diveSiteSlug,
			DiveSiteName:     "Napaling Reef",
			DiveSiteArea:     "Panglao, Bohol",
			FirstVisitedAt:   time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
			LastVisitedAt:    time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
			MediaPostCount:   1,
			LastProofAddedAt: time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
		}
	}
	if len(page.ProofItems) == 0 {
		page.ProofItems = []profilesrepo.DiveMemoriesPageProofItem{{
			ID:            "proof-1",
			PostID:        "post-1",
			MediaItemID:   "media-item-1",
			MediaObjectID: "media-object-1",
			Type:          "photo",
			StorageKey:    "proof.jpg",
			MimeType:      "image/jpeg",
			Width:         1200,
			Height:        900,
			CreatedAt:     time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
		}}
	}
	return page, nil
}

func TestGetProfileDiveMemoriesPageByUsernameReturnsPageContract(t *testing.T) {
	repo := &diveMemoriesPageRepo{
		page: profilesrepo.ProfileDiveMemoriesPage{
			MemoryItems: []profilesrepo.DiveMemoriesPageMemoryItem{{
				ID:         "memory-1",
				Title:      "Current and calm",
				Visibility: "public",
				OccurredAt: time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
				CreatedAt:  time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
				UpdatedAt:  time.Date(2026, 6, 3, 0, 0, 0, 0, time.UTC),
				Attachments: []profilesrepo.DiveMemoriesPageMemoryAttachment{{
					ID:        "attachment-1",
					MediaID:   "media-object-2",
					ObjectKey: "memory.jpg",
					MimeType:  "image/jpeg",
					Width:     1080,
					Height:    1080,
					CreatedAt: time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
				}},
			}},
		},
	}
	svc := New(repo, WithMediaBaseURL("https://cdn.example.com"))

	page, err := svc.GetProfileDiveMemoriesPageByUsername(context.Background(), "member", "napaling-reef", "")
	if err != nil {
		t.Fatalf("get page: %v", err)
	}
	if page.Profile.Username != "member" || page.Site.Slug != "napaling-reef" {
		t.Fatalf("unexpected page metadata: %+v", page)
	}
	if len(page.ProofItems) != 1 || page.ProofItems[0].Kind != "proof_media_post" {
		t.Fatalf("expected proof discriminator, got %+v", page.ProofItems)
	}
	if len(page.MemoryItems) != 1 || page.MemoryItems[0].Kind != "dive_memory" {
		t.Fatalf("expected memory discriminator, got %+v", page.MemoryItems)
	}
	if page.MemoryItems[0].Attachments[0].Media.URL == "" {
		t.Fatalf("expected resolved memory media URL, got %+v", page.MemoryItems[0].Attachments)
	}
}

func TestGetProfileDiveMemoriesPageByUsernameReturnsNotFoundForMissingProfileOrPage(t *testing.T) {
	svc := New(&diveMemoriesPageRepo{viewErr: errors.New("boom")})
	if _, err := svc.GetProfileDiveMemoriesPageByUsername(context.Background(), "member", "napaling-reef", ""); err == nil {
		t.Fatal("expected profile lookup error")
	}

	svc = New(&diveMemoriesPageRepo{viewErr: pgx.ErrNoRows})
	if _, err := svc.GetProfileDiveMemoriesPageByUsername(context.Background(), "member", "napaling-reef", ""); err == nil {
		t.Fatal("expected not found for missing profile")
	}

	svc = New(&diveMemoriesPageRepo{pageErr: pgx.ErrNoRows})
	if _, err := svc.GetProfileDiveMemoriesPageByUsername(context.Background(), "member", "missing-site", ""); err == nil {
		t.Fatal("expected not found for missing dive memories page")
	}
}
