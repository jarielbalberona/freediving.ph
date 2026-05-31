package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	profilesrepo "fphgo/internal/features/profiles/repo"
	profilesservice "fphgo/internal/features/profiles/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type stubProfilesService struct{}

type memoryProfilesRepo struct{}

func (m *memoryProfilesRepo) GetProfileByUserID(_ context.Context, userID string) (profilesrepo.Profile, error) {
	return profilesrepo.Profile{
		UserID:      userID,
		Username:    "member",
		DisplayName: "Member User",
		Bio:         "Bio",
		AvatarURL:   "https://example.com/avatar.jpg",
		Location:    "Metro Manila",
		Socials:     map[string]string{"website": "https://example.com"},
	}, nil
}

func (m *memoryProfilesRepo) UpsertMyProfile(_ context.Context, input profilesrepo.UpsertProfileInput) (profilesrepo.Profile, error) {
	return profilesrepo.Profile{
		UserID:      input.UserID,
		Username:    "member",
		DisplayName: input.DisplayName,
		Bio:         input.Bio,
		AvatarURL:   input.AvatarURL,
		Location:    input.Location,
		Socials:     input.Socials,
	}, nil
}

func (m *memoryProfilesRepo) SearchUsers(_ context.Context, _ string, query string, _ int32) ([]profilesrepo.SearchUser, error) {
	if strings.TrimSpace(query) == "" {
		return []profilesrepo.SearchUser{}, nil
	}
	return []profilesrepo.SearchUser{{
		UserID:      "550e8400-e29b-41d4-a716-446655440001",
		Username:    "buddy",
		DisplayName: "Buddy User",
		AvatarURL:   "https://example.com/buddy.jpg",
		Location:    "Cebu",
	}}, nil
}

func (m *memoryProfilesRepo) ListSavedSitesForUser(_ context.Context, _ string) ([]profilesrepo.SavedSite, error) {
	return []profilesrepo.SavedSite{}, nil
}

func (m *memoryProfilesRepo) ListSavedUsersForUser(_ context.Context, _ string) ([]profilesrepo.SavedUser, error) {
	return []profilesrepo.SavedUser{}, nil
}

func (m *memoryProfilesRepo) GetProfileViewByUsername(_ context.Context, username, _ string) (profilesrepo.ProfileView, error) {
	return profilesrepo.ProfileView{
		UserID:         "550e8400-e29b-41d4-a716-446655440099",
		Username:       username,
		DisplayName:    "Member User",
		Bio:            "Bio",
		AvatarURL:      "https://example.com/avatar.jpg",
		CreatedAt:      time.Now().UTC(),
		PostsCount:     2,
		FollowersCount: 3,
		FollowingCount: 4,
	}, nil
}

func (m *memoryProfilesRepo) ListProfileBucketListByUsername(_ context.Context, _ string, _ int32) ([]profilesrepo.ProfileBucketListItem, error) {
	return []profilesrepo.ProfileBucketListItem{}, nil
}

func (m *memoryProfilesRepo) ListProfileDivingByUsername(_ context.Context, _ string, _ string) (profilesrepo.ProfileDiving, error) {
	return profilesrepo.ProfileDiving{}, nil
}

func (m *memoryProfilesRepo) GetProfileDiveMapByUsername(_ context.Context, _ string, _ string) (profilesrepo.ProfileDiveMap, error) {
	return profilesrepo.ProfileDiveMap{Markers: []profilesrepo.ProfileDiveMapMarker{}}, nil
}

func (m *memoryProfilesRepo) GetProfileDiveMapSiteByUsername(_ context.Context, _ string, _ string, _ string) (profilesrepo.ProfileDiveMapSiteDetail, error) {
	return profilesrepo.ProfileDiveMapSiteDetail{}, nil
}

func (m *memoryProfilesRepo) ListBadgeTemplates(_ context.Context) ([]profilesrepo.BadgeTemplate, error) {
	return []profilesrepo.BadgeTemplate{}, nil
}

