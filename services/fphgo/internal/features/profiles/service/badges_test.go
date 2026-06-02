package service

import (
	"context"
	"testing"
	"time"

	profilesrepo "fphgo/internal/features/profiles/repo"
)

type badgeTestRepo struct {
	template     profilesrepo.BadgeTemplate
	ownsProof    bool
	createdInput profilesrepo.UpsertUserBadgeInput
	createCalled bool
	updatedInput profilesrepo.UpsertUserBadgeInput
	updateCalled bool
}

func (r *badgeTestRepo) GetProfileByUserID(context.Context, string) (profilesrepo.Profile, error) {
	return profilesrepo.Profile{}, nil
}

func (r *badgeTestRepo) UpsertMyProfile(context.Context, profilesrepo.UpsertProfileInput) (profilesrepo.Profile, error) {
	return profilesrepo.Profile{}, nil
}

func (r *badgeTestRepo) SearchUsers(context.Context, string, string, int32) ([]profilesrepo.SearchUser, error) {
	return nil, nil
}

func (r *badgeTestRepo) ListSavedSitesForUser(context.Context, string) ([]profilesrepo.SavedSite, error) {
	return nil, nil
}

func (r *badgeTestRepo) ListSavedUsersForUser(context.Context, string) ([]profilesrepo.SavedUser, error) {
	return nil, nil
}

func (r *badgeTestRepo) GetProfileViewByUsername(context.Context, string, string) (profilesrepo.ProfileView, error) {
	return profilesrepo.ProfileView{}, nil
}

func (r *badgeTestRepo) ListProfileBucketListByUsername(context.Context, string, int32) ([]profilesrepo.ProfileBucketListItem, error) {
	return nil, nil
}

func (r *badgeTestRepo) ListProfileDivingByUsername(context.Context, string, string) (profilesrepo.ProfileDiving, error) {
	return profilesrepo.ProfileDiving{}, nil
}

func (r *badgeTestRepo) GetProfileDiveMapByUsername(context.Context, string, string) (profilesrepo.ProfileDiveMap, error) {
	return profilesrepo.ProfileDiveMap{}, nil
}

func (r *badgeTestRepo) GetProfileDiveMapSiteByUsername(context.Context, string, string, string) (profilesrepo.ProfileDiveMapSiteDetail, error) {
	return profilesrepo.ProfileDiveMapSiteDetail{}, nil
}

func (r *badgeTestRepo) GetProfileDiveMemoriesPageByUsername(context.Context, string, string, string) (profilesrepo.ProfileDiveMemoriesPage, error) {
	return profilesrepo.ProfileDiveMemoriesPage{}, nil
}

func (r *badgeTestRepo) ListBadgeTemplates(context.Context) ([]profilesrepo.BadgeTemplate, error) {
	return []profilesrepo.BadgeTemplate{r.template}, nil
}

func (r *badgeTestRepo) GetBadgeTemplate(context.Context, string) (profilesrepo.BadgeTemplate, error) {
	return r.template, nil
}

func (r *badgeTestRepo) ListUserBadgesByUserID(context.Context, string) ([]profilesrepo.UserBadge, error) {
	return nil, nil
}

func (r *badgeTestRepo) ListProfileBadgesByUsername(context.Context, string) ([]profilesrepo.UserBadge, error) {
	return nil, nil
}

func (r *badgeTestRepo) CreateUserBadge(_ context.Context, input profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error) {
	r.createCalled = true
	r.createdInput = input
	return profilesrepo.UserBadge{
		ID:                 "550e8400-e29b-41d4-a716-446655440099",
		UserID:             input.UserID,
		Template:           r.template,
		ValueNumber:        input.ValueNumber,
		ProofMediaID:       stringPtrValue(input.ProofMediaID),
		VerificationStatus: "unverified",
		SourceType:         input.SourceType,
		SourceID:           stringPtrValue(input.SourceID),
		EarnedDate:         input.EarnedDate,
		Visibility:         input.Visibility,
		DisplayOrder:       input.DisplayOrder,
		MetadataJSON:       input.MetadataJSON,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
	}, nil
}

func stringPtrValue(input *string) string {
	if input == nil {
		return ""
	}
	return *input
}

func (r *badgeTestRepo) UpdateUserBadge(_ context.Context, input profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error) {
	r.updateCalled = true
	r.updatedInput = input
	return profilesrepo.UserBadge{
		ID:                 input.ID,
		UserID:             input.UserID,
		Template:           r.template,
		ValueNumber:        input.ValueNumber,
		ProofMediaID:       stringPtrValue(input.ProofMediaID),
		VerificationStatus: "unverified",
		SourceType:         input.SourceType,
		SourceID:           stringPtrValue(input.SourceID),
		EarnedDate:         input.EarnedDate,
		Visibility:         input.Visibility,
		DisplayOrder:       input.DisplayOrder,
		MetadataJSON:       input.MetadataJSON,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
	}, nil
}

