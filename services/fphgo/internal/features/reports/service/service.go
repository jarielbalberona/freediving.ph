package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	reportsrepo "fphgo/internal/features/reports/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

const (
	defaultReportCooldownWindow = 24 * time.Hour
	defaultDailyReportCap       = int64(20)
)

type Service struct {
	repo           repository
	cooldownWindow time.Duration
	dailyReportCap int64
}

type repository interface {
	CreateReport(ctx context.Context, input reportsrepo.CreateReportInput) (reportsrepo.Report, error)
	GetReportByID(ctx context.Context, reportID string) (reportsrepo.Report, error)
	ListReportsForModeration(ctx context.Context, input reportsrepo.ListReportsInput) ([]reportsrepo.Report, error)
	ListReportEventsByReportID(ctx context.Context, reportID string) ([]reportsrepo.ReportEvent, error)
	AddReportEvent(ctx context.Context, reportID, actorID, eventType string, fromStatus, toStatus, note *string) (reportsrepo.ReportEvent, error)
	UpdateReportStatus(ctx context.Context, reportID, status string) (reportsrepo.Report, error)
	FindRecentReportByReporterAndTarget(ctx context.Context, reporterID, targetType string, targetUUID *string, targetBigint *int64, since time.Time) (bool, time.Time, error)
	CountReportsByReporterSince(ctx context.Context, reporterID string, since time.Time) (int64, error)
	ResolveTargetAuthor(ctx context.Context, targetType string, targetUUID *string, targetBigint *int64) (string, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type CreateReportInput struct {
	ReporterUserID string
	TargetType     string
	TargetID       string
	ReasonCode     string
	Details        string
	EvidenceURLs   []string
}

type ListReportsInput struct {
	Status         *string
	TargetType     *string
	ReporterUserID *string
	Limit          int32
	Cursor         string
}

type StatusUpdateInput struct {
	ActorUserID string
	ReportID    string
	Status      string
	Note        string
}

type Report struct {
	ID              string
	ReporterUserID  string
	TargetType      string
	TargetID        string
	TargetAppUserID string
	ReasonCode      string
	Details         string
	EvidenceURLs    []string
	Status          string
	CreatedAt       string
	UpdatedAt       string
}

type ReportEvent struct {
	ID          string
	ReportID    string
	ActorUserID string
	EventType   string
	FromStatus  string
	ToStatus    string
	Note        string
	CreatedAt   string
}

type ReportDetail struct {
	Report Report
	Events []ReportEvent
}

type ReportListResult struct {
	Items      []Report
	NextCursor string
}

type Config struct {
	CooldownWindow time.Duration
	DailyReportCap int64
}

func New(repo repository, cfgs ...Config) *Service {
	cfg := Config{
		CooldownWindow: defaultReportCooldownWindow,
		DailyReportCap: defaultDailyReportCap,
	}
	if len(cfgs) > 0 {
		if cfgs[0].CooldownWindow > 0 {
			cfg.CooldownWindow = cfgs[0].CooldownWindow
		}
		if cfgs[0].DailyReportCap > 0 {
			cfg.DailyReportCap = cfgs[0].DailyReportCap
		}
	}
	return &Service{
		repo:           repo,
		cooldownWindow: cfg.CooldownWindow,
		dailyReportCap: cfg.DailyReportCap,
	}
}

func (s *Service) CreateReport(ctx context.Context, input CreateReportInput) (Report, error) {
	if _, err := uuid.Parse(input.ReporterUserID); err != nil {
		return Report{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if issues := validateCreateInput(input); len(issues) > 0 {
		return Report{}, ValidationFailure{Issues: issues}
	}
	targetUUID, targetBigint, issues := parseTypedTargetID(input.TargetType, input.TargetID)
	if len(issues) > 0 {
		return Report{}, ValidationFailure{Issues: issues}
	}

	targetAuthorID, err := s.repo.ResolveTargetAuthor(ctx, input.TargetType, targetUUID, targetBigint)
	if err != nil {
		if reportsrepo.IsNoRows(err) {
			return Report{}, apperrors.New(http.StatusNotFound, "not_found", "target not found", err)
		}
		return Report{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"targetId"},
			Code:    "custom",
			Message: "invalid targetId for targetType",
		}}}
	}

	if input.TargetType == "user" && targetAuthorID == input.ReporterUserID {
		return Report{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"targetId"},
			Code:    "custom",
			Message: "cannot report yourself",
		}}}
	}

	now := time.Now().UTC()
	recentExists, recentAt, err := s.repo.FindRecentReportByReporterAndTarget(
		ctx,
		input.ReporterUserID,
		input.TargetType,
		targetUUID,
		targetBigint,
		now.Add(-s.cooldownWindow),
	)
	if err != nil {
		return Report{}, apperrors.New(http.StatusInternalServerError, "report_cooldown_check_failed", "failed to check report cooldown", err)
	}
	if recentExists {
		retryAt := recentAt.Add(s.cooldownWindow)
		retryAfterSeconds := secondsUntil(now, retryAt)
		return Report{}, apperrors.NewRateLimited(
			fmt.Sprintf("report cooldown active; retry after %s", retryAt.Format(time.RFC3339)),
			int(s.cooldownWindow.Seconds()),
			retryAfterSeconds,
		)
	}

	dailyCount, err := s.repo.CountReportsByReporterSince(ctx, input.ReporterUserID, beginningOfDay(now))
	if err != nil {
		return Report{}, apperrors.New(http.StatusInternalServerError, "report_cap_check_failed", "failed to check daily report cap", err)
	}
	if dailyCount >= s.dailyReportCap {
		retryAt := nextDayStart(now)
		return Report{}, apperrors.NewRateLimited("daily report cap reached", 86400, secondsUntil(now, retryAt))
	}

	created, err := s.repo.CreateReport(ctx, reportsrepo.CreateReportInput{
		ReporterUserID:  input.ReporterUserID,
		TargetType:      input.TargetType,
		TargetUUID:      targetUUID,
		TargetBigint:    targetBigint,
		TargetAppUserID: targetAuthorID,
		ReasonCode:      input.ReasonCode,
		Details:         strings.TrimSpace(input.Details),
		EvidenceURLs:    input.EvidenceURLs,
	})
	if err != nil {
		return Report{}, apperrors.New(http.StatusInternalServerError, "report_create_failed", "failed to create report", err)
	}

	if _, err := s.repo.AddReportEvent(ctx, created.ID, input.ReporterUserID, "created", nil, ptr("open"), nil); err != nil {
		return Report{}, apperrors.New(http.StatusInternalServerError, "report_event_create_failed", "failed to write report event", err)
	}

	return mapReport(created), nil
}