func (m *memoryProfilesRepo) GetBadgeTemplate(_ context.Context, _ string) (profilesrepo.BadgeTemplate, error) {
	return profilesrepo.BadgeTemplate{}, nil
}

func (m *memoryProfilesRepo) ListUserBadgesByUserID(_ context.Context, _ string) ([]profilesrepo.UserBadge, error) {
	return []profilesrepo.UserBadge{}, nil
}

func (m *memoryProfilesRepo) ListProfileBadgesByUsername(_ context.Context, _ string) ([]profilesrepo.UserBadge, error) {
	return []profilesrepo.UserBadge{}, nil
}

func (m *memoryProfilesRepo) CreateUserBadge(_ context.Context, _ profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error) {
	return profilesrepo.UserBadge{}, nil
}

func (m *memoryProfilesRepo) UpdateUserBadge(_ context.Context, _ profilesrepo.UpsertUserBadgeInput) (profilesrepo.UserBadge, error) {
	return profilesrepo.UserBadge{}, nil
}

func (m *memoryProfilesRepo) DeleteUserBadge(_ context.Context, _, _ string) error {
	return nil
}

func (m *memoryProfilesRepo) CountDiveSitesVisitedByUsername(_ context.Context, _ string) (int64, error) {
	return 0, nil
}

func (m *memoryProfilesRepo) CountDiveSitesVisitedByUserID(_ context.Context, _ string) (int64, error) {
	return 0, nil
}

