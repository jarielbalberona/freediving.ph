package http

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	reportsrepo "fphgo/internal/features/reports/repo"
	reportsservice "fphgo/internal/features/reports/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/authz"
	sharedratelimit "fphgo/internal/shared/ratelimit"
	"fphgo/internal/shared/validatex"
)

type memoryReportsRepo struct {
	reports        map[string]reportsrepo.Report
	events         map[string][]reportsrepo.ReportEvent
	users          map[string]bool
	messageAuthors map[string]string
	threadAuthors  map[string]string
	commentAuthors map[string]string
	updateAuthors  map[string]string
	nextCreatedAt  time.Time
}

func newMemoryReportsRepo() *memoryReportsRepo {
	return &memoryReportsRepo{
		reports:        map[string]reportsrepo.Report{},
		events:         map[string][]reportsrepo.ReportEvent{},
		users:          map[string]bool{},
		messageAuthors: map[string]string{},
		threadAuthors:  map[string]string{},
		commentAuthors: map[string]string{},
		updateAuthors:  map[string]string{},
		nextCreatedAt:  time.Now().UTC().Add(-1 * time.Minute),
	}
}

func (m *memoryReportsRepo) CreateReport(_ context.Context, input reportsrepo.CreateReportInput) (reportsrepo.Report, error) {
	now := m.nextCreatedAt
	m.nextCreatedAt = m.nextCreatedAt.Add(time.Second)
	id := uuid.NewString()
	targetID := ""
	if input.TargetUUID != nil {
		targetID = *input.TargetUUID
	}
	if input.TargetBigint != nil {
		targetID = strconv.FormatInt(*input.TargetBigint, 10)
	}
	report := reportsrepo.Report{
		ID:              id,
		ReporterUserID:  input.ReporterUserID,
		TargetType:      input.TargetType,
		TargetID:        targetID,
		TargetAppUserID: input.TargetAppUserID,
		ReasonCode:      input.ReasonCode,
		Details:         input.Details,
		EvidenceURLs:    input.EvidenceURLs,
		Status:          "open",
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	m.reports[id] = report
	return report, nil
}

func (m *memoryReportsRepo) GetReportByID(_ context.Context, reportID string) (reportsrepo.Report, error) {
	report, ok := m.reports[reportID]
	if !ok {
		return reportsrepo.Report{}, pgx.ErrNoRows
	}
	return report, nil
}

func (m *memoryReportsRepo) ListReportsForModeration(_ context.Context, input reportsrepo.ListReportsInput) ([]reportsrepo.Report, error) {
	items := make([]reportsrepo.Report, 0, len(m.reports))
	for _, item := range m.reports {
		if input.StatusFilter != nil && *input.StatusFilter != item.Status {
			continue
		}
		if input.TargetType != nil && *input.TargetType != item.TargetType {
			continue
		}
		if input.ReporterUserID != nil && *input.ReporterUserID != item.ReporterUserID {
			continue
		}
		if item.CreatedAt.After(input.CursorCreatedAt) || (item.CreatedAt.Equal(input.CursorCreatedAt) && item.ID >= input.CursorID) {
			continue
		}
		items = append(items, item)
	}

	// sort desc createdAt/id
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			swap := items[j].CreatedAt.After(items[i].CreatedAt) ||
				(items[j].CreatedAt.Equal(items[i].CreatedAt) && items[j].ID > items[i].ID)
			if swap {
				items[i], items[j] = items[j], items[i]
			}
		}
	}

	limit := int(input.Limit)
	if limit < len(items) {
		return items[:limit], nil
	}
	return items, nil
}

func (m *memoryReportsRepo) ListReportEventsByReportID(_ context.Context, reportID string) ([]reportsrepo.ReportEvent, error) {
	items := m.events[reportID]
	out := make([]reportsrepo.ReportEvent, len(items))
	copy(out, items)
	return out, nil
}

func (m *memoryReportsRepo) AddReportEvent(_ context.Context, reportID, actorID, eventType string, fromStatus, toStatus, note *string) (reportsrepo.ReportEvent, error) {
	event := reportsrepo.ReportEvent{
		ID:          uuid.NewString(),
		ReportID:    reportID,
		ActorUserID: actorID,
		EventType:   eventType,
		FromStatus:  value(fromStatus),
		ToStatus:    value(toStatus),
		Note:        value(note),
		CreatedAt:   time.Now().UTC(),
	}
	m.events[reportID] = append(m.events[reportID], event)
	return event, nil
}

