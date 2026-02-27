package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	reportsservice "fphgo/internal/features/reports/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *reportsservice.Service
	validator httpx.Validator
}

func New(service *reportsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) CreateReport(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[CreateReportRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	report, err := h.service.CreateReport(r.Context(), reportsservice.CreateReportInput{
		ReporterUserID: actorID,
		TargetType:     req.TargetType,
		TargetID:       req.TargetID,
		ReasonCode:     req.ReasonCode,
		Details:        req.Details,
		EvidenceURLs:   req.EvidenceURLs,
	})
	if err != nil {
		var validationErr reportsservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	httpx.JSON(w, http.StatusCreated, CreateReportResponse{
		ID:     report.ID,
		Status: report.Status,
	})
}

func (h *Handlers) ListReports(w http.ResponseWriter, r *http.Request) {
	input, issues, ok := parseListInput(r)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	result, err := h.service.ListReportsForModeration(r.Context(), input)
	if err != nil {
		var validationErr reportsservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	items := make([]Report, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapReport(item))
	}

	httpx.JSON(w, http.StatusOK, ListReportsResponse{
		Items:      items,
		NextCursor: result.NextCursor,
	})
}

func (h *Handlers) GetReport(w http.ResponseWriter, r *http.Request) {
	reportID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "reportId"), "reportId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	detail, err := h.service.GetReportDetail(r.Context(), reportID)
	if err != nil {
		var validationErr reportsservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	events := make([]ReportEvent, 0, len(detail.Events))
	for _, event := range detail.Events {
		events = append(events, mapEvent(event))
	}

	httpx.JSON(w, http.StatusOK, ReportDetailResponse{
		Report: mapReport(detail.Report),
		Events: events,
	})
}

func (h *Handlers) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	reportID, issues, ok := httpx.ParseUUIDParam(chi.URLParam(r, "reportId"), "reportId")
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	req, issues, ok := httpx.DecodeAndValidate[UpdateStatusRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}

	detail, err := h.service.UpdateStatus(r.Context(), reportsservice.StatusUpdateInput{
		ActorUserID: actorID,
		ReportID:    reportID,
		Status:      req.Status,
		Note:        req.Note,
	})
	if err != nil {
		var validationErr reportsservice.ValidationFailure
		if errors.As(err, &validationErr) {
			httpx.WriteValidationError(w, validationErr.Issues)
			return
		}
		httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
		return
	}

	var latestEvent *ReportEvent
	if len(detail.Events) > 0 {
		last := mapEvent(detail.Events[len(detail.Events)-1])
		latestEvent = &last
	}

	httpx.JSON(w, http.StatusOK, UpdateStatusResponse{
		Report:      mapReport(detail.Report),
		LatestEvent: latestEvent,
	})
}

func parseListInput(r *http.Request) (reportsservice.ListReportsInput, []validatex.Issue, bool) {
	query := r.URL.Query()
	issues := []validatex.Issue{}

	limit, err := pagination.ParseLimit(strings.TrimSpace(query.Get("limit")), pagination.DefaultLimit, pagination.MaxLimit)
	if err != nil {
		issues = append(issues, validatex.Issue{
			Path:    []any{"limit"},
			Code:    "custom",
			Message: "limit must be a positive integer",
		})
	}

	var reporterID *string
	if raw := strings.TrimSpace(query.Get("reporterUserId")); raw != "" {
		parsed, fieldIssues, ok := httpx.ParseUUIDParam(raw, "reporterUserId")
		if !ok {
			issues = append(issues, fieldIssues...)
		} else {
			reporterID = &parsed
		}
	}

	var status *string
	if raw := strings.TrimSpace(query.Get("status")); raw != "" {
		status = &raw
	}

	var targetType *string
	if raw := strings.TrimSpace(query.Get("targetType")); raw != "" {
		targetType = &raw
	}

	if len(issues) > 0 {
		return reportsservice.ListReportsInput{}, issues, false
	}

	return reportsservice.ListReportsInput{
		Status:         status,
		TargetType:     targetType,
		ReporterUserID: reporterID,
		Limit:          limit,
		Cursor:         strings.TrimSpace(query.Get("cursor")),
	}, nil, true
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func mapReport(input reportsservice.Report) Report {
	return Report{
		ID:              input.ID,
		ReporterUserID:  input.ReporterUserID,
		TargetType:      input.TargetType,
		TargetID:        input.TargetID,
		TargetAppUserID: input.TargetAppUserID,
		ReasonCode:      input.ReasonCode,
		Details:         input.Details,
		EvidenceURLs:    input.EvidenceURLs,
		Status:          input.Status,
		CreatedAt:       input.CreatedAt,
		UpdatedAt:       input.UpdatedAt,
	}
}

func mapEvent(input reportsservice.ReportEvent) ReportEvent {
	return ReportEvent{
		ID:          input.ID,
		ReportID:    input.ReportID,
		ActorUserID: input.ActorUserID,
		EventType:   input.EventType,
		FromStatus:  input.FromStatus,
		ToStatus:    input.ToStatus,
		Note:        input.Note,
		CreatedAt:   input.CreatedAt,
	}
}