func (m *memoryProfilesRepo) UserOwnsProofMedia(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

type denyAfterLimiter struct {
	limit int
	count int
}

func (l *denyAfterLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	l.count++
	if l.count > l.limit {
		return sharedratelimit.Result{Allowed: false, RetryAfter: 2 * time.Second}, nil
	}
	return sharedratelimit.Result{Allowed: true}, nil
}

func (s *stubProfilesService) GetProfileByUserID(_ context.Context, userID string) (profilesservice.Profile, error) {
	return profilesservice.Profile{
		UserID:      userID,
		Username:    "member",
		DisplayName: "Member User",
		Bio:         "Bio",
		AvatarURL:   "https://example.com/avatar.jpg",
		Location:    "Metro Manila",
		Socials:     map[string]string{"website": "https://example.com"},
	}, nil
}

func (s *stubProfilesService) UpdateMyProfile(_ context.Context, input profilesservice.UpdateMyProfileInput) (profilesservice.Profile, error) {
	displayName := "Member User"
	if input.DisplayName != nil {
		displayName = strings.TrimSpace(*input.DisplayName)
	}
	return profilesservice.Profile{
		UserID:      input.ActorID,
		Username:    "member",
		DisplayName: displayName,
		Bio:         "Bio",
		AvatarURL:   "https://example.com/avatar.jpg",
		Location:    "Metro Manila",
		Socials:     map[string]string{"website": "https://example.com"},
	}, nil
}

func (s *stubProfilesService) SearchUsers(_ context.Context, _ string, query string, _ int32) ([]profilesservice.Profile, error) {
	if strings.TrimSpace(query) == "" {
		return []profilesservice.Profile{}, nil
	}
	return []profilesservice.Profile{{
		UserID:      "550e8400-e29b-41d4-a716-446655440001",
		Username:    "buddy",
		DisplayName: "Buddy User",
		AvatarURL:   "https://example.com/buddy.jpg",
		Location:    "Cebu",
		Socials:     map[string]string{},
	}}, nil
}

func (s *stubProfilesService) GetSavedHub(_ context.Context, _ string) (profilesservice.SavedHub, error) {
	return profilesservice.SavedHub{
		Sites: []profilesrepo.SavedSite{{
			ID:      "550e8400-e29b-41d4-a716-446655440021",
			Slug:    "twin-rocks-anilao",
			Name:    "Twin Rocks",
			Area:    "Mabini, Batangas",
			SavedAt: time.Now().UTC().Format(time.RFC3339),
		}},
		Users: []profilesrepo.SavedUser{{
			UserID:      "550e8400-e29b-41d4-a716-446655440022",
			Username:    "buddy",
			DisplayName: "Buddy User",
			SavedAt:     time.Now().UTC().Format(time.RFC3339),
		}},
	}, nil
}

func (s *stubProfilesService) GetProfileViewByUsername(_ context.Context, username, _ string) (profilesservice.ProfileView, error) {
	return profilesservice.ProfileView{
		UserID:      "550e8400-e29b-41d4-a716-446655440011",
		Username:    username,
		DisplayName: "Member User",
		Bio:         "Bio",
		AvatarURL:   "https://example.com/avatar.jpg",
		CreatedAt:   time.Now().UTC(),
		Counts: profilesservice.ProfileViewCounts{
			MediaPosts: 2,
			Followers:  3,
			Following:  4,
		},
		Viewer: profilesservice.ProfileViewerRelationship{},
	}, nil
}

func (s *stubProfilesService) ListProfileBucketListByUsername(_ context.Context, _ string, _ int32) ([]profilesservice.ProfileBucketListItem, error) {
	return []profilesservice.ProfileBucketListItem{
		{
			SiteID:   "550e8400-e29b-41d4-a716-446655440071",
			SiteSlug: "cathedral-cove",
			SiteName: "Cathedral Cove",
			SiteArea: "Anilao",
			PinnedAt: time.Now().UTC().Format(time.RFC3339),
			HasDived: true,
		},
	}, nil
}

func (s *stubProfilesService) GetProfileDivingByUsername(_ context.Context, _ string, _ string) (profilesservice.ProfileDiving, error) {
	now := time.Now().UTC()
	return profilesservice.ProfileDiving{
		Presences: []profilesservice.ProfileDivePresence{{
			ID:               "550e8400-e29b-41d4-a716-446655440081",
			DiveSiteID:       "550e8400-e29b-41d4-a716-446655440082",
			DiveSiteSlug:     "napaling-reef",
			DiveSiteName:     "Napaling Reef",
			DiveSiteArea:     "Panglao, Bohol",
			PresenceType:     "available",
			Visibility:       "public",
			ContactEnabled:   true,
			ViewerCanContact: true,
			Note:             "Morning dive",
			CreatedAt:        now,
		}},
		Affinities: []profilesservice.ProfileDiveSiteAffinity{{
			ID:               "550e8400-e29b-41d4-a716-446655440083",
			DiveSiteID:       "550e8400-e29b-41d4-a716-446655440082",
			DiveSiteSlug:     "napaling-reef",
			DiveSiteName:     "Napaling Reef",
			DiveSiteArea:     "Panglao, Bohol",
			Relationship:     "regular",
			Visibility:       "public",
			ContactEnabled:   false,
			ViewerCanContact: false,
			Note:             "Weekend regular",
			CreatedAt:        now,
			UpdatedAt:        now,
		}},
	}, nil
}

func (s *stubProfilesService) GetProfileDiveMapByUsername(_ context.Context, _ string, _ string) (profilesservice.ProfileDiveMap, error) {
	now := time.Now().UTC()
	return profilesservice.ProfileDiveMap{
		VisitedSiteCount: 1,
		Markers: []profilesservice.ProfileDiveMapMarker{{
			DiveSiteID:       "550e8400-e29b-41d4-a716-446655440092",
			DiveSiteSlug:     "napaling-reef",
			DiveSiteName:     "Napaling Reef",
			DiveSiteArea:     "Panglao, Bohol",
			FirstPostID:      "550e8400-e29b-41d4-a716-446655440093",
			FirstVisitedAt:   now,
			LastPostID:       "550e8400-e29b-41d4-a716-446655440093",
			LastVisitedAt:    now,
			MediaPostCount:   1,
			Visibility:       "members",
			UnlockedAt:       now,
			LastProofAddedAt: now,
		}},
	}, nil
}

func (s *stubProfilesService) GetProfileDiveMapSiteByUsername(_ context.Context, _ string, _ string, _ string) (profilesservice.ProfileDiveMapSiteDetail, error) {
	now := time.Now().UTC()
	marker := profilesservice.ProfileDiveMapMarker{
		DiveSiteID:       "550e8400-e29b-41d4-a716-446655440092",
		DiveSiteSlug:     "napaling-reef",
		DiveSiteName:     "Napaling Reef",
		DiveSiteArea:     "Panglao, Bohol",
		FirstPostID:      "550e8400-e29b-41d4-a716-446655440093",
		FirstVisitedAt:   now,
		LastPostID:       "550e8400-e29b-41d4-a716-446655440093",
		LastVisitedAt:    now,
		MediaPostCount:   1,
		Visibility:       "members",
		UnlockedAt:       now,
		LastProofAddedAt: now,
	}
	return profilesservice.ProfileDiveMapSiteDetail{
		Marker: marker,
		Media: []profilesservice.ProfileDiveMapProofMedia{{
			PostID:        "550e8400-e29b-41d4-a716-446655440093",
			MediaItemID:   "550e8400-e29b-41d4-a716-446655440094",
			MediaObjectID: "550e8400-e29b-41d4-a716-446655440095",
			Type:          "photo",
			URL:           "profile-feed/napaling.jpg",
			MimeType:      "image/jpeg",
			Width:         1200,
			Height:        900,
			CreatedAt:     now,
		}},
		Memories: []profilesservice.ProfileDiveMapMemory{{
			ID:           "550e8400-e29b-41d4-a716-446655440096",
			AuthorUserID: "550e8400-e29b-41d4-a716-446655440000",
			DiveSiteID:   marker.DiveSiteID,
			Title:        "Clear water memory",
			MediaIDs:     []string{},
			Visibility:   "public",
			OccurredAt:   now,
			CreatedAt:    now,
			UpdatedAt:    now,
		}},
	}, nil
}

func TestProfilesEndpointsAuthPermissionAndSuccess(t *testing.T) {
	v := validatex.New()
	h := New(&stubProfilesService{}, v)

	t.Run("401 signed out", func(t *testing.T) {
		router := chi.NewRouter()
		router.Use(middleware.RequireMember)
		router.Mount("/", Routes(h))

		cases := []struct {
			method string
			path   string
			body   string
		}{
			{method: http.MethodGet, path: "/me/profile"},
			{method: http.MethodGet, path: "/me/saved"},
			{method: http.MethodPatch, path: "/me/profile", body: `{"displayName":"New Name"}`},
		}

		for _, tc := range cases {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			if tc.body != "" {
				req.Header.Set("Content-Type", "application/json")
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401 for %s %s, got %d", tc.method, tc.path, rec.Code)
			}
		}
	})

	t.Run("403 missing permission", func(t *testing.T) {
		router := buildProfilesRouter(h, authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions:   map[authz.Permission]bool{},
		})

		readReq := httptest.NewRequest(http.MethodGet, "/me/profile", nil)
		readRec := httptest.NewRecorder()
		router.ServeHTTP(readRec, readReq)
		if readRec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing profiles.read, got %d", readRec.Code)
		}

		writeReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"displayName":"New Name"}`))
		writeReq.Header.Set("Content-Type", "application/json")
		writeRec := httptest.NewRecorder()
		router.ServeHTTP(writeRec, writeReq)
		if writeRec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for missing profiles.write, got %d", writeRec.Code)
		}
	})

	t.Run("200 happy path", func(t *testing.T) {
		router := buildProfilesRouter(h, authz.Identity{
			UserID:        "550e8400-e29b-41d4-a716-446655440000",
			GlobalRole:    "member",
			AccountStatus: "active",
			Permissions: map[authz.Permission]bool{
				authz.PermissionProfilesRead:  true,
				authz.PermissionProfilesWrite: true,
			},
		})

		getMeReq := httptest.NewRequest(http.MethodGet, "/me/profile", nil)
		getMeRec := httptest.NewRecorder()
		router.ServeHTTP(getMeRec, getMeReq)
		if getMeRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /me/profile, got %d", getMeRec.Code)
		}

		savedReq := httptest.NewRequest(http.MethodGet, "/me/saved", nil)
		savedRec := httptest.NewRecorder()
		router.ServeHTTP(savedRec, savedReq)
		if savedRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /me/saved, got %d", savedRec.Code)
		}

		patchReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"displayName":"Updated Name"}`))
		patchReq.Header.Set("Content-Type", "application/json")
		patchRec := httptest.NewRecorder()
		router.ServeHTTP(patchRec, patchReq)
		if patchRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for PATCH /me/profile, got %d", patchRec.Code)
		}

	})
}