func (m *memoryReportsRepo) UpdateReportStatus(_ context.Context, reportID, status string) (reportsrepo.Report, error) {
	report, ok := m.reports[reportID]
	if !ok {
		return reportsrepo.Report{}, pgx.ErrNoRows
	}
	report.Status = status
	report.UpdatedAt = time.Now().UTC()
	m.reports[reportID] = report
	return report, nil
}

func (m *memoryReportsRepo) FindRecentReportByReporterAndTarget(_ context.Context, reporterID, targetType string, targetUUID *string, targetBigint *int64, since time.Time) (bool, time.Time, error) {
	targetID := ""
	if targetUUID != nil {
		targetID = *targetUUID
	}
	if targetBigint != nil {
		targetID = strconv.FormatInt(*targetBigint, 10)
	}
	var latest time.Time
	found := false
	for _, report := range m.reports {
		if report.ReporterUserID != reporterID || report.TargetType != targetType || report.TargetID != targetID {
			continue
		}
		if report.CreatedAt.Before(since) {
			continue
		}
		if !found || report.CreatedAt.After(latest) {
			latest = report.CreatedAt
			found = true
		}
	}
	return found, latest, nil
}

func (m *memoryReportsRepo) CountReportsByReporterSince(_ context.Context, reporterID string, since time.Time) (int64, error) {
	var count int64
	for _, report := range m.reports {
		if report.ReporterUserID == reporterID && (report.CreatedAt.Equal(since) || report.CreatedAt.After(since)) {
			count++
		}
	}
	return count, nil
}

func (m *memoryReportsRepo) ResolveTargetAuthor(_ context.Context, targetType string, targetUUID *string, targetBigint *int64) (string, error) {
	targetID := ""
	if targetUUID != nil {
		targetID = *targetUUID
	}
	if targetBigint != nil {
		targetID = strconv.FormatInt(*targetBigint, 10)
	}
	switch targetType {
	case "user":
		if m.users[targetID] {
			return targetID, nil
		}
	case "message":
		if author, ok := m.messageAuthors[targetID]; ok {
			return author, nil
		}
	case "chika_thread":
		if author, ok := m.threadAuthors[targetID]; ok {
			return author, nil
		}
	case "chika_comment":
		if author, ok := m.commentAuthors[targetID]; ok {
			return author, nil
		}
	case "dive_site_update":
		if author, ok := m.updateAuthors[targetID]; ok {
			return author, nil
		}
	}
	return "", pgx.ErrNoRows
}

func TestCreateReportAuthAndPermission(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	targetID := "550e8400-e29b-41d4-a716-446655440001"

	repo := newMemoryReportsRepo()
	repo.users[targetID] = true
	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())

	unauthRouter := chi.NewRouter()
	unauthRouter.Use(middleware.RequireMember)
	unauthRouter.Mount("/", Routes(h))

	body := `{"targetType":"user","targetId":"` + targetID + `","reasonCode":"spam"}`
	unauthReq := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	unauthReq.Header.Set("Content-Type", "application/json")
	unauthRec := httptest.NewRecorder()
	unauthRouter.ServeHTTP(unauthRec, unauthReq)
	if unauthRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", unauthRec.Code)
	}

	noPermRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions:   map[authz.Permission]bool{},
	})
	noPermReq := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	noPermReq.Header.Set("Content-Type", "application/json")
	noPermRec := httptest.NewRecorder()
	noPermRouter.ServeHTTP(noPermRec, noPermReq)
	if noPermRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", noPermRec.Code)
	}

	allowedRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})
	okReq := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	okReq.Header.Set("Content-Type", "application/json")
	okRec := httptest.NewRecorder()
	allowedRouter.ServeHTTP(okRec, okReq)
	if okRec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", okRec.Code)
	}
}

func TestCreateReportCooldown(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	targetID := "550e8400-e29b-41d4-a716-446655440001"
	repo := newMemoryReportsRepo()
	repo.users[targetID] = true

	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())
	router := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})

	body := `{"targetType":"user","targetId":"` + targetID + `","reasonCode":"spam"}`
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if i == 0 && rec.Code != http.StatusCreated {
			t.Fatalf("first create expected 201, got %d", rec.Code)
		}
		if i == 1 {
			if rec.Code != http.StatusTooManyRequests {
				t.Fatalf("second create expected 429, got %d", rec.Code)
			}
			retryAfterHeader := rec.Header().Get("Retry-After")
			if retryAfterHeader == "" {
				t.Fatal("expected Retry-After header for 429 response")
			}
			var payload map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
				t.Fatalf("decode response: %v", err)
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
	}
}