func (r *badgeTestRepo) DeleteUserBadge(context.Context, string, string) error {
	return nil
}

func (r *badgeTestRepo) CountDiveSitesVisitedByUsername(context.Context, string) (int64, error) {
	return 0, nil
}

func (r *badgeTestRepo) CountDiveSitesVisitedByUserID(context.Context, string) (int64, error) {
	return 0, nil
}

func (r *badgeTestRepo) UserOwnsProofMedia(context.Context, string, string) (bool, error) {
	return r.ownsProof, nil
}

func TestCreateManualBadgeCarriesFutureMetadataAndValidatesProof(t *testing.T) {
	earnedDate := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)
	value := 32.0
	displayOrder := int32(7)
	visibility := "private"
	proofMediaID := "550e8400-e29b-41d4-a716-446655440010"
	repo := &badgeTestRepo{
		ownsProof: true,
		template: profilesrepo.BadgeTemplate{
			ID:           "550e8400-e29b-41d4-a716-446655440001",
			Slug:         "pb-constant-weight",
			Name:         "PB Constant Weight",
			Category:     "personal_best",
			ValueType:    "distance",
			Unit:         "m",
			IsPublic:     true,
			Rarity:       "common",
			SourceModule: "profile",
		},
	}
	svc := New(repo)

	badge, err := svc.CreateUserBadge(context.Background(), UpsertUserBadgeInput{
		ActorID:         "550e8400-e29b-41d4-a716-446655440000",
		BadgeTemplateID: repo.template.ID,
		ValueNumber:     &value,
		ProofMediaID:    &proofMediaID,
		EarnedDate:      &earnedDate,
		Visibility:      &visibility,
		DisplayOrder:    &displayOrder,
		MetadataJSON:    map[string]any{"sourceLabel": "pool comp"},
	})
	if err != nil {
		t.Fatalf("CreateUserBadge failed: %v", err)
	}
	if !repo.createCalled {
		t.Fatal("expected repo CreateUserBadge to be called")
	}
	if repo.createdInput.SourceType != "manual" {
		t.Fatalf("source type = %q, want manual", repo.createdInput.SourceType)
	}
	if repo.createdInput.Visibility != "private" || badge.Visibility != "private" {
		t.Fatalf("visibility not preserved: repo=%q badge=%q", repo.createdInput.Visibility, badge.Visibility)
	}
	if badge.DisplayValue != "32m" {
		t.Fatalf("display value = %q, want 32m", badge.DisplayValue)
	}
	if badge.EarnedDate == nil || !badge.EarnedDate.Equal(earnedDate) {
		t.Fatalf("earnedDate = %v, want %v", badge.EarnedDate, earnedDate)
	}
	if badge.MetadataJSON["sourceLabel"] != "pool comp" {
		t.Fatalf("metadata not preserved: %#v", badge.MetadataJSON)
	}
}

func TestCreateBadgeRejectsProofMediaNotOwnedByUser(t *testing.T) {
	value := 32.0
	proofMediaID := "550e8400-e29b-41d4-a716-446655440010"
	repo := &badgeTestRepo{
		ownsProof: false,
		template: profilesrepo.BadgeTemplate{
			ID:           "550e8400-e29b-41d4-a716-446655440001",
			Slug:         "pb-constant-weight",
			Name:         "PB Constant Weight",
			Category:     "personal_best",
			ValueType:    "distance",
			Unit:         "m",
			IsPublic:     true,
			Rarity:       "common",
			SourceModule: "profile",
		},
	}
	svc := New(repo)

	if _, err := svc.CreateUserBadge(context.Background(), UpsertUserBadgeInput{
		ActorID:         "550e8400-e29b-41d4-a716-446655440000",
		BadgeTemplateID: repo.template.ID,
		ValueNumber:     &value,
		ProofMediaID:    &proofMediaID,
	}); err == nil {
		t.Fatal("expected proof media ownership validation error")
	}
}