func TestProfileDivingEndpointIsPublicAndReturnsSeparatePresenceAndAffinityLists(t *testing.T) {
	v := validatex.New()
	h := New(&stubProfilesService{}, v)
	router := chi.NewRouter()
	router.Get("/profiles/{username}/diving", h.GetProfileDivingByUsername)

	req := httptest.NewRequest(http.MethodGet, "/profiles/member/diving", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for public profile diving, got %d: %s", rec.Code, rec.Body.String())
	}

	var body ProfileDivingResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode profile diving response: %v", err)
	}
	if len(body.Presences) != 1 || body.Presences[0].PresenceType != "available" {
		t.Fatalf("expected presence list, got %+v", body.Presences)
	}
	if body.Presences[0].DiveSiteSlug != "napaling-reef" || body.Presences[0].DiveSiteName != "Napaling Reef" {
		t.Fatalf("expected presence dive-site data, got %+v", body.Presences[0])
	}
	if len(body.Affinities) != 1 || body.Affinities[0].Relationship != "regular" {
		t.Fatalf("expected affinity list, got %+v", body.Affinities)
	}
	if body.Affinities[0].DiveSiteSlug != "napaling-reef" || body.Affinities[0].DiveSiteName != "Napaling Reef" {
		t.Fatalf("expected affinity dive-site data, got %+v", body.Affinities[0])
	}
}