func (s *Service) ListReportsForModeration(ctx context.Context, input ListReportsInput) (ReportListResult, error) {
	if input.ReporterUserID != nil && strings.TrimSpace(*input.ReporterUserID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(*input.ReporterUserID)); err != nil {
			return ReportListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"reporterUserId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			}}}
		}
	}
	if input.Status != nil && !isValidStatus(strings.TrimSpace(*input.Status)) {
		return ReportListResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"status"},
			Code:    "invalid_enum",
			Message: "Must be one of: open reviewing resolved rejected",
		}}}
	}
	if input.TargetType != nil && !isValidTargetType(strings.TrimSpace(*input.TargetType)) {
		return ReportListResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"targetType"},
			Code:    "invalid_enum",
			Message: "Must be one of: user message chika_thread chika_comment",
		}}}
	}
	if input.Limit <= 0 || input.Limit > 100 {
		input.Limit = pagination.DefaultLimit
	}

	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		createdAt, id, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ReportListResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = createdAt
		cursorID = id
	}

	rows, err := s.repo.ListReportsForModeration(ctx, reportsrepo.ListReportsInput{
		CursorCreatedAt: cursorCreated,
		CursorID:        cursorID,
		Limit:           input.Limit + 1,
		StatusFilter:    input.Status,
		TargetType:      input.TargetType,
		ReporterUserID:  input.ReporterUserID,
	})
	if err != nil {
		return ReportListResult{}, apperrors.New(http.StatusInternalServerError, "report_list_failed", "failed to list reports", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}

	items := make([]Report, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapReport(row))
	}

	return ReportListResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) GetReportDetail(ctx context.Context, reportID string) (ReportDetail, error) {
	if _, err := uuid.Parse(reportID); err != nil {
		return ReportDetail{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"reportId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}

	report, err := s.repo.GetReportByID(ctx, reportID)
	if err != nil {
		if reportsrepo.IsNoRows(err) {
			return ReportDetail{}, apperrors.New(http.StatusNotFound, "not_found", "report not found", err)
		}
		return ReportDetail{}, apperrors.New(http.StatusInternalServerError, "report_get_failed", "failed to get report", err)
	}
	events, err := s.repo.ListReportEventsByReportID(ctx, reportID)
	if err != nil {
		return ReportDetail{}, apperrors.New(http.StatusInternalServerError, "report_events_get_failed", "failed to get report events", err)
	}

	mappedEvents := make([]ReportEvent, 0, len(events))
	for _, event := range events {
		mappedEvents = append(mappedEvents, mapEvent(event))
	}

	return ReportDetail{Report: mapReport(report), Events: mappedEvents}, nil
}

func (s *Service) UpdateStatus(ctx context.Context, input StatusUpdateInput) (ReportDetail, error) {
	if _, err := uuid.Parse(input.ActorUserID); err != nil {
		return ReportDetail{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(input.ReportID); err != nil {
		return ReportDetail{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"reportId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	status := strings.TrimSpace(input.Status)
	if !isValidStatus(status) {
		return ReportDetail{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"status"},
			Code:    "invalid_enum",
			Message: "Must be one of: reviewing resolved rejected",
		}}}
	}

	existing, err := s.repo.GetReportByID(ctx, input.ReportID)
	if err != nil {
		if reportsrepo.IsNoRows(err) {
			return ReportDetail{}, apperrors.New(http.StatusNotFound, "not_found", "report not found", err)
		}
		return ReportDetail{}, apperrors.New(http.StatusInternalServerError, "report_get_failed", "failed to get report", err)
	}

	if !isValidTransition(existing.Status, status) {
		return ReportDetail{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"status"},
			Code:    "custom",
			Message: fmt.Sprintf("invalid status transition: %s -> %s", existing.Status, status),
		}}}
	}

	updated, err := s.repo.UpdateReportStatus(ctx, input.ReportID, status)
	if err != nil {
		return ReportDetail{}, apperrors.New(http.StatusInternalServerError, "report_status_update_failed", "failed to update report status", err)
	}
	note := ptr(strings.TrimSpace(input.Note))
	if note != nil && *note == "" {
		note = nil
	}
	if _, err := s.repo.AddReportEvent(ctx, input.ReportID, input.ActorUserID, "status_changed", ptr(existing.Status), ptr(status), note); err != nil {
		return ReportDetail{}, apperrors.New(http.StatusInternalServerError, "report_event_create_failed", "failed to write report event", err)
	}

	return s.GetReportDetail(ctx, updated.ID)
}

