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

func (m *memoryProfilesRepo) GetPublicProfileByUsername(_ context.Context, username string) (profilesrepo.PublicProfile, error) {
	return profilesrepo.PublicProfile{
		UserID:         "550e8400-e29b-41d4-a716-446655440099",
		Username:       username,
		DisplayName:    "Member User",
		Bio:            "Bio",
		AvatarURL:      "https://example.com/avatar.jpg",
		PostsCount:     2,
		FollowersCount: 3,
		FollowingCount: 4,
	}, nil
}

func (m *memoryProfilesRepo) ListPublicProfilePostsByUsername(_ context.Context, _ string, _ int32) ([]profilesrepo.PublicProfilePost, error) {
	return []profilesrepo.PublicProfilePost{}, nil
}

func (m *memoryProfilesRepo) ListProfileBucketListByUsername(_ context.Context, _ string, _ int32) ([]profilesrepo.ProfileBucketListItem, error) {
	return []profilesrepo.ProfileBucketListItem{}, nil
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

func (s *stubProfilesService) GetPublicProfileByUsername(_ context.Context, username string) (profilesservice.PublicProfile, error) {
	return profilesservice.PublicProfile{
		UserID:      "550e8400-e29b-41d4-a716-446655440011",
		Username:    username,
		DisplayName: "Member User",
		Bio:         "Bio",
		AvatarURL:   "https://example.com/avatar.jpg",
		Counts: profilesservice.PublicProfileCounts{
			Posts:     2,
			Followers: 3,
			Following: 4,
		},
	}, nil
}

func (s *stubProfilesService) ListPublicProfilePostsByUsername(_ context.Context, _ string, _ int32) ([]profilesservice.PublicProfilePost, error) {
	return []profilesservice.PublicProfilePost{
		{
			ID:           "550e8400-e29b-41d4-a716-446655440061",
			SiteID:       "550e8400-e29b-41d4-a716-446655440062",
			SiteSlug:     "twin-rocks-anilao",
			SiteName:     "Twin Rocks",
			SiteArea:     "Mabini, Batangas",
			Caption:      "Great visibility today",
			OccurredAt:   time.Now().UTC().Format(time.RFC3339),
			MediaType:    "image",
			ThumbURL:     "",
			LikeCount:    0,
			CommentCount: 0,
		},
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
			{method: http.MethodGet, path: "/profiles/550e8400-e29b-41d4-a716-446655440000"},
			{method: http.MethodGet, path: "/profiles/by-username/member"},
			{method: http.MethodGet, path: "/profiles/by-username/member/posts"},
			{method: http.MethodGet, path: "/profiles/by-username/member/bucketlist"},
			{method: http.MethodGet, path: "/users/search?q=member"},
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

		byIDReq := httptest.NewRequest(http.MethodGet, "/profiles/550e8400-e29b-41d4-a716-446655440000", nil)
		byIDRec := httptest.NewRecorder()
		router.ServeHTTP(byIDRec, byIDReq)
		if byIDRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /profiles/{userID}, got %d", byIDRec.Code)
		}

		byUsernameReq := httptest.NewRequest(http.MethodGet, "/profiles/by-username/member", nil)
		byUsernameRec := httptest.NewRecorder()
		router.ServeHTTP(byUsernameRec, byUsernameReq)
		if byUsernameRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /profiles/by-username/{username}, got %d", byUsernameRec.Code)
		}

		postsReq := httptest.NewRequest(http.MethodGet, "/profiles/by-username/member/posts", nil)
		postsRec := httptest.NewRecorder()
		router.ServeHTTP(postsRec, postsReq)
		if postsRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /profiles/by-username/{username}/posts, got %d", postsRec.Code)
		}

		bucketReq := httptest.NewRequest(http.MethodGet, "/profiles/by-username/member/bucketlist", nil)
		bucketRec := httptest.NewRecorder()
		router.ServeHTTP(bucketRec, bucketReq)
		if bucketRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /profiles/by-username/{username}/bucketlist, got %d", bucketRec.Code)
		}

		searchReq := httptest.NewRequest(http.MethodGet, "/users/search?q=member", nil)
		searchRec := httptest.NewRecorder()
		router.ServeHTTP(searchRec, searchReq)
		if searchRec.Code != http.StatusOK {
			t.Fatalf("expected 200 for GET /users/search, got %d", searchRec.Code)
		}
	})
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
