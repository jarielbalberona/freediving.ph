package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	eventsrepo "fphgo/internal/features/events/repo"
	eventsservice "fphgo/internal/features/events/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/mediaurl"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *eventsservice.Service
	validator httpx.Validator
}

func New(service *eventsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func (h *Handlers) ListEvents(w http.ResponseWriter, r *http.Request) {
	viewerID := optionalActorID(r)
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	beginnerFriendly := parseOptionalBoolQuery(r, "beginnerFriendly")
	items, total, err := h.service.ListEvents(
		r.Context(),
		viewerID,
		eventsrepo.ListEventsInput{
			Search:           r.URL.Query().Get("search"),
			Status:           r.URL.Query().Get("status"),
			GroupID:          r.URL.Query().Get("groupId"),
			DiveSiteID:       r.URL.Query().Get("diveSiteId"),
			EventType:        r.URL.Query().Get("type"),
			Difficulty:       r.URL.Query().Get("difficulty"),
			BeginnerFriendly: beginnerFriendly,
			Price:            r.URL.Query().Get("price"),
			Page:             page,
			Limit:            limit,
		},
	)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]EventResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapEvent(item))
	}
	httpx.JSON(w, http.StatusOK, ListEventsResponse{Events: mapped, Pagination: paginate(page, limit, total)})
}