func TestUpdateBadgePreservesEarnedDateChange(t *testing.T) {
	earnedDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	value := 40.0
	repo := &badgeTestRepo{
		ownsProof: true,
		template: profilesrepo.BadgeTemplate{
			ID:           "550e8400-e29b-41d4-a716-446655440001",
			Slug:         "pb-constant-weight",
			Name:         "PB Constant Weight",
			Category:     "personal_best",
			ValueType:    "distance",
			Unit:         "m",
			IsPublic:     true,
			Rarity:       "common",
			SourceModule: "profile",
		},
	}
	svc := New(repo)

	badge, err := svc.UpdateUserBadge(context.Background(), UpsertUserBadgeInput{
		ActorID:         "550e8400-e29b-41d4-a716-446655440000",
		BadgeID:         "550e8400-e29b-41d4-a716-446655440099",
		BadgeTemplateID: repo.template.ID,
		ValueNumber:     &value,
		EarnedDate:      &earnedDate,
	})
	if err != nil {
		t.Fatalf("UpdateUserBadge failed: %v", err)
	}
	if !repo.updateCalled {
		t.Fatal("expected repo UpdateUserBadge to be called")
	}
	if repo.updatedInput.EarnedDate == nil || !repo.updatedInput.EarnedDate.Equal(earnedDate) {
		t.Fatalf("repo earnedDate = %v, want %v", repo.updatedInput.EarnedDate, earnedDate)
	}
	if badge.EarnedDate == nil || !badge.EarnedDate.Equal(earnedDate) {
		t.Fatalf("badge earnedDate = %v, want %v", badge.EarnedDate, earnedDate)
	}
}

func TestCreateBadgeRejectsSystemTemplate(t *testing.T) {
	repo := &badgeTestRepo{
		template: profilesrepo.BadgeTemplate{
			ID:           "550e8400-e29b-41d4-a716-446655440001",
			Slug:         "dive-sites-visited",
			Name:         "Dive Sites Visited",
			Category:     "auto_stat",
			ValueType:    "number",
			IsSystem:     true,
			IsPublic:     true,
			Rarity:       "common",
			SourceModule: "system",
		},
	}
	svc := New(repo)
	value := 10.0

	if _, err := svc.CreateUserBadge(context.Background(), UpsertUserBadgeInput{
		ActorID:         "550e8400-e29b-41d4-a716-446655440000",
		BadgeTemplateID: repo.template.ID,
		ValueNumber:     &value,
	}); err == nil {
		t.Fatal("expected system badge read-only error")
	}
}

func TestDiveSitesVisitedAutoStatCarriesPassportFieldsAndContractMetadata(t *testing.T) {
	svc := New(&badgeTestRepo{})
	stats := svc.buildAutoStats([]profilesrepo.BadgeTemplate{{
		ID:           "550e8400-e29b-41d4-a716-446655440001",
		Slug:         "dive-sites-visited",
		Name:         "Dive Sites Visited",
		Category:     "auto_stat",
		ValueType:    "number",
		DisplayOrder: 1000,
		Rarity:       "common",
		SourceModule: "system",
		IsSystem:     true,
		IsPublic:     true,
	}}, 42)
	if len(stats) != 1 {
		t.Fatalf("expected one auto stat, got %d", len(stats))
	}
	stat := stats[0]
	if stat.DisplayValue != "42" || !stat.IsAutoStat || !stat.IsSystemVerified {
		t.Fatalf("bad auto stat DTO: %#v", stat)
	}
	if stat.SourceType != "system" || stat.SourceModule != "system" {
		t.Fatalf("bad source metadata: %#v", stat)
	}
	if stat.MetadataJSON["contract"] != "user_dive_sites" {
		t.Fatalf("missing user_dive_sites contract metadata: %#v", stat.MetadataJSON)
	}
	if stat.Template.BadgeImageURL != "images/badges/dive-sites-visited.png" {
		t.Fatalf("missing derived badge image url: %#v", stat.Template)
	}
}

func TestBadgeCategorySummariesIncludeVisibleCategoriesAndAutoStat(t *testing.T) {
	svc := New(&badgeTestRepo{}, WithMediaBaseURL("https://cdn.example.com"))
	summaries := svc.buildBadgeCategorySummaries(
		[]profilesrepo.UserBadge{
			{Template: profilesrepo.BadgeTemplate{Category: "experience"}},
			{Template: profilesrepo.BadgeTemplate{Category: "community_role"}},
			{Template: profilesrepo.BadgeTemplate{Category: "community_role"}},
		},
		[]UserBadge{
			{Template: BadgeTemplate{Category: "auto_stat"}},
		},
	)
	if len(summaries) != 3 {
		t.Fatalf("expected 3 summaries, got %d: %#v", len(summaries), summaries)
	}
	if summaries[0].Category != "experience" || summaries[0].Label != "Field Experience" || summaries[0].Count != 1 {
		t.Fatalf("unexpected experience summary: %#v", summaries[0])
	}
	if summaries[0].ImageURL != "https://cdn.example.com/images/badges/field-experience.png" {
		t.Fatalf("unexpected experience image url: %#v", summaries[0])
	}
	if summaries[1].Category != "community_role" || summaries[1].Label != "Leadership Crest" || summaries[1].Count != 2 {
		t.Fatalf("unexpected community role summary: %#v", summaries[1])
	}
	if summaries[2].Category != "auto_stat" || summaries[2].Label != "Explorer Stamp" || summaries[2].Count != 1 {
		t.Fatalf("unexpected auto stat summary: %#v", summaries[2])
	}
}