func TestProfileDiveMapEndpointsReturnMarkersAndProofMedia(t *testing.T) {
	v := validatex.New()
	h := New(&stubProfilesService{}, v)
	router := chi.NewRouter()
	router.Get("/profiles/{username}/dive-map", h.GetProfileDiveMapByUsername)
	router.Get("/profiles/{username}/dive-map/{siteID}", h.GetProfileDiveMapSiteByUsername)

	listReq := httptest.NewRequest(http.MethodGet, "/profiles/member/dive-map", nil)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for profile dive map, got %d: %s", listRec.Code, listRec.Body.String())
	}
	var listBody ProfileDiveMapResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("decode profile dive map response: %v", err)
	}
	if listBody.VisitedSiteCount != 1 || len(listBody.Markers) != 1 || listBody.Markers[0].MediaPostCount != 1 {
		t.Fatalf("expected proof marker list, got %+v", listBody)
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/profiles/member/dive-map/550e8400-e29b-41d4-a716-446655440092", nil)
	detailRec := httptest.NewRecorder()
	router.ServeHTTP(detailRec, detailReq)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for profile dive map site, got %d: %s", detailRec.Code, detailRec.Body.String())
	}
	var detailBody ProfileDiveMapSiteResponse
	if err := json.Unmarshal(detailRec.Body.Bytes(), &detailBody); err != nil {
		t.Fatalf("decode profile dive map site response: %v", err)
	}
	if detailBody.Marker.DiveSiteSlug != "napaling-reef" || len(detailBody.Media) != 1 || detailBody.Media[0].Type != "photo" || len(detailBody.Memories) != 1 {
		t.Fatalf("expected proof media detail, got %+v", detailBody)
	}
	if detailBody.Memories[0].Title != "Clear water memory" {
		t.Fatalf("expected marker memory preview, got %+v", detailBody.Memories)
	}
}