func (h *Handlers) GetEvent(w http.ResponseWriter, r *http.Request) {
	event, err := h.service.GetEventBySlug(r.Context(), chi.URLParam(r, "slug"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventDetailResponse{Event: mapEvent(event)})
}

func (h *Handlers) CreateEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreateEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseRequiredRFC3339(req.StartsAt, "startsAt")
	if err != nil {
		httpx.WriteValidationError(w, err.(eventsservice.ValidationFailure).Issues)
		return
	}
	endsAt, err := parseRequiredRFC3339(req.EndsAt, "endsAt")
	if err != nil {
		httpx.WriteValidationError(w, err.(eventsservice.ValidationFailure).Issues)
		return
	}
	var groupID *string
	if strings.TrimSpace(req.GroupID) != "" {
		value := strings.TrimSpace(req.GroupID)
		groupID = &value
	}
	event, err := h.service.CreateEvent(r.Context(), actorID, eventsrepo.CreateEventInput{
		Title:               req.Title,
		ShortDescription:    req.ShortDescription,
		Description:         req.DescriptionMarkdown,
		DescriptionMarkdown: req.DescriptionMarkdown,
		DiveSiteID:          req.DiveSiteID,
		StartsAt:            startsAt,
		EndsAt:              endsAt,
		Timezone:            req.Timezone,
		Status:              req.Status,
		Visibility:          req.Visibility,
		EventType:           req.Type,
		Difficulty:          req.Difficulty,
		Capacity:            req.Capacity,
		RequiresApproval:    req.RequiresApproval,
		IsPaid:              req.IsPaid,
		PriceAmount:         req.PriceAmount,
		Currency:            req.Currency,
		PaymentInstructions: req.PaymentInstructions,
		MeetingPoint:        req.MeetingPoint,
		BeginnerFriendly:    req.BeginnerFriendly,
		MaxDepthM:           req.MaxDepthM,
		EntryType:           req.EntryType,
		EquipmentNotes:      req.EquipmentNotes,
		SafetyNotes:         req.SafetyNotes,
		CancellationPolicy:  req.CancellationPolicy,
		PaymentMethods:      mapCreatePaymentMethods(req.PaymentMethods),
		OrganizerUserID:     actorID,
		GroupID:             groupID,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, CreateEventResponse{Event: mapEvent(event)})
}

func (h *Handlers) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	eventID := chi.URLParam(r, "eventId")
	req, issues, ok := httpx.DecodeAndValidate[UpdateEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseOptionalRFC3339Ptr(req.StartsAt, "startsAt")
	if err != nil {
		httpx.WriteValidationError(w, err.(eventsservice.ValidationFailure).Issues)
		return
	}
	endsAt, err := parseOptionalRFC3339Ptr(req.EndsAt, "endsAt")
	if err != nil {
		httpx.WriteValidationError(w, err.(eventsservice.ValidationFailure).Issues)
		return
	}
	event, err := h.service.UpdateEvent(r.Context(), eventID, actorID, eventsrepo.UpdateEventInput{
		Title:               req.Title,
		ShortDescription:    req.ShortDescription,
		Description:         req.DescriptionMarkdown,
		DescriptionMarkdown: req.DescriptionMarkdown,
		DiveSiteID:          req.DiveSiteID,
		StartsAt:            startsAt,
		EndsAt:              endsAt,
		Timezone:            req.Timezone,
		Status:              req.Status,
		Visibility:          req.Visibility,
		EventType:           req.Type,
		Difficulty:          req.Difficulty,
		Capacity:            req.Capacity,
		RequiresApproval:    req.RequiresApproval,
		IsPaid:              req.IsPaid,
		PriceAmount:         req.PriceAmount,
		Currency:            req.Currency,
		PaymentInstructions: req.PaymentInstructions,
		MeetingPoint:        req.MeetingPoint,
		BeginnerFriendly:    req.BeginnerFriendly,
		MaxDepthM:           req.MaxDepthM,
		EntryType:           req.EntryType,
		EquipmentNotes:      req.EquipmentNotes,
		SafetyNotes:         req.SafetyNotes,
		CancellationPolicy:  req.CancellationPolicy,
		PostsEnabled:        req.PostsEnabled,
		PostCreatePolicy:    req.PostCreatePolicy,
		CancelReason:        req.CancelReason,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, CreateEventResponse{Event: mapEvent(event)})
}

func (h *Handlers) JoinEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	eventID := chi.URLParam(r, "eventId")
	req, issues, ok := httpx.DecodeAndValidate[JoinEventRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	note := req.ParticipantNote
	if strings.TrimSpace(note) == "" {
		note = req.Notes
	}
	participant, err := h.service.JoinEvent(r.Context(), eventID, actorID, note)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := mapParticipant(participant, true)
	httpx.JSON(w, http.StatusOK, JoinEventResponse{Participant: mapped, Attendee: mapped})
}

func (h *Handlers) LeaveEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	eventID := chi.URLParam(r, "eventId")
	if err := h.service.LeaveEvent(r.Context(), eventID, actorID); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) MarkEventInterested(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	event, err := h.service.MarkEventInterested(r.Context(), chi.URLParam(r, "eventId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventDetailResponse{Event: mapEvent(event)})
}

func (h *Handlers) MarkEventUninterested(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	event, err := h.service.MarkEventUninterested(r.Context(), chi.URLParam(r, "eventId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventDetailResponse{Event: mapEvent(event)})
}

func (h *Handlers) ListParticipants(w http.ResponseWriter, r *http.Request) {
	eventID := chi.URLParam(r, "eventId")
	page := parseIntQuery(r, "page", 1)
	limit := parseIntQuery(r, "limit", 20)
	items, total, err := h.service.ListParticipants(r.Context(), eventID, optionalActorID(r), page, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}
	mapped := make([]EventParticipantResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapParticipant(item, item.Payment != nil))
	}
	httpx.JSON(w, http.StatusOK, ListEventParticipantsResponse{
		Participants: mapped,
		Attendees:    mapped,
		Pagination:   paginate(page, limit, total),
	})
}

func (h *Handlers) GetMyEventPass(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	pass, err := h.service.GetMyEventPass(r.Context(), chi.URLParam(r, "eventId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapEventPass(pass))
}

func (h *Handlers) VerifyEventPass(w http.ResponseWriter, r *http.Request) {
	pass, err := h.service.VerifyEventPass(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "token"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapEventPass(pass))
}

func (h *Handlers) ApproveParticipant(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	participant, err := h.service.ApproveParticipant(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "participantId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapParticipant(participant, true))
}

func (h *Handlers) RejectParticipant(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	participant, err := h.service.RejectParticipant(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "participantId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapParticipant(participant, true))
}

func (h *Handlers) ListPaymentMethods(w http.ResponseWriter, r *http.Request) {
	methods, err := h.service.ListPaymentMethods(r.Context(), chi.URLParam(r, "eventId"), optionalActorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ListPaymentMethodsResponse{PaymentMethods: mapPaymentMethods(methods)})
}

func (h *Handlers) CreatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[CreatePaymentMethodRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	method, err := h.service.CreatePaymentMethod(r.Context(), chi.URLParam(r, "eventId"), actorID, mapCreatePaymentMethod(req))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, PaymentMethodResponse{PaymentMethod: mapPaymentMethod(method)})
}

func (h *Handlers) UpdatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[UpdatePaymentMethodRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	method, err := h.service.UpdatePaymentMethod(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "paymentMethodId"), actorID, eventsrepo.UpdatePaymentMethodInput{
		Type:          req.Type,
		Name:          req.Name,
		Instructions:  req.Instructions,
		QRImageURL:    req.QRImageURL,
		AccountName:   req.AccountName,
		AccountNumber: req.AccountNumber,
		BankName:      req.BankName,
		IsActive:      req.IsActive,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PaymentMethodResponse{PaymentMethod: mapPaymentMethod(method)})
}

func (h *Handlers) SubmitPayment(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[SubmitEventPaymentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	payment, err := h.service.SubmitPayment(r.Context(), eventsrepo.SubmitPaymentInput{
		EventID:            chi.URLParam(r, "eventId"),
		UserID:             actorID,
		PaymentMethodID:    req.PaymentMethodID,
		ProofMediaID:       req.ProofMediaID,
		ProofAttachmentURL: req.ProofAttachmentURL,
		ReferenceNumber:    req.ReferenceNumber,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventPaymentResponse{Payment: mapPayment(payment)})
}

func (h *Handlers) VerifyPayment(w http.ResponseWriter, r *http.Request) {
	h.reviewPayment(w, r, "verified")
}

func (h *Handlers) RejectPayment(w http.ResponseWriter, r *http.Request) {
	h.reviewPayment(w, r, "rejected")
}

func (h *Handlers) RegenerateParticipantPass(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	participant, err := h.service.RegenerateParticipantPass(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "participantId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapParticipant(participant, participant.Payment != nil))
}

func (h *Handlers) GetPaymentProofURL(w http.ResponseWriter, r *http.Request) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	result, err := h.service.GetPaymentProofURL(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "paymentId"), actorID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, PaymentProofURLResponse{
		URL:              result.URL,
		ExpiresAt:        result.ExpiresAt,
		PaymentID:        result.PaymentID,
		ProofMediaID:     result.ProofMediaID,
		ProofFileName:    result.ProofFileName,
		ProofContentType: result.ProofContentType,
	})
}

func (h *Handlers) reviewPayment(w http.ResponseWriter, r *http.Request, status string) {
	actorID, err := requireActorID(r)
	if err != nil {
		handleError(w, r, err)
		return
	}
	req, issues, ok := httpx.DecodeAndValidate[ReviewEventPaymentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	payment, err := h.service.ReviewPayment(r.Context(), chi.URLParam(r, "eventId"), chi.URLParam(r, "paymentId"), actorID, status, req.ReviewNotes)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, EventPaymentResponse{Payment: mapPayment(payment)})
}

func requireActorID(r *http.Request) (string, error) {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return "", apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	return identity.UserID, nil
}

func optionalActorID(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok {
		return ""
	}
	return strings.TrimSpace(identity.UserID)
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func parseOptionalBoolQuery(r *http.Request, key string) *bool {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return nil
	}
	return &parsed
}

func parseRequiredRFC3339(value, field string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, eventsservice.ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{field},
			Code:    "required",
			Message: "This field is required",
		}}}
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, invalidDatetime(field)
	}
	utc := parsed.UTC()
	return &utc, nil
}

func parseOptionalRFC3339Ptr(value *string, field string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, invalidDatetime(field)
	}
	utc := parsed.UTC()
	return &utc, nil
}

func invalidDatetime(field string) eventsservice.ValidationFailure {
	return eventsservice.ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid_datetime",
		Message: "Must be a valid RFC3339 datetime",
	}}}
}

