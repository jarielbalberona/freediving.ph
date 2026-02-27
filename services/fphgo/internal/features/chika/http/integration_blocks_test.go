package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	chikarepo "fphgo/internal/features/chika/repo"
	chikaservice "fphgo/internal/features/chika/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type filteredChikaRepo struct {
	threads          []chikarepo.Thread
	comments         []chikarepo.Comment
	hiddenThreadIDs  map[string]bool
	hiddenCommentIDs map[int64]bool
	blocks           map[string]bool
}

func (r *filteredChikaRepo) CreateThread(context.Context, string, string, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{}, nil
}
func (r *filteredChikaRepo) ListThreads(_ context.Context, viewerID string, includeHidden bool, cursorCreated time.Time, cursorThreadID string, limit int32) ([]chikarepo.Thread, error) {
	out := make([]chikarepo.Thread, 0, len(r.threads))
	for _, item := range r.threads {
		if r.isBlocked(viewerID, item.CreatedByUserID) {
			continue
		}
		if !includeHidden && r.hiddenThreadIDs[item.ID] {
			continue
		}
		if item.CreatedAt.After(cursorCreated) || (item.CreatedAt.Equal(cursorCreated) && item.ID >= cursorThreadID) {
			continue
		}
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID > out[j].ID
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	if int(limit) < len(out) {
		out = out[:limit]
	}
	return out, nil
}
func (r *filteredChikaRepo) GetThread(context.Context, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{ID: "550e8400-e29b-41d4-a716-446655440099", CreatedByUserID: "550e8400-e29b-41d4-a716-446655440003", CreatedAt: time.Now(), UpdatedAt: time.Now()}, nil
}
func (r *filteredChikaRepo) UpdateThread(context.Context, string, string) (chikarepo.Thread, error) {
	return chikarepo.Thread{}, nil
}
func (r *filteredChikaRepo) SoftDeleteThread(context.Context, string) error { return nil }
func (r *filteredChikaRepo) CreatePost(context.Context, string, string, string, string) (chikarepo.Post, error) {
	return chikarepo.Post{}, nil
}
func (r *filteredChikaRepo) ListPosts(context.Context, string, string, int32, int32) ([]chikarepo.Post, error) {
	return []chikarepo.Post{}, nil
}
func (r *filteredChikaRepo) CreateComment(context.Context, string, string, string, string) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (r *filteredChikaRepo) ListComments(_ context.Context, _ string, viewerID string, includeHidden bool, cursorCreated time.Time, cursorCommentID int64, limit int32) ([]chikarepo.Comment, error) {
	out := make([]chikarepo.Comment, 0, len(r.comments))
	for _, item := range r.comments {
		if r.isBlocked(viewerID, item.AuthorUserID) {
			continue
		}
		if !includeHidden && r.hiddenCommentIDs[item.ID] {
			continue
		}
		if item.CreatedAt.After(cursorCreated) || (item.CreatedAt.Equal(cursorCreated) && item.ID >= cursorCommentID) {
			continue
		}
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID > out[j].ID
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	if int(limit) < len(out) {
		out = out[:limit]
	}
	return out, nil
}
func (r *filteredChikaRepo) GetComment(context.Context, int64) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (r *filteredChikaRepo) UpdateComment(context.Context, int64, string) (chikarepo.Comment, error) {
	return chikarepo.Comment{}, nil
}
func (r *filteredChikaRepo) SoftDeleteComment(context.Context, int64) error { return nil }
func (r *filteredChikaRepo) SetThreadReaction(context.Context, string, string, string) (chikarepo.Reaction, error) {
	return chikarepo.Reaction{}, nil
}
func (r *filteredChikaRepo) RemoveThreadReaction(context.Context, string, string) error { return nil }
func (r *filteredChikaRepo) CreateMediaAsset(context.Context, chikarepo.CreateMediaAssetInput) (chikarepo.MediaAsset, error) {
	return chikarepo.MediaAsset{}, nil
}
func (r *filteredChikaRepo) ListMediaByEntity(context.Context, string, string) ([]chikarepo.MediaAsset, error) {
	return []chikarepo.MediaAsset{}, nil
}
func (r *filteredChikaRepo) EntityExists(context.Context, string, string) (bool, error) {
	return true, nil
}
func (r *filteredChikaRepo) PseudonymEnabled(context.Context, string) (bool, error) { return true, nil }
func (r *filteredChikaRepo) Username(context.Context, string) (string, error)       { return "user", nil }

func (r *filteredChikaRepo) isBlocked(a, b string) bool {
	return r.blocks[a+":"+b] || r.blocks[b+":"+a]
}

func TestChikaReadFiltersBlockedAuthors(t *testing.T) {
	viewerID := "550e8400-e29b-41d4-a716-446655440000"
	blockedID := "550e8400-e29b-41d4-a716-446655440001"
	visibleID := "550e8400-e29b-41d4-a716-446655440002"

	repo := &filteredChikaRepo{
		blocks: map[string]bool{
			viewerID + ":" + blockedID: true,
		},
		threads: []chikarepo.Thread{
			{ID: "550e8400-e29b-41d4-a716-446655440010", Title: "blocked", Mode: "normal", CreatedByUserID: blockedID, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: "550e8400-e29b-41d4-a716-446655440011", Title: "visible", Mode: "normal", CreatedByUserID: visibleID, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
		comments: []chikarepo.Comment{
			{ID: 1, ThreadID: "550e8400-e29b-41d4-a716-446655440099", AuthorUserID: blockedID, Pseudonym: "p1", Content: "blocked", CreatedAt: time.Now()},
			{ID: 2, ThreadID: "550e8400-e29b-41d4-a716-446655440099", AuthorUserID: visibleID, Pseudonym: "p2", Content: "visible", CreatedAt: time.Now()},
		},
		hiddenThreadIDs:  map[string]bool{},
		hiddenCommentIDs: map[int64]bool{},
	}

	svc := chikaservice.New(repo, nil)
	h := New(svc, validatex.New())
	router := buildChikaReadRouter(h, viewerID, "member")

	threadsReq := httptest.NewRequest(http.MethodGet, "/threads", nil)
	threadsRec := httptest.NewRecorder()
	router.ServeHTTP(threadsRec, threadsReq)
	if threadsRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for threads, got %d", threadsRec.Code)
	}
	var threadsPayload struct {
		Items []ThreadResponse `json:"items"`
	}
	if err := json.Unmarshal(threadsRec.Body.Bytes(), &threadsPayload); err != nil {
		t.Fatalf("decode threads response: %v", err)
	}
	if len(threadsPayload.Items) != 1 || threadsPayload.Items[0].CreatedByUserID != visibleID {
		t.Fatalf("expected only visible thread author, got %+v", threadsPayload.Items)
	}

	commentsReq := httptest.NewRequest(http.MethodGet, "/threads/550e8400-e29b-41d4-a716-446655440099/comments", nil)
	commentsRec := httptest.NewRecorder()
	router.ServeHTTP(commentsRec, commentsReq)
	if commentsRec.Code != http.StatusOK {
		t.Fatalf("expected 200 for comments, got %d", commentsRec.Code)
	}
	var commentsPayload struct {
		Items []CommentResponse `json:"items"`
	}
	if err := json.Unmarshal(commentsRec.Body.Bytes(), &commentsPayload); err != nil {
		t.Fatalf("decode comments response: %v", err)
	}
	if len(commentsPayload.Items) != 1 || commentsPayload.Items[0].Pseudonym != "p2" {
		t.Fatalf("expected only visible author comment, got %+v", commentsPayload.Items)
	}
}

func TestChikaReadHiddenContentMemberVsModerator(t *testing.T) {
	viewerID := "550e8400-e29b-41d4-a716-446655440000"
	authorID := "550e8400-e29b-41d4-a716-446655440002"
	hiddenThreadID := "550e8400-e29b-41d4-a716-446655440010"
	visibleThreadID := "550e8400-e29b-41d4-a716-446655440011"
	hiddenAt := time.Now().UTC().Add(-10 * time.Minute)

	repo := &filteredChikaRepo{
		blocks: map[string]bool{},
		threads: []chikarepo.Thread{
			{ID: hiddenThreadID, Title: "hidden", Mode: "normal", CreatedByUserID: authorID, HiddenAt: &hiddenAt, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: visibleThreadID, Title: "visible", Mode: "normal", CreatedByUserID: authorID, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
		comments: []chikarepo.Comment{
			{ID: 1, ThreadID: "550e8400-e29b-41d4-a716-446655440099", AuthorUserID: authorID, Pseudonym: "hidden", Content: "hidden", HiddenAt: &hiddenAt, CreatedAt: time.Now()},
			{ID: 2, ThreadID: "550e8400-e29b-41d4-a716-446655440099", AuthorUserID: authorID, Pseudonym: "visible", Content: "visible", CreatedAt: time.Now()},
		},
		hiddenThreadIDs: map[string]bool{
			hiddenThreadID: true,
		},
		hiddenCommentIDs: map[int64]bool{
			1: true,
		},
	}

	svc := chikaservice.New(repo, nil)
	h := New(svc, validatex.New())
	memberRouter := buildChikaReadRouter(h, viewerID, "member")
	modRouter := buildChikaReadRouter(h, viewerID, "moderator")

	memberThreadsReq := httptest.NewRequest(http.MethodGet, "/threads", nil)
	memberThreadsRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(memberThreadsRec, memberThreadsReq)
	if memberThreadsRec.Code != http.StatusOK {
		t.Fatalf("expected member threads status 200, got %d", memberThreadsRec.Code)
	}
	var memberThreadsPayload struct {
		Items []ThreadResponse `json:"items"`
	}
	if err := json.Unmarshal(memberThreadsRec.Body.Bytes(), &memberThreadsPayload); err != nil {
		t.Fatalf("decode member threads: %v", err)
	}
	if len(memberThreadsPayload.Items) != 1 || memberThreadsPayload.Items[0].ID != visibleThreadID {
		t.Fatalf("expected only visible thread for member, got %+v", memberThreadsPayload.Items)
	}
	if memberThreadsPayload.Items[0].IsHidden || memberThreadsPayload.Items[0].HiddenAt != "" {
		t.Fatalf("expected member thread payload to be visible-only, got %+v", memberThreadsPayload.Items[0])
	}

	modThreadsReq := httptest.NewRequest(http.MethodGet, "/threads", nil)
	modThreadsRec := httptest.NewRecorder()
	modRouter.ServeHTTP(modThreadsRec, modThreadsReq)
	if modThreadsRec.Code != http.StatusOK {
		t.Fatalf("expected moderator threads status 200, got %d", modThreadsRec.Code)
	}
	var modThreadsPayload struct {
		Items []ThreadResponse `json:"items"`
	}
	if err := json.Unmarshal(modThreadsRec.Body.Bytes(), &modThreadsPayload); err != nil {
		t.Fatalf("decode moderator threads: %v", err)
	}
	if len(modThreadsPayload.Items) != 2 {
		t.Fatalf("expected hidden+visible threads for moderator, got %+v", modThreadsPayload.Items)
	}
	threadsByID := map[string]ThreadResponse{}
	for _, item := range modThreadsPayload.Items {
		threadsByID[item.ID] = item
	}
	if !threadsByID[hiddenThreadID].IsHidden || threadsByID[hiddenThreadID].HiddenAt == "" {
		t.Fatalf("expected moderator hidden marker for thread, got %+v", threadsByID[hiddenThreadID])
	}
	if threadsByID[visibleThreadID].IsHidden || threadsByID[visibleThreadID].HiddenAt != "" {
		t.Fatalf("expected visible marker for non-hidden thread, got %+v", threadsByID[visibleThreadID])
	}

	memberCommentsReq := httptest.NewRequest(http.MethodGet, "/threads/550e8400-e29b-41d4-a716-446655440099/comments", nil)
	memberCommentsRec := httptest.NewRecorder()
	memberRouter.ServeHTTP(memberCommentsRec, memberCommentsReq)
	if memberCommentsRec.Code != http.StatusOK {
		t.Fatalf("expected member comments status 200, got %d", memberCommentsRec.Code)
	}
	var memberCommentsPayload struct {
		Items []CommentResponse `json:"items"`
	}
	if err := json.Unmarshal(memberCommentsRec.Body.Bytes(), &memberCommentsPayload); err != nil {
		t.Fatalf("decode member comments: %v", err)
	}
	if len(memberCommentsPayload.Items) != 1 || memberCommentsPayload.Items[0].Pseudonym != "visible" {
		t.Fatalf("expected only visible comment for member, got %+v", memberCommentsPayload.Items)
	}
	if memberCommentsPayload.Items[0].IsHidden || memberCommentsPayload.Items[0].HiddenAt != "" {
		t.Fatalf("expected member comment payload to be visible-only, got %+v", memberCommentsPayload.Items[0])
	}

	modCommentsReq := httptest.NewRequest(http.MethodGet, "/threads/550e8400-e29b-41d4-a716-446655440099/comments", nil)
	modCommentsRec := httptest.NewRecorder()
	modRouter.ServeHTTP(modCommentsRec, modCommentsReq)
	if modCommentsRec.Code != http.StatusOK {
		t.Fatalf("expected moderator comments status 200, got %d", modCommentsRec.Code)
	}
	var modCommentsPayload struct {
		Items []CommentResponse `json:"items"`
	}
	if err := json.Unmarshal(modCommentsRec.Body.Bytes(), &modCommentsPayload); err != nil {
		t.Fatalf("decode moderator comments: %v", err)
	}
	if len(modCommentsPayload.Items) != 2 {
		t.Fatalf("expected hidden+visible comments for moderator, got %+v", modCommentsPayload.Items)
	}
	commentsByPseudonym := map[string]CommentResponse{}
	for _, item := range modCommentsPayload.Items {
		commentsByPseudonym[item.Pseudonym] = item
	}
	if !commentsByPseudonym["hidden"].IsHidden || commentsByPseudonym["hidden"].HiddenAt == "" {
		t.Fatalf("expected moderator hidden marker for comment, got %+v", commentsByPseudonym["hidden"])
	}
	if commentsByPseudonym["visible"].IsHidden || commentsByPseudonym["visible"].HiddenAt != "" {
		t.Fatalf("expected visible marker for non-hidden comment, got %+v", commentsByPseudonym["visible"])
	}
}

type denyAfterLimiter struct {
	limit int
	count int
}

func (l *denyAfterLimiter) Allow(context.Context, string, string, int, time.Duration) (sharedratelimit.Result, error) {
	l.count++
	if l.count > l.limit {
		return sharedratelimit.Result{Allowed: false, RetryAfter: time.Second}, nil
	}
	return sharedratelimit.Result{Allowed: true}, nil
}

func TestChikaCreateCommentRateLimited(t *testing.T) {
	viewerID := "550e8400-e29b-41d4-a716-446655440000"
	repo := &filteredChikaRepo{
		blocks:           map[string]bool{},
		threads:          []chikarepo.Thread{},
		comments:         []chikarepo.Comment{},
		hiddenThreadIDs:  map[string]bool{},
		hiddenCommentIDs: map[int64]bool{},
	}
	limiter := &denyAfterLimiter{limit: 1}
	svc := chikaservice.New(repo, nil, chikaservice.WithLimiter(limiter))
	h := New(svc, validatex.New())
	router := buildChikaReadRouter(h, viewerID, "member")

	body := `{"content":"hello"}`
	threadID := "550e8400-e29b-41d4-a716-446655440099"
	firstReq := httptest.NewRequest(http.MethodPost, "/threads/"+threadID+"/comments", strings.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusCreated {
		t.Fatalf("first create expected 201, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/threads/"+threadID+"/comments", strings.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second create expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	retryAfterHeader := secondRec.Header().Get("Retry-After")
	if retryAfterHeader == "" {
		t.Fatal("expected Retry-After header for 429 response")
	}

	var payload map[string]any
	if err := json.Unmarshal(secondRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errObj, _ := payload["error"].(map[string]any)
	if errObj["code"] != "rate_limited" {
		t.Fatalf("expected rate_limited code, got %v", errObj["code"])
	}
	details, _ := errObj["details"].(map[string]any)
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

func TestChikaCreatePostRateLimitedContract(t *testing.T) {
	viewerID := "550e8400-e29b-41d4-a716-446655440000"
	repo := &filteredChikaRepo{
		blocks:           map[string]bool{},
		threads:          []chikarepo.Thread{},
		comments:         []chikarepo.Comment{},
		hiddenThreadIDs:  map[string]bool{},
		hiddenCommentIDs: map[int64]bool{},
	}
	limiter := &denyAfterLimiter{limit: 1}
	svc := chikaservice.New(repo, nil, chikaservice.WithLimiter(limiter))
	h := New(svc, validatex.New())
	router := buildChikaReadRouter(h, viewerID, "member")

	body := `{"content":"hello"}`
	threadID := "550e8400-e29b-41d4-a716-446655440099"
	firstReq := httptest.NewRequest(http.MethodPost, "/threads/"+threadID+"/posts", strings.NewReader(body))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	router.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusCreated {
		t.Fatalf("first create expected 201, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/threads/"+threadID+"/posts", strings.NewReader(body))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	router.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second create expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	retryAfterHeader := secondRec.Header().Get("Retry-After")
	if retryAfterHeader == "" {
		t.Fatal("expected Retry-After header for 429 response")
	}

	var payload map[string]any
	if err := json.Unmarshal(secondRec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errObj, _ := payload["error"].(map[string]any)
	if errObj["code"] != "rate_limited" {
		t.Fatalf("expected rate_limited code, got %v", errObj["code"])
	}
	details, _ := errObj["details"].(map[string]any)
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

func TestChikaThreadsCursorPaginationStable(t *testing.T) {
	viewerID := "550e8400-e29b-41d4-a716-446655440000"
	authorID := "550e8400-e29b-41d4-a716-446655440002"
	now := time.Now().UTC()

	repo := &filteredChikaRepo{
		blocks: map[string]bool{},
		threads: []chikarepo.Thread{
			{ID: "550e8400-e29b-41d4-a716-446655440012", Title: "t3", Mode: "normal", CreatedByUserID: authorID, CreatedAt: now.Add(-1 * time.Minute), UpdatedAt: now.Add(-1 * time.Minute)},
			{ID: "550e8400-e29b-41d4-a716-446655440011", Title: "t2", Mode: "normal", CreatedByUserID: authorID, CreatedAt: now.Add(-2 * time.Minute), UpdatedAt: now.Add(-2 * time.Minute)},
			{ID: "550e8400-e29b-41d4-a716-446655440010", Title: "t1", Mode: "normal", CreatedByUserID: authorID, CreatedAt: now.Add(-3 * time.Minute), UpdatedAt: now.Add(-3 * time.Minute)},
		},
		comments:         []chikarepo.Comment{},
		hiddenThreadIDs:  map[string]bool{},
		hiddenCommentIDs: map[int64]bool{},
	}
	svc := chikaservice.New(repo, nil)
	h := New(svc, validatex.New())
	router := buildChikaReadRouter(h, viewerID, "member")

	page1Req := httptest.NewRequest(http.MethodGet, "/threads?limit=2", nil)
	page1Rec := httptest.NewRecorder()
	router.ServeHTTP(page1Rec, page1Req)
	if page1Rec.Code != http.StatusOK {
		t.Fatalf("page1 expected 200, got %d", page1Rec.Code)
	}
	var page1 ListThreadsResponse
	if err := json.Unmarshal(page1Rec.Body.Bytes(), &page1); err != nil {
		t.Fatalf("decode page1: %v", err)
	}
	if len(page1.Items) != 2 {
		t.Fatalf("expected 2 items on page1, got %d", len(page1.Items))
	}
	if page1.NextCursor == "" {
		t.Fatal("expected nextCursor on page1")
	}

	page2Req := httptest.NewRequest(http.MethodGet, "/threads?limit=2&cursor="+page1.NextCursor, nil)
	page2Rec := httptest.NewRecorder()
	router.ServeHTTP(page2Rec, page2Req)
	if page2Rec.Code != http.StatusOK {
		t.Fatalf("page2 expected 200, got %d", page2Rec.Code)
	}
	var page2 ListThreadsResponse
	if err := json.Unmarshal(page2Rec.Body.Bytes(), &page2); err != nil {
		t.Fatalf("decode page2: %v", err)
	}
	if len(page2.Items) != 1 {
		t.Fatalf("expected 1 remaining item on page2, got %d", len(page2.Items))
	}
}

func buildChikaReadRouter(h *Handlers, actorID, role string) chi.Router {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := middleware.WithIdentity(req.Context(), authz.Identity{
				UserID:        actorID,
				GlobalRole:    role,
				AccountStatus: "active",
				Permissions: map[authz.Permission]bool{
					authz.PermissionChikaRead:  true,
					authz.PermissionChikaWrite: true,
				},
			})
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Use(middleware.RequireMember)
	r.Use(middleware.RequirePermission(authz.PermissionChikaRead))
	r.Mount("/", Routes(h))
	return r
}