func (s *stubProfilesService) GetMyBadges(_ context.Context, _ string) (profilesservice.ProfileBadges, error) {
	return profilesservice.ProfileBadges{}, nil
}

func (s *stubProfilesService) GetProfileBadgesByUsername(_ context.Context, _ string) (profilesservice.ProfileBadges, error) {
	return profilesservice.ProfileBadges{}, nil
}

func (s *stubProfilesService) CreateUserBadge(_ context.Context, _ profilesservice.UpsertUserBadgeInput) (profilesservice.UserBadge, error) {
	return profilesservice.UserBadge{}, nil
}

func (s *stubProfilesService) UpdateUserBadge(_ context.Context, _ profilesservice.UpsertUserBadgeInput) (profilesservice.UserBadge, error) {
	return profilesservice.UserBadge{}, nil
}

func (s *stubProfilesService) DeleteUserBadge(_ context.Context, _, _ string) error {
	return nil
}

func TestPatchProfileValidationReturnsApiErrorIssues(t *testing.T) {
	v := validatex.New()
	h := New(&stubProfilesService{}, v)
	router := buildProfilesRouter(h, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionProfilesRead:  true,
			authz.PermissionProfilesWrite: true,
		},
	})

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"avatarUrl":"`+strings.Repeat("a", 501)+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}

	errorObj, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error object, got %v", payload["error"])
	}
	if errorObj["code"] != "validation_error" {
		t.Fatalf("expected validation_error, got %v", errorObj["code"])
	}
	issues, ok := errorObj["issues"].([]any)
	if !ok || len(issues) == 0 {
		t.Fatalf("expected non-empty issues, got %v", errorObj["issues"])
	}
}

func TestPatchProfileRateLimitedContract(t *testing.T) {
	v := validatex.New()
	limiter := &denyAfterLimiter{limit: 1}
	svc := profilesservice.New(&memoryProfilesRepo{}, profilesservice.WithLimiter(limiter))
	h := New(svc, v)
	router := buildProfilesRouter(h, authz.Identity{
		UserID:        "550e8400-e29b-41d4-a716-446655440000",
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionProfilesRead:  true,
			authz.PermissionProfilesWrite: true,
		},
	})

	body := `{"displayName":"Updated Name"}`
	firstReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusOK {
		t.Fatalf("first patch expected 200, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second patch expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	retryAfterHeader := secondRec.Header().Get("Retry-After")
	if retryAfterHeader == "" {
		t.Fatal("expected Retry-After header for 429 response")
	}

	var payload map[string]any
	if err := json.Unmarshal(secondRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	errorObj, _ := payload["error"].(map[string]any)
	if errorObj["code"] != "rate_limited" {
		t.Fatalf("expected rate_limited code, got %v", errorObj["code"])
	}
	details, _ := errorObj["details"].(map[string]any)
	windowSeconds, windowOK := details["window_seconds"].(float64)
	retryAfterSeconds, retryOK := details["retry_after_seconds"].(float64)
	if !windowOK || windowSeconds < 1 {
		t.Fatalf("expected positive details.window_seconds, got %+v", details)
	}
	if !retryOK || retryAfterSeconds < 1 {
		t.Fatalf("expected positive details.retry_after_seconds, got %+v", details)
	}
	if retryAfterHeader != strconv.Itoa(int(retryAfterSeconds)) {
		t.Fatalf("expected Retry-After=%v to match details.retry_after_seconds=%v", retryAfterHeader, retryAfterSeconds)
	}
}

func buildProfilesRouter(h *Handlers, identity authz.Identity) chi.Router {
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