func validateCreateInput(input CreateReportInput) []validatex.Issue {
	issues := []validatex.Issue{}

	if !isValidTargetType(input.TargetType) {
		issues = append(issues, validatex.Issue{Path: []any{"targetType"}, Code: "invalid_enum", Message: "Must be one of: user message chika_thread chika_comment"})
	}
	if !isValidReasonCode(input.ReasonCode) {
		issues = append(issues, validatex.Issue{Path: []any{"reasonCode"}, Code: "invalid_enum", Message: "Must be one of: spam harassment impersonation unsafe other"})
	}
	if strings.TrimSpace(input.TargetID) == "" {
		issues = append(issues, validatex.Issue{Path: []any{"targetId"}, Code: "required", Message: "This field is required"})
	}

	for index, url := range input.EvidenceURLs {
		if strings.TrimSpace(url) == "" || !strings.HasPrefix(url, "http") {
			issues = append(issues, validatex.Issue{Path: []any{"evidenceUrls", index}, Code: "invalid_url", Message: "Must be a valid URL"})
		}
	}

	return issues
}

func parseTypedTargetID(targetType, targetID string) (*string, *int64, []validatex.Issue) {
	trimmed := strings.TrimSpace(targetID)
	if trimmed == "" {
		return nil, nil, []validatex.Issue{{
			Path:    []any{"targetId"},
			Code:    "required",
			Message: "This field is required",
		}}
	}
	switch strings.TrimSpace(targetType) {
	case "user", "chika_thread":
		parsed, err := uuid.Parse(trimmed)
		if err != nil {
			return nil, nil, []validatex.Issue{{Path: []any{"targetId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}
		}
		value := parsed.String()
		return &value, nil, nil
	case "message", "chika_comment":
		parsed, err := strconv.ParseInt(trimmed, 10, 64)
		if err != nil || parsed <= 0 {
			return nil, nil, []validatex.Issue{{Path: []any{"targetId"}, Code: "invalid_type", Message: "Must be a valid int64 id"}}
		}
		return nil, &parsed, nil
	default:
		return nil, nil, []validatex.Issue{{Path: []any{"targetType"}, Code: "invalid_enum", Message: "Must be one of: user message chika_thread chika_comment"}}
	}
}

func isValidTargetType(value string) bool {
	switch strings.TrimSpace(value) {
	case "user", "message", "chika_thread", "chika_comment":
		return true
	default:
		return false
	}
}

func isValidReasonCode(value string) bool {
	switch strings.TrimSpace(value) {
	case "spam", "harassment", "impersonation", "unsafe", "other":
		return true
	default:
		return false
	}
}

func isValidStatus(value string) bool {
	switch strings.TrimSpace(value) {
	case "open", "reviewing", "resolved", "rejected":
		return true
	default:
		return false
	}
}

func isValidTransition(from, to string) bool {
	from = strings.TrimSpace(from)
	to = strings.TrimSpace(to)
	if from == to {
		return true
	}
	switch from {
	case "open":
		return to == "reviewing" || to == "resolved" || to == "rejected"
	case "reviewing":
		return to == "resolved" || to == "rejected"
	case "resolved", "rejected":
		return false
	default:
		return false
	}
}

func mapReport(item reportsrepo.Report) Report {
	return Report{
		ID:              item.ID,
		ReporterUserID:  item.ReporterUserID,
		TargetType:      item.TargetType,
		TargetID:        item.TargetID,
		TargetAppUserID: item.TargetAppUserID,
		ReasonCode:      item.ReasonCode,
		Details:         item.Details,
		EvidenceURLs:    item.EvidenceURLs,
		Status:          item.Status,
		CreatedAt:       item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       item.UpdatedAt.Format(time.RFC3339),
	}
}

func mapEvent(item reportsrepo.ReportEvent) ReportEvent {
	return ReportEvent{
		ID:          item.ID,
		ReportID:    item.ReportID,
		ActorUserID: item.ActorUserID,
		EventType:   item.EventType,
		FromStatus:  item.FromStatus,
		ToStatus:    item.ToStatus,
		Note:        item.Note,
		CreatedAt:   item.CreatedAt.Format(time.RFC3339),
	}
}

func beginningOfDay(now time.Time) time.Time {
	y, m, d := now.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, now.Location())
}

func nextDayStart(now time.Time) time.Time {
	return beginningOfDay(now).Add(24 * time.Hour)
}

func secondsUntil(now, then time.Time) int {
	seconds := int(then.Sub(now).Seconds())
	if seconds < 1 {
		return 1
	}
	return seconds
}

func ptr(value string) *string {
	return &value
}