func paginate(page, limit, total int) Pagination {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr eventsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}

func mapEvent(item eventsrepo.Event) EventResponse {
	privateUnauthorized := item.Visibility == "private" && !item.ViewerCanViewPrivateDetails
	allowPaymentDetails := item.ViewerJoined || item.ViewerCanManage
	response := EventResponse{
		ID:                          item.ID,
		Slug:                        item.Slug,
		Title:                       item.Title,
		ShortDescription:            item.ShortDescription,
		Location:                    item.Location,
		LocationName:                item.LocationName,
		FormattedAddress:            item.FormattedAddress,
		Latitude:                    item.Latitude,
		Longitude:                   item.Longitude,
		GooglePlaceID:               item.GooglePlaceID,
		RegionCode:                  item.RegionCode,
		ProvinceCode:                item.ProvinceCode,
		CityCode:                    item.CityCode,
		BarangayCode:                item.BarangayCode,
		LocationSource:              item.LocationSource,
		DiveSiteID:                  item.DiveSiteID,
		DiveSite:                    mapDiveSite(item.DiveSite),
		StartsAt:                    item.StartsAt,
		EndsAt:                      item.EndsAt,
		Timezone:                    item.Timezone,
		Status:                      item.Status,
		Visibility:                  item.Visibility,
		Type:                        item.EventType,
		Difficulty:                  item.Difficulty,
		MaxAttendees:                item.MaxAttendees,
		Capacity:                    item.Capacity,
		CurrentAttendees:            item.CurrentAttendees,
		AvailableSlots:              item.AvailableSlots,
		InterestedCount:             item.InterestedCount,
		GoingCount:                  item.GoingCount,
		OrganizerUserID:             item.OrganizerUserID,
		GroupID:                     item.GroupID,
		RequiresApproval:            item.RequiresApproval,
		IsPaid:                      item.IsPaid,
		PriceAmount:                 item.PriceAmount,
		Currency:                    item.Currency,
		BeginnerFriendly:            item.BeginnerFriendly,
		MaxDepthM:                   item.MaxDepthM,
		EntryType:                   item.EntryType,
		PostsEnabled:                item.PostsEnabled,
		PostCreatePolicy:            item.PostCreatePolicy,
		PublishedAt:                 item.PublishedAt,
		CancelledAt:                 item.CancelledAt,
		CancelReason:                item.CancelReason,
		ViewerJoined:                item.ViewerJoined,
		ViewerInterested:            item.ViewerInterested,
		ViewerParticipationStatus:   item.ViewerParticipationStatus,
		ViewerEventState:            item.ViewerEventState,
		ViewerCanManage:             item.ViewerCanManage,
		ViewerCanViewPrivateDetails: item.ViewerCanViewPrivateDetails,
		ViewerParticipation:         mapParticipantPtr(item.ViewerParticipation, true),
		ViewerPayment:               mapPaymentPtr(item.ViewerPayment),
		CreatedAt:                   item.CreatedAt,
		UpdatedAt:                   item.UpdatedAt,
	}
	if response.ViewerEventState == "" {
		response.ViewerEventState = "none"
	}
	if !privateUnauthorized {
		response.Description = item.Description
		response.DescriptionMarkdown = item.DescriptionMarkdown
		response.MeetingPoint = item.MeetingPoint
		response.EquipmentNotes = item.EquipmentNotes
		response.SafetyNotes = item.SafetyNotes
		response.CancellationPolicy = item.CancellationPolicy
		response.PostsEnabled = item.PostsEnabled
		response.PostCreatePolicy = item.PostCreatePolicy
	}
	if privateUnauthorized {
		response.Description = ""
		response.DescriptionMarkdown = ""
		response.Location = ""
		response.LocationName = ""
		response.FormattedAddress = ""
		response.Latitude = nil
		response.Longitude = nil
		response.GooglePlaceID = ""
		response.RegionCode = ""
		response.ProvinceCode = ""
		response.CityCode = ""
		response.BarangayCode = ""
		response.LocationSource = ""
		response.DiveSiteID = ""
		response.DiveSite = nil
		response.StartsAt = nil
		response.EndsAt = nil
		response.Timezone = ""
		response.Type = ""
		response.Difficulty = ""
		response.MaxAttendees = nil
		response.Capacity = nil
		response.CurrentAttendees = 0
		response.AvailableSlots = nil
		response.InterestedCount = 0
		response.GoingCount = 0
		response.IsPaid = false
		response.PriceAmount = nil
		response.Currency = ""
		response.PaymentInstructions = ""
		response.PaymentMethods = nil
		response.MeetingPoint = ""
		response.BeginnerFriendly = false
		response.MaxDepthM = nil
		response.EntryType = ""
		response.EquipmentNotes = ""
		response.SafetyNotes = ""
		response.CancellationPolicy = ""
		response.PostsEnabled = false
		response.PostCreatePolicy = ""
		response.PublishedAt = nil
		response.CancelledAt = nil
		response.CancelReason = ""
		response.OrganizerUserID = ""
		response.GroupID = ""
		response.ViewerCanManage = false
		response.ViewerCanViewPrivateDetails = false
		response.ViewerParticipation = mapParticipantPtr(item.ViewerParticipation, false)
		response.ViewerPayment = nil
		return response
	}
	if allowPaymentDetails {
		response.PaymentInstructions = item.PaymentInstructions
		response.PaymentMethods = mapPaymentMethods(item.PaymentMethods)
	} else {
		response.ViewerPayment = nil
	}
	return response
}