func TestCreateReportInvalidTargetIDType(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	repo := newMemoryReportsRepo()

	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())
	router := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})

	body := `{"targetType":"message","targetId":"550e8400-e29b-41d4-a716-446655440001","reasonCode":"spam"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
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
	if !ok || errorObj["code"] != "validation_error" {
		t.Fatalf("expected validation_error, got %v", payload)
	}
	issues, ok := errorObj["issues"].([]any)
	if !ok || len(issues) == 0 {
		t.Fatalf("expected issues in payload, got %v", payload)
	}
}

func TestCreateReportCreatesAuditEvent(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	targetID := "550e8400-e29b-41d4-a716-446655440001"
	repo := newMemoryReportsRepo()
	repo.users[targetID] = true

	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())
	router := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
			authz.PermissionReportsRead:  true,
		},
	})

	reportID := createReport(t, router, `{"targetType":"user","targetId":"`+targetID+`","reasonCode":"spam"}`)
	detailReq := httptest.NewRequest(http.MethodGet, "/"+reportID, nil)
	detailRec := httptest.NewRecorder()
	router.ServeHTTP(detailRec, detailReq)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 detail, got %d", detailRec.Code)
	}

	var detailPayload map[string]any
	if err := json.Unmarshal(detailRec.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	events, ok := detailPayload["events"].([]any)
	if !ok || len(events) == 0 {
		t.Fatalf("expected events, got %v", detailPayload["events"])
	}
	first, _ := events[0].(map[string]any)
	if first["eventType"] != "created" {
		t.Fatalf("expected created event, got %v", first["eventType"])
	}
}

func TestCreateReportSupportsDiveSiteUpdateTargets(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	updateID := "550e8400-e29b-41d4-a716-446655440099"
	authorID := "550e8400-e29b-41d4-a716-446655440001"
	repo := newMemoryReportsRepo()
	repo.updateAuthors[updateID] = authorID

	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())
	router := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})

	body := `{"targetType":"dive_site_update","targetId":"` + updateID + `","reasonCode":"unsafe"}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for dive_site_update report, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestModeratorListAndDetail(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	targetID1 := "550e8400-e29b-41d4-a716-446655440001"
	targetID2 := "550e8400-e29b-41d4-a716-446655440002"
	repo := newMemoryReportsRepo()
	repo.users[targetID1] = true
	repo.users[targetID2] = true

	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())
	writerRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})

	id1 := createReport(t, writerRouter, `{"targetType":"user","targetId":"`+targetID1+`","reasonCode":"spam"}`)
	_ = createReport(t, writerRouter, `{"targetType":"user","targetId":"`+targetID2+`","reasonCode":"harassment"}`)

	noReadRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})
	noReadReq := httptest.NewRequest(http.MethodGet, "/", nil)
	noReadRec := httptest.NewRecorder()
	noReadRouter.ServeHTTP(noReadRec, noReadReq)
	if noReadRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without reports.read, got %d", noReadRec.Code)
	}

	modRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "moderator",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsRead: true,
		},
	})
	listReq := httptest.NewRequest(http.MethodGet, "/?limit=1", nil)
	listRec := httptest.NewRecorder()
	modRouter.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", listRec.Code)
	}

	var listPayload map[string]any
	if err := json.Unmarshal(listRec.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	items, ok := listPayload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one item in list, got %v", listPayload["items"])
	}
	nextCursor, ok := listPayload["nextCursor"].(string)
	if !ok || strings.TrimSpace(nextCursor) == "" {
		t.Fatalf("expected nextCursor, got %v", listPayload["nextCursor"])
	}
	if _, err := base64.RawURLEncoding.DecodeString(nextCursor); err != nil {
		t.Fatalf("nextCursor should be valid base64: %v", err)
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/"+id1, nil)
	detailRec := httptest.NewRecorder()
	modRouter.ServeHTTP(detailRec, detailReq)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 detail, got %d", detailRec.Code)
	}

	var detailPayload map[string]any
	if err := json.Unmarshal(detailRec.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	if _, ok := detailPayload["report"].(map[string]any); !ok {
		t.Fatalf("expected report object, got %v", detailPayload)
	}
	if _, ok := detailPayload["events"].([]any); !ok {
		t.Fatalf("expected events array, got %v", detailPayload)
	}
}