func mapDiveSite(site *eventsrepo.DiveSiteSummary) *EventDiveSiteResponse {
	if site == nil {
		return nil
	}
	return &EventDiveSiteResponse{
		ID:        site.ID,
		Slug:      site.Slug,
		Name:      site.Name,
		Area:      site.Area,
		Latitude:  site.Latitude,
		Longitude: site.Longitude,
	}
}

func mapParticipantPtr(item *eventsrepo.EventParticipant, includePayment bool) *EventParticipantResponse {
	if item == nil {
		return nil
	}
	mapped := mapParticipant(*item, includePayment)
	return &mapped
}

func mapParticipant(item eventsrepo.EventParticipant, includePayment bool) EventParticipantResponse {
	var payment *EventParticipantPaymentResponse
	var qrToken string
	var qrIssuedAt *time.Time
	var qrRevokedAt *time.Time
	var checkedInAt *time.Time
	var checkedInBy string
	if includePayment {
		payment = mapPaymentPtr(item.Payment)
		qrToken = item.QRToken
		qrIssuedAt = item.QRIssuedAt
		qrRevokedAt = item.QRRevokedAt
		checkedInAt = item.CheckedInAt
		checkedInBy = item.CheckedInBy
	}
	return EventParticipantResponse{
		ID:                    item.ID,
		EventID:               item.EventID,
		UserID:                item.UserID,
		Role:                  item.Role,
		Status:                item.Status,
		ParticipantNote:       item.ParticipantNote,
		EmergencyContactName:  item.EmergencyContactName,
		EmergencyContactPhone: item.EmergencyContactPhone,
		CreatedAt:             item.CreatedAt,
		UpdatedAt:             item.UpdatedAt,
		ApprovedAt:            item.ApprovedAt,
		ApprovedBy:            item.ApprovedBy,
		RejectedAt:            item.RejectedAt,
		RejectedBy:            item.RejectedBy,
		CancelledAt:           item.CancelledAt,
		LeftAt:                item.LeftAt,
		QRToken:               qrToken,
		QRIssuedAt:            qrIssuedAt,
		QRRevokedAt:           qrRevokedAt,
		CheckedInAt:           checkedInAt,
		CheckedInBy:           checkedInBy,
		DisplayName:           item.DisplayName,
		Username:              item.Username,
		AvatarURL:             mediaurl.MaterializeWithDefault(item.AvatarURL),
		Payment:               payment,
	}
}

func mapEventPass(pass eventsservice.EventPassAccess) EventPassResponse {
	participant := mapParticipant(pass.Participant, true)
	return EventPassResponse{
		Valid:       pass.Participant.QRToken != "" && pass.Participant.QRRevokedAt == nil,
		Revoked:     pass.Participant.QRRevokedAt != nil,
		Event:       mapEvent(pass.Event),
		Participant: participant,
		Role:        pass.Participant.Role,
		Status:      pass.Participant.Status,
		Payment:     participant.Payment,
		CanManage:   pass.CanManage,
		IsOwner:     pass.IsOwner,
	}
}

func mapPaymentPtr(item *eventsrepo.EventParticipantPayment) *EventParticipantPaymentResponse {
	if item == nil {
		return nil
	}
	mapped := mapPayment(*item)
	return &mapped
}

func mapPayment(item eventsrepo.EventParticipantPayment) EventParticipantPaymentResponse {
	return EventParticipantPaymentResponse{
		ID:                   item.ID,
		EventID:              item.EventID,
		EventParticipationID: item.EventParticipationID,
		UserID:               item.UserID,
		PaymentMethodID:      item.PaymentMethodID,
		Amount:               item.Amount,
		Currency:             item.Currency,
		ProofMediaID:         item.ProofMediaID,
		ProofFileName:        item.ProofFileName,
		ProofContentType:     item.ProofContentType,
		ProofStatus:          item.Status,
		ReferenceNumber:      item.ReferenceNumber,
		Status:               item.Status,
		ReviewedBy:           item.ReviewedBy,
		ReviewedAt:           item.ReviewedAt,
		ReviewNotes:          item.ReviewNotes,
		CreatedAt:            item.CreatedAt,
		UpdatedAt:            item.UpdatedAt,
	}
}