func TestStatusTransitionsAndAuditEvents(t *testing.T) {
	reporterID := "550e8400-e29b-41d4-a716-446655440000"
	targetID := "550e8400-e29b-41d4-a716-446655440001"
	moderatorID := "550e8400-e29b-41d4-a716-446655440099"
	repo := newMemoryReportsRepo()
	repo.users[targetID] = true
	svc := reportsservice.New(repo)
	h := New(svc, validatex.New())

	writerRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})
	reportID := createReport(t, writerRouter, `{"targetType":"user","targetId":"`+targetID+`","reasonCode":"unsafe"}`)

	modRouter := buildReportsRouter(h, authz.Identity{
		UserID:        moderatorID,
		GlobalRole:    "moderator",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsRead:     true,
			authz.PermissionReportsModerate: true,
		},
	})

	validReq := httptest.NewRequest(http.MethodPatch, "/"+reportID+"/status", bytes.NewBufferString(`{"status":"resolved","note":"confirmed"}`))
	validReq.Header.Set("Content-Type", "application/json")
	validRec := httptest.NewRecorder()
	modRouter.ServeHTTP(validRec, validReq)
	if validRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", validRec.Code, validRec.Body.String())
	}

	invalidReq := httptest.NewRequest(http.MethodPatch, "/"+reportID+"/status", bytes.NewBufferString(`{"status":"reviewing"}`))
	invalidReq.Header.Set("Content-Type", "application/json")
	invalidRec := httptest.NewRecorder()
	modRouter.ServeHTTP(invalidRec, invalidReq)
	if invalidRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 on invalid transition, got %d", invalidRec.Code)
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/"+reportID, nil)
	detailRec := httptest.NewRecorder()
	modRouter.ServeHTTP(detailRec, detailReq)
	if detailRec.Code != http.StatusOK {
		t.Fatalf("expected 200 detail, got %d", detailRec.Code)
	}

	var detailPayload map[string]any
	if err := json.Unmarshal(detailRec.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	events, ok := detailPayload["events"].([]any)
	if !ok || len(events) < 2 {
		t.Fatalf("expected at least 2 events, got %v", detailPayload["events"])
	}
}

func createReport(t *testing.T, router chi.Router, body string) string {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create report expected 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	id, _ := payload["id"].(string)
	if id == "" {
		t.Fatalf("expected report id in payload: %v", payload)
	}
	return id
}

func buildReportsRouter(h *Handlers, identity authz.Identity) chi.Router {
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

func value(v *string) string {
	if v == nil {
		return ""
	}
	return *v
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

func TestReportUpdateStatusRateLimitedContract(t *testing.T) {
	moderatorID := "550e8400-e29b-41d4-a716-446655440000"
	reporterID := "550e8400-e29b-41d4-a716-446655440001"
	targetID := "550e8400-e29b-41d4-a716-446655440002"

	repo := newMemoryReportsRepo()
	repo.users[targetID] = true
	repo.users[reporterID] = true

	limiter := &denyAfterLimiter{limit: 1}
	svc := reportsservice.New(repo, reportsservice.WithLimiter(limiter))
	h := New(svc, validatex.New())

	reporterRouter := buildReportsRouter(h, authz.Identity{
		UserID:        reporterID,
		GlobalRole:    "member",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsWrite: true,
		},
	})

	report1Body := `{"targetType":"user","targetId":"` + targetID + `","reasonCode":"spam"}`
	report1ID := createReport(t, reporterRouter, report1Body)

	moderatorRouter := buildReportsRouter(h, authz.Identity{
		UserID:        moderatorID,
		GlobalRole:    "moderator",
		AccountStatus: "active",
		Permissions: map[authz.Permission]bool{
			authz.PermissionReportsRead:     true,
			authz.PermissionReportsModerate: true,
		},
	})

	statusBody := []byte(`{"status":"reviewing"}`)
	firstReq := httptest.NewRequest(http.MethodPatch, "/"+report1ID+"/status", bytes.NewReader(statusBody))
	firstReq.Header.Set("Content-Type", "application/json")
	firstRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(firstRec, firstReq)
	if firstRec.Code != http.StatusOK {
		t.Fatalf("first update expected 200, got %d body=%s", firstRec.Code, firstRec.Body.String())
	}

	resolveBody := []byte(`{"status":"resolved"}`)
	secondReq := httptest.NewRequest(http.MethodPatch, "/"+report1ID+"/status", bytes.NewReader(resolveBody))
	secondReq.Header.Set("Content-Type", "application/json")
	secondRec := httptest.NewRecorder()
	moderatorRouter.ServeHTTP(secondRec, secondReq)
	if secondRec.Code != http.StatusTooManyRequests {
		t.Fatalf("second update expected 429, got %d body=%s", secondRec.Code, secondRec.Body.String())
	}
	if secondRec.Header().Get("Retry-After") == "" {
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
}