func mapPaymentMethods(items []eventsrepo.EventPaymentMethod) []EventPaymentMethodResponse {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]EventPaymentMethodResponse, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapPaymentMethod(item))
	}
	return mapped
}

func mapPaymentMethod(item eventsrepo.EventPaymentMethod) EventPaymentMethodResponse {
	return EventPaymentMethodResponse{
		ID:            item.ID,
		EventID:       item.EventID,
		Type:          item.Type,
		Name:          item.Name,
		Instructions:  item.Instructions,
		QRImageURL:    item.QRImageURL,
		AccountName:   item.AccountName,
		AccountNumber: item.AccountNumber,
		BankName:      item.BankName,
		IsActive:      item.IsActive,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

func mapCreatePaymentMethods(items []CreatePaymentMethodRequest) []eventsrepo.CreatePaymentMethodInput {
	if len(items) == 0 {
		return nil
	}
	mapped := make([]eventsrepo.CreatePaymentMethodInput, 0, len(items))
	for _, item := range items {
		mapped = append(mapped, mapCreatePaymentMethod(item))
	}
	return mapped
}

func mapCreatePaymentMethod(item CreatePaymentMethodRequest) eventsrepo.CreatePaymentMethodInput {
	isActive := true
	if item.IsActive != nil {
		isActive = *item.IsActive
	}
	return eventsrepo.CreatePaymentMethodInput{
		Type:          item.Type,
		Name:          item.Name,
		Instructions:  item.Instructions,
		QRImageURL:    item.QRImageURL,
		AccountName:   item.AccountName,
		AccountNumber: item.AccountNumber,
		BankName:      item.BankName,
		IsActive:      isActive,
	}
}
