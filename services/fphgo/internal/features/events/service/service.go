package service

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	eventsrepo "fphgo/internal/features/events/repo"
	feedservice "fphgo/internal/features/feed/service"
	notificationsservice "fphgo/internal/features/notifications/service"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
	"fphgo/internal/shared/validatex"
)

const defaultPaymentProofURLTTL = 5 * time.Minute

type Service struct {
	repo          repository
	activity      activityPublisher
	notifications notificationPublisher
	mediaSigner   *mediasign.Signer
	proofURLTTL   time.Duration
	nowFn         func() time.Time
}

type activityPublisher interface {
	PublishActivity(ctx context.Context, input feedservice.ActivityPublishInput) error
	MarkActivityBySource(ctx context.Context, sourceModule, sourceType, sourceID string, state feedservice.ActivityState) error
}

type notificationPublisher interface {
	NotifyEventCreatedForGroup(ctx context.Context, input notificationsservice.EventCreatedForGroupInput) error
	NotifyEventAttendeeJoined(ctx context.Context, input notificationsservice.EventAttendeeJoinedInput) error
	NotifyEventUpdated(ctx context.Context, input notificationsservice.EventUpdatedInput) error
	NotifyEventCancelled(ctx context.Context, input notificationsservice.EventCancelledInput) error
}

type repository interface {
	ListEvents(ctx context.Context, input eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error)
	GetEventByID(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error)
	GetEventBySlug(ctx context.Context, slug, viewerUserID string) (eventsrepo.Event, error)
	CreateEvent(ctx context.Context, input eventsrepo.CreateEventInput) (eventsrepo.Event, error)
	UpdateEvent(ctx context.Context, input eventsrepo.UpdateEventInput) (eventsrepo.Event, error)
	GetGroupRole(ctx context.Context, groupID, userID string) (string, error)
	CanManageEvent(ctx context.Context, eventID, userID string) (bool, error)
	MarkEventInterested(ctx context.Context, eventID, userID string) error
	MarkEventUninterested(ctx context.Context, eventID, userID string) error
	JoinEvent(ctx context.Context, input eventsrepo.JoinEventInput) (eventsrepo.EventParticipant, error)
	LeaveEvent(ctx context.Context, eventID, userID string) error
	GetParticipant(ctx context.Context, eventID, userID string) (eventsrepo.EventParticipant, error)
	GetAttendee(ctx context.Context, eventID, userID string) (eventsrepo.EventAttendee, error)
	ListParticipants(ctx context.Context, eventID string, input eventsrepo.ListParticipantsInput) ([]eventsrepo.EventParticipant, int, error)
	ListAttendees(ctx context.Context, eventID string, page, limit int) ([]eventsrepo.EventAttendee, int, error)
	ApproveParticipant(ctx context.Context, eventID, participantID, actorID string) (eventsrepo.EventParticipant, error)
	RejectParticipant(ctx context.Context, eventID, participantID, actorID string) (eventsrepo.EventParticipant, error)
	ListPaymentMethods(ctx context.Context, eventID string, activeOnly bool) ([]eventsrepo.EventPaymentMethod, error)
	CreatePaymentMethod(ctx context.Context, eventID string, input eventsrepo.CreatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error)
	UpdatePaymentMethod(ctx context.Context, eventID string, input eventsrepo.UpdatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error)
	SubmitPayment(ctx context.Context, input eventsrepo.SubmitPaymentInput) (eventsrepo.EventParticipantPayment, error)
	ReviewPayment(ctx context.Context, eventID, paymentID, actorID, status, notes string) (eventsrepo.EventParticipantPayment, error)
	GetPaymentProof(ctx context.Context, eventID, paymentID string) (eventsrepo.EventPaymentProof, error)
	GetEventPassByToken(ctx context.Context, slugValue, token string) (eventsrepo.EventPass, error)
	RegenerateParticipantPass(ctx context.Context, eventID, participantID string) (eventsrepo.EventParticipant, error)
	CheckInEventPass(ctx context.Context, slugValue, token, actorID string) (eventsrepo.EventPass, error)
	ListCompetitions(ctx context.Context, eventID string) ([]eventsrepo.EventCompetition, error)
	CreateCompetition(ctx context.Context, eventID string, input eventsrepo.CreateCompetitionInput) (eventsrepo.EventCompetition, error)
	UpdateCompetition(ctx context.Context, eventID string, input eventsrepo.UpdateCompetitionInput) (eventsrepo.EventCompetition, error)
	DeleteCompetition(ctx context.Context, eventID, competitionID string) error
	ListPrizes(ctx context.Context, eventID string) ([]eventsrepo.EventPrize, error)
	CreatePrize(ctx context.Context, eventID string, input eventsrepo.CreatePrizeInput) (eventsrepo.EventPrize, error)
	UpdatePrize(ctx context.Context, eventID string, input eventsrepo.UpdatePrizeInput) (eventsrepo.EventPrize, error)
	DeletePrize(ctx context.Context, eventID, prizeID string) error
	CompetitionBelongsToEvent(ctx context.Context, eventID, competitionID string) (bool, error)
	SponsorBelongsToEvent(ctx context.Context, eventID, sponsorID string) (bool, error)
	MediaBelongsToEvent(ctx context.Context, eventID, mediaID string) (bool, error)
	ListSponsors(ctx context.Context, eventID string) ([]eventsrepo.EventSponsor, error)
	CreateSponsor(ctx context.Context, eventID string, input eventsrepo.CreateSponsorInput) (eventsrepo.EventSponsor, error)
	UpdateSponsor(ctx context.Context, eventID string, input eventsrepo.UpdateSponsorInput) (eventsrepo.EventSponsor, error)
	DeleteSponsor(ctx context.Context, eventID, sponsorID string) error
	ListPosts(ctx context.Context, eventID, viewerUserID string, includeHidden bool) ([]eventsrepo.EventPost, error)
	GetPost(ctx context.Context, eventID, postID string) (eventsrepo.EventPost, error)
	CreatePost(ctx context.Context, eventID, authorUserID string, input eventsrepo.CreatePostInput) (eventsrepo.EventPost, error)
	UpdatePost(ctx context.Context, eventID string, input eventsrepo.UpdatePostInput) (eventsrepo.EventPost, error)
	DeletePost(ctx context.Context, eventID, postID string) error
	AddPostFishReaction(ctx context.Context, eventID, postID, userID string) (eventsrepo.EventPostReactionState, error)
	DeletePostFishReaction(ctx context.Context, eventID, postID, userID string) (eventsrepo.EventPostReactionState, error)
	UpdateParticipantRole(ctx context.Context, eventID, participantID, role, actorID string) (eventsrepo.EventParticipant, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type PaymentProofURL struct {
	PaymentID        string
	ProofMediaID     string
	ProofFileName    string
	ProofContentType string
	URL              string
	ExpiresAt        int64
}

type EventPassAccess struct {
	Event            eventsrepo.Event
	Participant      eventsrepo.EventParticipant
	CanManage        bool
	IsOwner          bool
	AlreadyCheckedIn bool
}

type Option func(*Service)

func WithActivityPublisher(publisher activityPublisher) Option {
	return func(s *Service) {
		s.activity = publisher
	}
}

func WithNotifications(publisher notificationPublisher) Option {
	return func(s *Service) {
		s.notifications = publisher
	}
}

func WithPaymentProofSigning(baseURL, signingSecret string, keyVersion int) Option {
	return func(s *Service) {
		s.mediaSigner = mediasign.New(baseURL, signingSecret, keyVersion, mediasign.WithNow(s.nowFn))
	}
}

func WithNow(nowFn func() time.Time) Option {
	return func(s *Service) {
		if nowFn != nil {
			s.nowFn = nowFn
		}
	}
}

func New(repo repository, opts ...Option) *Service {
	svc := &Service{
		repo:        repo,
		proofURLTTL: defaultPaymentProofURLTTL,
		nowFn:       time.Now,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) ListEvents(ctx context.Context, viewerUserID string, input eventsrepo.ListEventsInput) ([]eventsrepo.Event, int, error) {
	input.ViewerUserID = strings.TrimSpace(viewerUserID)
	input.Search = strings.TrimSpace(input.Search)
	input.Status = normalizeEventStatus(input.Status)
	input.GroupID = strings.TrimSpace(input.GroupID)
	input.DiveSiteID = strings.TrimSpace(input.DiveSiteID)
	input.EventType = normalizeEventTypeFilter(input.EventType)
	input.Difficulty = normalizeDifficultyFilter(input.Difficulty)
	input.Price = normalizePriceFilter(input.Price)
	input.Page = normalizePage(input.Page)
	input.Limit = normalizeLimit(input.Limit)
	if input.GroupID != "" {
		if _, err := uuid.Parse(input.GroupID); err != nil {
			return nil, 0, invalidUUID("groupId")
		}
	}
	if input.DiveSiteID != "" {
		if _, err := uuid.Parse(input.DiveSiteID); err != nil {
			return nil, 0, invalidUUID("diveSiteId")
		}
	}
	return s.repo.ListEvents(ctx, input)
}

func (s *Service) GetEvent(ctx context.Context, eventID, viewerUserID string) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.Event{}, invalidUUID("eventId")
	}
	event, err := s.repo.GetEventByID(ctx, eventID, strings.TrimSpace(viewerUserID))
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	return event, nil
}

func (s *Service) GetEventBySlug(ctx context.Context, slug, viewerUserID string) (eventsrepo.Event, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", nil)
	}
	event, err := s.repo.GetEventBySlug(ctx, slug, strings.TrimSpace(viewerUserID))
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if event.Status != "published" && !event.ViewerCanManage {
		return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", nil)
	}
	return event, nil
}

func (s *Service) CreateEvent(ctx context.Context, actorID string, input eventsrepo.CreateEventInput) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	input.OrganizerUserID = actorID
	if err := validateCreateEventInput(&input); err != nil {
		return eventsrepo.Event{}, err
	}
	if input.GroupID != nil && strings.TrimSpace(*input.GroupID) != "" {
		groupID := strings.TrimSpace(*input.GroupID)
		if _, err := uuid.Parse(groupID); err != nil {
			return eventsrepo.Event{}, invalidUUID("groupId")
		}
		role, err := s.repo.GetGroupRole(ctx, groupID, actorID)
		if err != nil {
			return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "group_role_failed", "failed to validate group role", err)
		}
		if role != "owner" && role != "moderator" {
			return eventsrepo.Event{}, apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can create group events", nil)
		}
	}
	created, err := s.repo.CreateEvent(ctx, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusBadRequest, "dive_site_not_found", "dive site must be an approved dive site", err)
		}
		if eventsrepo.IsSlugCollision(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusConflict, "event_slug_conflict", "could not generate a unique event slug", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_create_failed", "failed to create event", err)
	}
	s.publishEventActivity(ctx, created)
	if s.notifications != nil && created.Status == "published" && strings.TrimSpace(created.GroupID) != "" {
		if err := s.notifications.NotifyEventCreatedForGroup(ctx, notificationsservice.EventCreatedForGroupInput{
			EventID:         created.ID,
			EventSlug:       created.Slug,
			EventTitle:      created.Title,
			GroupID:         created.GroupID,
			OrganizerUserID: actorID,
		}); err != nil {
			slog.Default().Warn("events.notification.created_for_group_failed",
				slog.String("event_id", created.ID),
				slog.String("group_id", created.GroupID),
				slog.String("organizer_user_id", actorID),
				slog.Any("error", err),
			)
		}
	}
	return created, nil
}

func validateCreateEventInput(input *eventsrepo.CreateEventInput) error {
	input.Title = strings.TrimSpace(input.Title)
	input.ShortDescription = strings.TrimSpace(input.ShortDescription)
	input.DescriptionMarkdown = strings.TrimSpace(input.DescriptionMarkdown)
	input.Description = input.DescriptionMarkdown
	input.DiveSiteID = strings.TrimSpace(input.DiveSiteID)
	input.Timezone = normalizeTimezone(input.Timezone)
	input.Status = normalizeCreateStatus(input.Status)
	input.Visibility = normalizeVisibility(input.Visibility)
	input.EventType = normalizeEventType(input.EventType)
	input.Difficulty = normalizeDifficulty(input.Difficulty)
	input.Currency = normalizeCurrency(input.Currency)
	input.LocationSource = normalizeLocationSource(input.LocationSource)
	input.PaymentInstructions = strings.TrimSpace(input.PaymentInstructions)
	input.MeetingPoint = strings.TrimSpace(input.MeetingPoint)
	input.EntryType = normalizeEntryType(input.EntryType)
	input.EquipmentNotes = strings.TrimSpace(input.EquipmentNotes)
	input.SafetyNotes = strings.TrimSpace(input.SafetyNotes)
	input.CancellationPolicy = strings.TrimSpace(input.CancellationPolicy)
	if input.Title == "" {
		return required("title")
	}
	if input.ShortDescription == "" {
		return required("shortDescription")
	}
	if input.DiveSiteID == "" {
		return required("diveSiteId")
	}
	if _, err := uuid.Parse(input.DiveSiteID); err != nil {
		return invalidUUID("diveSiteId")
	}
	if err := validateTimezone(input.Timezone); err != nil {
		return err
	}
	if input.StartsAt == nil {
		return required("startsAt")
	}
	if input.EndsAt == nil {
		return required("endsAt")
	}
	if input.EndsAt.Before(*input.StartsAt) || input.EndsAt.Equal(*input.StartsAt) {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"endsAt"},
			Code:    "invalid_range",
			Message: "end time must be after start time",
		}}}
	}
	if input.Capacity != nil && *input.Capacity < 1 {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"capacity"},
			Code:    "invalid",
			Message: "Capacity must be at least 1",
		}}}
	}
	input.MaxAttendees = input.Capacity
	if input.IsPaid {
		if input.PriceAmount != nil && *input.PriceAmount < 0 {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"priceAmount"},
				Code:    "invalid",
				Message: "Price must be non-negative",
			}}}
		}
	} else {
		input.PriceAmount = nil
		input.PaymentInstructions = ""
		input.PaymentMethods = nil
	}
	for i := range input.PaymentMethods {
		input.PaymentMethods[i] = normalizePaymentMethod(input.PaymentMethods[i])
		if input.PaymentMethods[i].Type == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"paymentMethods", i, "type"},
				Code:    "required",
				Message: "Payment method type is required",
			}}}
		}
		if strings.TrimSpace(input.PaymentMethods[i].Name) == "" {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"paymentMethods", i, "name"},
				Code:    "required",
				Message: "Payment method name is required",
			}}}
		}
	}
	return nil
}

func (s *Service) UpdateEvent(ctx context.Context, eventID, actorID string, input eventsrepo.UpdateEventInput) (eventsrepo.Event, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.Event{}, invalidUUID("eventId")
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.Event{}, err
	}
	before, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	normalizeUpdateInput(&input)
	if err := validateUpdateEventInput(&input, before); err != nil {
		return eventsrepo.Event{}, err
	}
	input.EventID = eventID
	updated, err := s.repo.UpdateEvent(ctx, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_update_failed", "failed to update event", err)
	}
	s.publishEventActivity(ctx, updated)
	s.notifyEventUpdated(ctx, before, updated, actorID)
	return updated, nil
}

func (s *Service) MarkEventInterested(ctx context.Context, eventID, actorID string) (eventsrepo.Event, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.Event{}, err
	}
	event, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if err := validateInterestAccess(event, true); err != nil {
		return eventsrepo.Event{}, err
	}
	if err := s.repo.MarkEventInterested(ctx, eventID, actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_interest_failed", "failed to mark event interested", err)
	}
	updated, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	return updated, nil
}

func (s *Service) MarkEventUninterested(ctx context.Context, eventID, actorID string) (eventsrepo.Event, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.Event{}, err
	}
	event, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.Event{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if err := validateInterestAccess(event, false); err != nil {
		return eventsrepo.Event{}, err
	}
	if err := s.repo.MarkEventUninterested(ctx, eventID, actorID); err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_uninterest_failed", "failed to remove event interest", err)
	}
	updated, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		return eventsrepo.Event{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	return updated, nil
}

func (s *Service) JoinEvent(ctx context.Context, eventID, actorID, participantNote string) (eventsrepo.EventParticipant, error) {
	if _, err := uuid.Parse(eventID); err != nil {
		return eventsrepo.EventParticipant{}, invalidUUID("eventId")
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	event, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	if event.Status != "published" {
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_not_joinable", "event is not joinable", nil)
	}
	if event.ViewerParticipation != nil {
		// MVP decision: event_participations is unique per event/user, so left or
		// rejected users cannot create a second row. Organizers can change status later.
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_already_joined", "You already have a participation record for this event. Ask the organizer to reactivate it if needed.", nil)
	}
	status := "confirmed"
	if event.RequiresApproval {
		status = "pending_approval"
	}
	participant, err := s.repo.JoinEvent(ctx, eventsrepo.JoinEventInput{
		EventID:         eventID,
		UserID:          actorID,
		Status:          status,
		ParticipantNote: strings.TrimSpace(participantNote),
	})
	if err != nil {
		if eventsrepo.IsCapacityFull(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_full", "event capacity is full", err)
		}
		if eventsrepo.IsDuplicateParticipation(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_already_joined", "You already have a participation record for this event. Ask the organizer to reactivate it if needed.", err)
		}
		if eventsrepo.IsNotJoinable(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_not_joinable", "event is not joinable", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "event_join_failed", "failed to join event", err)
	}
	if s.notifications != nil {
		if err := s.notifications.NotifyEventAttendeeJoined(ctx, notificationsservice.EventAttendeeJoinedInput{
			EventID:         event.ID,
			EventSlug:       event.Slug,
			EventTitle:      event.Title,
			OrganizerUserID: event.OrganizerUserID,
			AttendeeUserID:  actorID,
		}); err != nil {
			slog.Default().Warn("events.notification.attendee_joined_failed",
				slog.String("event_id", event.ID),
				slog.String("attendee_user_id", actorID),
				slog.String("organizer_user_id", event.OrganizerUserID),
				slog.Any("error", err),
			)
		}
	}
	return participant, nil
}

func (s *Service) LeaveEvent(ctx context.Context, eventID, actorID string) error {
	if _, err := uuid.Parse(eventID); err != nil {
		return invalidUUID("eventId")
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	participation, err := s.repo.GetParticipant(ctx, eventID, actorID)
	if err != nil || (participation.Status != "confirmed" && participation.Status != "pending_approval") {
		return apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", nil)
	}
	if participation.Role == "organizer" {
		return apperrors.New(http.StatusConflict, "organizer_leave_blocked", "event organizer cannot leave directly", nil)
	}
	if err := s.repo.LeaveEvent(ctx, eventID, actorID); err != nil {
		if eventsrepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "event_leave_failed", "failed to leave event", err)
	}
	return nil
}

func (s *Service) ListAttendees(ctx context.Context, eventID, viewerUserID string, page, limit int) ([]eventsrepo.EventAttendee, int, error) {
	items, total, err := s.ListParticipants(ctx, eventID, viewerUserID, page, limit)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (s *Service) ListParticipants(ctx context.Context, eventID, viewerUserID string, page, limit int) ([]eventsrepo.EventParticipant, int, error) {
	event, err := s.GetEvent(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, 0, err
	}
	canSeeIdentities := event.Visibility == "public" || event.ViewerCanViewPrivateDetails || event.ViewerCanManage
	if !canSeeIdentities {
		return nil, 0, apperrors.New(http.StatusForbidden, "forbidden", "event attendee identities are private", nil)
	}
	items, total, err := s.repo.ListParticipants(ctx, eventID, eventsrepo.ListParticipantsInput{
		ViewerUserID:   strings.TrimSpace(viewerUserID),
		Page:           normalizePage(page),
		Limit:          normalizeLimit(limit),
		IncludeAll:     event.ViewerCanManage,
		IncludePayment: event.ViewerCanManage,
	})
	if err != nil {
		return nil, 0, apperrors.New(http.StatusInternalServerError, "event_participants_list_failed", "failed to list event participants", err)
	}
	return items, total, nil
}

func (s *Service) ApproveParticipant(ctx context.Context, eventID, participantID, actorID string) (eventsrepo.EventParticipant, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	if _, err := uuid.Parse(participantID); err != nil {
		return eventsrepo.EventParticipant{}, invalidUUID("participantId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	participant, err := s.repo.ApproveParticipant(ctx, eventID, participantID, actorID)
	if err != nil {
		if eventsrepo.IsCapacityFull(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusConflict, "event_full", "event capacity is full", err)
		}
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "participant_approve_failed", "failed to approve participant", err)
	}
	return participant, nil
}

func (s *Service) RejectParticipant(ctx context.Context, eventID, participantID, actorID string) (eventsrepo.EventParticipant, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	if _, err := uuid.Parse(participantID); err != nil {
		return eventsrepo.EventParticipant{}, invalidUUID("participantId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	participant, err := s.repo.RejectParticipant(ctx, eventID, participantID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "participant_reject_failed", "failed to reject participant", err)
	}
	return participant, nil
}

func (s *Service) ListPaymentMethods(ctx context.Context, eventID, viewerUserID string) ([]eventsrepo.EventPaymentMethod, error) {
	event, err := s.GetEvent(ctx, eventID, viewerUserID)
	if err != nil {
		return nil, err
	}
	if !event.IsPaid {
		return []eventsrepo.EventPaymentMethod{}, nil
	}
	if !event.ViewerJoined && !event.ViewerCanManage {
		return nil, apperrors.New(http.StatusForbidden, "forbidden", "join the event before viewing payment details", nil)
	}
	methods, err := s.repo.ListPaymentMethods(ctx, eventID, !event.ViewerCanManage)
	if err != nil {
		return nil, apperrors.New(http.StatusInternalServerError, "payment_methods_list_failed", "failed to list payment methods", err)
	}
	return methods, nil
}

func (s *Service) CreatePaymentMethod(ctx context.Context, eventID, actorID string, input eventsrepo.CreatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPaymentMethod{}, err
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPaymentMethod{}, err
	}
	input = normalizePaymentMethod(input)
	method, err := s.repo.CreatePaymentMethod(ctx, eventID, input)
	if err != nil {
		return eventsrepo.EventPaymentMethod{}, apperrors.New(http.StatusInternalServerError, "payment_method_create_failed", "failed to create payment method", err)
	}
	return method, nil
}

func (s *Service) UpdatePaymentMethod(ctx context.Context, eventID, paymentMethodID, actorID string, input eventsrepo.UpdatePaymentMethodInput) (eventsrepo.EventPaymentMethod, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventPaymentMethod{}, err
	}
	if _, err := uuid.Parse(paymentMethodID); err != nil {
		return eventsrepo.EventPaymentMethod{}, invalidUUID("paymentMethodId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventPaymentMethod{}, err
	}
	input.PaymentMethodID = paymentMethodID
	normalizeUpdatePaymentMethod(&input)
	if err := validateUpdatePaymentMethod(input); err != nil {
		return eventsrepo.EventPaymentMethod{}, err
	}
	method, err := s.repo.UpdatePaymentMethod(ctx, eventID, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventPaymentMethod{}, apperrors.New(http.StatusNotFound, "payment_method_not_found", "payment method not found", err)
		}
		return eventsrepo.EventPaymentMethod{}, apperrors.New(http.StatusInternalServerError, "payment_method_update_failed", "failed to update payment method", err)
	}
	return method, nil
}

func (s *Service) SubmitPayment(ctx context.Context, input eventsrepo.SubmitPaymentInput) (eventsrepo.EventParticipantPayment, error) {
	if _, err := uuid.Parse(input.EventID); err != nil {
		return eventsrepo.EventParticipantPayment{}, invalidUUID("eventId")
	}
	if _, err := uuid.Parse(input.UserID); err != nil {
		return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(input.PaymentMethodID)); err != nil {
		return eventsrepo.EventParticipantPayment{}, invalidUUID("paymentMethodId")
	}
	input.PaymentMethodID = strings.TrimSpace(input.PaymentMethodID)
	input.ProofMediaID = strings.TrimSpace(input.ProofMediaID)
	input.ProofAttachmentURL = strings.TrimSpace(input.ProofAttachmentURL)
	input.ReferenceNumber = strings.TrimSpace(input.ReferenceNumber)
	if input.ProofMediaID == "" {
		return eventsrepo.EventParticipantPayment{}, required("proofMediaId")
	}
	if _, err := uuid.Parse(input.ProofMediaID); err != nil {
		return eventsrepo.EventParticipantPayment{}, invalidUUID("proofMediaId")
	}
	event, err := s.GetEvent(ctx, input.EventID, input.UserID)
	if err != nil {
		return eventsrepo.EventParticipantPayment{}, err
	}
	if !event.IsPaid {
		return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusConflict, "payment_not_required", "this event does not require payment", nil)
	}
	if !event.ViewerJoined {
		return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusForbidden, "forbidden", "join the event before submitting payment proof", nil)
	}
	payment, err := s.repo.SubmitPayment(ctx, input)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusNotFound, "payment_not_found", "payment record not found", err)
		}
		return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusInternalServerError, "payment_submit_failed", "failed to submit payment proof", err)
	}
	return payment, nil
}

func (s *Service) ReviewPayment(ctx context.Context, eventID, paymentID, actorID, status, notes string) (eventsrepo.EventParticipantPayment, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventParticipantPayment{}, err
	}
	if _, err := uuid.Parse(paymentID); err != nil {
		return eventsrepo.EventParticipantPayment{}, invalidUUID("paymentId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventParticipantPayment{}, err
	}
	if status != "verified" && status != "rejected" {
		return eventsrepo.EventParticipantPayment{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"status"},
			Code:    "invalid",
			Message: "Payment review status must be verified or rejected",
		}}}
	}
	payment, err := s.repo.ReviewPayment(ctx, eventID, paymentID, actorID, status, strings.TrimSpace(notes))
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusNotFound, "payment_not_found", "payment record not found", err)
		}
		return eventsrepo.EventParticipantPayment{}, apperrors.New(http.StatusInternalServerError, "payment_review_failed", "failed to review payment", err)
	}
	return payment, nil
}

func (s *Service) GetPaymentProofURL(ctx context.Context, eventID, paymentID, actorID string) (PaymentProofURL, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return PaymentProofURL{}, err
	}
	if _, err := uuid.Parse(paymentID); err != nil {
		return PaymentProofURL{}, invalidUUID("paymentId")
	}
	proof, err := s.repo.GetPaymentProof(ctx, eventID, paymentID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return PaymentProofURL{}, apperrors.New(http.StatusNotFound, "payment_proof_not_found", "payment proof not found", err)
		}
		return PaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "payment_proof_get_failed", "failed to load payment proof", err)
	}
	if strings.TrimSpace(proof.UserID) != actorID {
		canManage, err := s.repo.CanManageEvent(ctx, eventID, actorID)
		if err != nil {
			return PaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "event_permission_failed", "failed to validate event permissions", err)
		}
		if !canManage {
			return PaymentProofURL{}, apperrors.New(http.StatusForbidden, "forbidden", "only the payment owner or event organizer can view this proof", nil)
		}
	}
	if s.mediaSigner == nil || !s.mediaSigner.Configured() {
		return PaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	url := s.mediaSigner.URLWithTransform(proof.ObjectKey, 0, 0, "", s.proofURLTTL)
	if url == "" {
		return PaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	return PaymentProofURL{
		PaymentID:        proof.PaymentID,
		ProofMediaID:     proof.ProofMediaID,
		ProofFileName:    proof.FileName,
		ProofContentType: proof.ContentType,
		URL:              url,
		ExpiresAt:        s.nowFn().Add(s.proofURLTTL).Unix(),
	}, nil
}

func (s *Service) GetMyEventPass(ctx context.Context, eventID, actorID string) (EventPassAccess, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return EventPassAccess{}, err
	}
	event, err := s.repo.GetEventByID(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_not_found", "event not found", err)
		}
		return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_get_failed", "failed to fetch event", err)
	}
	participant, err := s.repo.GetParticipant(ctx, eventID, actorID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "event pass not found", err)
		}
		return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_pass_get_failed", "failed to load event pass", err)
	}
	return EventPassAccess{Event: event, Participant: participant, CanManage: event.ViewerCanManage, IsOwner: true}, nil
}

func (s *Service) VerifyEventPass(ctx context.Context, slugValue, token, actorID string) (EventPassAccess, error) {
	slugValue = strings.TrimSpace(slugValue)
	token = strings.TrimSpace(token)
	if slugValue == "" || token == "" {
		return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "Invalid or expired event pass.", nil)
	}
	pass, err := s.repo.GetEventPassByToken(ctx, slugValue, token)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "Invalid or expired event pass.", err)
		}
		return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_pass_get_failed", "failed to load event pass", err)
	}
	actorID = strings.TrimSpace(actorID)
	isOwner := actorID != "" && actorID == pass.Participant.UserID
	canManage := false
	if actorID != "" {
		var err error
		canManage, err = s.repo.CanManageEvent(ctx, pass.Event.ID, actorID)
		if err != nil {
			return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_permission_failed", "failed to validate event permissions", err)
		}
	}
	if !isOwner && !canManage {
		return EventPassAccess{}, apperrors.New(http.StatusForbidden, "forbidden", "This event pass can only be viewed by the pass owner or event organizers.", nil)
	}
	pass.Event.ViewerCanManage = canManage
	return EventPassAccess{Event: pass.Event, Participant: pass.Participant, CanManage: canManage, IsOwner: isOwner}, nil
}

func (s *Service) RegenerateParticipantPass(ctx context.Context, eventID, participantID, actorID string) (eventsrepo.EventParticipant, error) {
	if err := validateEventAndActor(eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	if _, err := uuid.Parse(participantID); err != nil {
		return eventsrepo.EventParticipant{}, invalidUUID("participantId")
	}
	if err := s.ensureCanManage(ctx, eventID, actorID); err != nil {
		return eventsrepo.EventParticipant{}, err
	}
	participant, err := s.repo.RegenerateParticipantPass(ctx, eventID, participantID)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return eventsrepo.EventParticipant{}, apperrors.New(http.StatusNotFound, "participant_not_found", "event participant not found", err)
		}
		return eventsrepo.EventParticipant{}, apperrors.New(http.StatusInternalServerError, "event_pass_regenerate_failed", "failed to regenerate event pass", err)
	}
	return participant, nil
}

func (s *Service) CheckInEventPass(ctx context.Context, slugValue, token, actorID string) (EventPassAccess, error) {
	slugValue = strings.TrimSpace(slugValue)
	token = strings.TrimSpace(token)
	actorID = strings.TrimSpace(actorID)
	if slugValue == "" || token == "" {
		return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "Invalid or expired event pass.", nil)
	}
	if actorID == "" {
		return EventPassAccess{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "authentication required", nil)
	}
	pass, err := s.repo.GetEventPassByToken(ctx, slugValue, token)
	if err != nil {
		if eventsrepo.IsNoRows(err) {
			return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "Invalid or expired event pass.", err)
		}
		return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_pass_get_failed", "failed to load event pass", err)
	}
	canManage, err := s.repo.CanManageEvent(ctx, pass.Event.ID, actorID)
	if err != nil {
		return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_permission_failed", "failed to validate event permissions", err)
	}
	if !canManage {
		return EventPassAccess{}, apperrors.New(http.StatusForbidden, "forbidden", "only event organizers can check in event passes", nil)
	}
	alreadyCheckedIn := pass.Participant.CheckedInAt != nil
	if !alreadyCheckedIn {
		pass, err = s.repo.CheckInEventPass(ctx, slugValue, token, actorID)
		if err != nil {
			if eventsrepo.IsNoRows(err) {
				return EventPassAccess{}, apperrors.New(http.StatusNotFound, "event_pass_not_found", "Invalid or expired event pass.", err)
			}
			return EventPassAccess{}, apperrors.New(http.StatusInternalServerError, "event_pass_check_in_failed", "failed to check in event pass", err)
		}
	}
	pass.Event.ViewerCanManage = true
	return EventPassAccess{Event: pass.Event, Participant: pass.Participant, CanManage: true, IsOwner: actorID == pass.Participant.UserID, AlreadyCheckedIn: alreadyCheckedIn}, nil
}

func (s *Service) ensureCanManage(ctx context.Context, eventID, actorID string) error {
	canManage, err := s.repo.CanManageEvent(ctx, eventID, actorID)
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "event_permission_failed", "failed to validate event permissions", err)
	}
	if !canManage {
		return apperrors.New(http.StatusForbidden, "forbidden", "only event organizers can manage this event", nil)
	}
	return nil
}

func validateInterestAccess(event eventsrepo.Event, markingInterested bool) error {
	if event.Status != "published" {
		return apperrors.New(http.StatusConflict, "event_not_open", "interest can only be changed on published events", nil)
	}
	if event.Visibility == "private" && !event.ViewerCanViewPrivateDetails && !event.ViewerCanManage {
		return apperrors.New(http.StatusForbidden, "forbidden", "event is private", nil)
	}
	if !markingInterested {
		return nil
	}
	if event.ViewerParticipation != nil {
		switch event.ViewerParticipation.Status {
		case "pending_approval":
			return apperrors.New(http.StatusConflict, "event_request_pending", "Your request is already pending approval.", nil)
		case "confirmed", "attended":
			return apperrors.New(http.StatusConflict, "event_already_going", "You are already going to this event.", nil)
		}
	}
	return nil
}

func (s *Service) notifyEventUpdated(ctx context.Context, before eventsrepo.Event, updated eventsrepo.Event, actorID string) {
	if s.notifications == nil {
		return
	}
	if before.Status != "cancelled" && updated.Status == "cancelled" {
		if err := s.notifications.NotifyEventCancelled(ctx, notificationsservice.EventCancelledInput{
			EventID:     updated.ID,
			EventSlug:   updated.Slug,
			EventTitle:  updated.Title,
			ActorUserID: actorID,
			UpdatedAt:   updated.UpdatedAt,
		}); err != nil {
			slog.Default().Warn("events.notification.cancelled_failed",
				slog.String("event_id", updated.ID),
				slog.String("actor_user_id", actorID),
				slog.Any("error", err),
			)
		}
		return
	}
	if updated.Status != "published" || !meaningfulEventUpdate(before, updated) {
		return
	}
	if err := s.notifications.NotifyEventUpdated(ctx, notificationsservice.EventUpdatedInput{
		EventID:     updated.ID,
		EventSlug:   updated.Slug,
		EventTitle:  updated.Title,
		ActorUserID: actorID,
		UpdatedAt:   updated.UpdatedAt,
	}); err != nil {
		slog.Default().Warn("events.notification.updated_failed",
			slog.String("event_id", updated.ID),
			slog.String("actor_user_id", actorID),
			slog.Any("error", err),
		)
	}
}

func meaningfulEventUpdate(before eventsrepo.Event, updated eventsrepo.Event) bool {
	if !sameTimePtr(before.StartsAt, updated.StartsAt) || !sameTimePtr(before.EndsAt, updated.EndsAt) {
		return true
	}
	if strings.TrimSpace(before.DiveSiteID) != strings.TrimSpace(updated.DiveSiteID) {
		return true
	}
	if strings.TrimSpace(before.MeetingPoint) != strings.TrimSpace(updated.MeetingPoint) {
		return true
	}
	return false
}

func sameTimePtr(a *time.Time, b *time.Time) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return a.UTC().Equal(b.UTC())
}

func (s *Service) publishEventActivity(ctx context.Context, event eventsrepo.Event) {
	if s.activity == nil {
		return
	}
	if event.Status != "published" || event.Visibility != "public" {
		_ = s.activity.MarkActivityBySource(ctx, string(feedservice.ActivitySourceEvents), "event", event.ID, feedservice.ActivityStateHidden)
		return
	}
	area := strings.TrimSpace(event.LocationName)
	if area == "" && event.DiveSite != nil {
		area = event.DiveSite.Area
	}
	if area == "" {
		area = strings.TrimSpace(event.Location)
	}
	_ = s.activity.PublishActivity(ctx, feedservice.ActivityPublishInput{
		Type:            feedservice.ActivityEventPublished,
		SourceModule:    feedservice.ActivitySourceEvents,
		SourceType:      "event",
		SourceID:        event.ID,
		ActorUserID:     event.OrganizerUserID,
		TargetType:      "event",
		TargetID:        event.ID,
		Visibility:      feedservice.ActivityVisibilityPublic,
		State:           feedservice.ActivityStateActive,
		Area:            area,
		GroupID:         strings.TrimSpace(event.GroupID),
		EventID:         event.ID,
		OccurredAt:      event.UpdatedAt,
		SourceCreatedAt: event.CreatedAt,
		Title:           event.Title,
		Body:            event.ShortDescription,
		Metadata: map[string]any{
			"eventSlug":        event.Slug,
			"eventType":        event.EventType,
			"difficulty":       event.Difficulty,
			"startsAt":         event.StartsAt,
			"endsAt":           event.EndsAt,
			"diveSiteId":       event.DiveSiteID,
			"beginnerFriendly": event.BeginnerFriendly,
		},
	})
}

func normalizeUpdateInput(input *eventsrepo.UpdateEventInput) {
	trimStringPtr := func(value **string) {
		if value == nil || *value == nil {
			return
		}
		trimmed := strings.TrimSpace(**value)
		*value = &trimmed
	}
	trimStringPtr(&input.Title)
	trimStringPtr(&input.ShortDescription)
	trimStringPtr(&input.DescriptionMarkdown)
	trimStringPtr(&input.DiveSiteID)
	trimStringPtr(&input.PaymentInstructions)
	trimStringPtr(&input.MeetingPoint)
	trimStringPtr(&input.EquipmentNotes)
	trimStringPtr(&input.SafetyNotes)
	trimStringPtr(&input.CancellationPolicy)
	trimStringPtr(&input.PostCreatePolicy)
	trimStringPtr(&input.CancelReason)
	trimStringPtr(&input.CoverPhotoURL)
	if input.DescriptionMarkdown != nil {
		input.Description = input.DescriptionMarkdown
	}
	if input.Status != nil {
		value := normalizeEventStatus(*input.Status)
		input.Status = &value
	}
	if input.Visibility != nil {
		value := normalizeVisibility(*input.Visibility)
		input.Visibility = &value
	}
	if input.EventType != nil {
		value := normalizeEventType(*input.EventType)
		input.EventType = &value
	}
	if input.Difficulty != nil {
		value := normalizeDifficulty(*input.Difficulty)
		input.Difficulty = &value
	}
	if input.Timezone != nil {
		value := normalizeTimezone(*input.Timezone)
		input.Timezone = &value
	}
	if input.Currency != nil {
		value := normalizeCurrency(*input.Currency)
		input.Currency = &value
	}
	if input.EntryType != nil {
		value := normalizeEntryType(*input.EntryType)
		input.EntryType = &value
	}
	if input.PostCreatePolicy != nil {
		value := normalizePostCreatePolicy(*input.PostCreatePolicy)
		input.PostCreatePolicy = &value
	}
}

func validateUpdateEventInput(input *eventsrepo.UpdateEventInput, before eventsrepo.Event) error {
	if input.Title != nil && *input.Title == "" {
		return required("title")
	}
	if input.ShortDescription != nil && *input.ShortDescription == "" {
		return required("shortDescription")
	}
	if input.DescriptionMarkdown != nil && *input.DescriptionMarkdown == "" {
		return required("descriptionMarkdown")
	}
	if input.DiveSiteID != nil {
		if *input.DiveSiteID == "" {
			return required("diveSiteId")
		}
		if _, err := uuid.Parse(*input.DiveSiteID); err != nil {
			return invalidUUID("diveSiteId")
		}
	}
	if input.Timezone != nil {
		if err := validateTimezone(*input.Timezone); err != nil {
			return err
		}
	}
	if input.PostCreatePolicy != nil && *input.PostCreatePolicy == "" {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postCreatePolicy"},
			Code:    "invalid",
			Message: "Post creation policy is invalid",
		}}}
	}
	startsAt := before.StartsAt
	if input.StartsAt != nil {
		startsAt = input.StartsAt
	}
	endsAt := before.EndsAt
	if input.EndsAt != nil {
		endsAt = input.EndsAt
	}
	if startsAt != nil && endsAt != nil && !endsAt.After(*startsAt) {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"endsAt"},
			Code:    "invalid_range",
			Message: "end time must be after start time",
		}}}
	}
	if input.Capacity != nil {
		if *input.Capacity < 1 {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"capacity"},
				Code:    "required",
				Message: "Capacity must be at least 1",
			}}}
		}
		if *input.Capacity < before.CurrentAttendees {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"capacity"},
				Code:    "invalid_range",
				Message: "Capacity cannot be lower than confirmed participants",
			}}}
		}
	}
	isPaid := before.IsPaid
	if input.IsPaid != nil {
		isPaid = *input.IsPaid
	}
	priceAmount := before.PriceAmount
	if input.PriceAmount != nil {
		priceAmount = input.PriceAmount
	}
	if isPaid {
		if priceAmount != nil && *priceAmount < 0 {
			return ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"priceAmount"},
				Code:    "invalid",
				Message: "Price must be non-negative",
			}}}
		}
		return nil
	}
	if input.PriceAmount != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"priceAmount"},
			Code:    "invalid",
			Message: "Free events cannot set a price",
		}}}
	}
	return nil
}

func normalizeLocationSource(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case "", "manual":
		return "manual"
	case "google_places", "psgc_mapped", "unmapped":
		return value
	default:
		return "manual"
	}
}

func normalizePage(value int) int {
	if value < 1 {
		return 1
	}
	return value
}

func normalizeLimit(value int) int {
	if value < 1 {
		return 20
	}
	if value > 100 {
		return 100
	}
	return value
}

func normalizeEventStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "draft", "cancelled", "completed", "published":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func normalizeCreateStatus(value string) string {
	normalized := normalizeEventStatus(value)
	if normalized == "" {
		return "published"
	}
	return normalized
}

func normalizeVisibility(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "private", "invite_only", "invite-only", "group_members", "group-members":
		return "private"
	default:
		return "public"
	}
}

func normalizeDifficulty(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "intermediate", "advanced", "expert":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "beginner"
	}
}

func normalizeDifficultyFilter(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "beginner", "intermediate", "advanced", "expert":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func normalizeEventType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "intro_session", "intro session":
		return "intro_session"
	case "pool_training", "pool training", "training":
		return "pool_training"
	case "line_training", "line training":
		return "line_training"
	case "depth_training", "depth training":
		return "depth_training"
	case "certification_course", "certification course":
		return "certification_course"
	case "workshop":
		return "workshop"
	case "competition", "tournament":
		return "competition"
	case "cleanup_dive", "cleanup dive":
		return "cleanup_dive"
	case "trip_retreat", "trip/retreat", "retreat", "trip":
		return "trip_retreat"
	default:
		return "fun_dive"
	}
}

func normalizeEventTypeFilter(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "intro_session", "intro session":
		return "intro_session"
	case "pool_training", "pool training", "training":
		return "pool_training"
	case "line_training", "line training":
		return "line_training"
	case "fun_dive", "fun dive":
		return "fun_dive"
	case "depth_training", "depth training":
		return "depth_training"
	case "certification_course", "certification course":
		return "certification_course"
	case "workshop":
		return "workshop"
	case "competition", "tournament":
		return "competition"
	case "cleanup_dive", "cleanup dive":
		return "cleanup_dive"
	case "trip_retreat", "trip/retreat", "retreat", "trip":
		return "trip_retreat"
	default:
		return ""
	}
}

func normalizeEntryType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "shore", "boat", "pool":
		return strings.ToLower(strings.TrimSpace(value))
	case "classroom_online", "classroom/online", "classroom", "online":
		return "classroom_online"
	default:
		return ""
	}
}

func normalizeTimezone(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "Asia/Manila"
	}
	return trimmed
}

func validateTimezone(value string) error {
	if _, err := time.LoadLocation(strings.TrimSpace(value)); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"timezone"},
			Code:    "invalid_timezone",
			Message: "Timezone must be a valid IANA timezone name",
		}}}
	}
	return nil
}

func normalizeCurrency(value string) string {
	trimmed := strings.ToUpper(strings.TrimSpace(value))
	if trimmed == "" {
		return "PHP"
	}
	return trimmed
}

func normalizePriceFilter(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "free", "paid":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func normalizePaymentMethod(input eventsrepo.CreatePaymentMethodInput) eventsrepo.CreatePaymentMethodInput {
	input.Type = strings.ToUpper(strings.TrimSpace(input.Type))
	if input.Type != "MANUAL_QR" && input.Type != "MANUAL_BANK_TRANSFER" {
		input.Type = ""
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Instructions = strings.TrimSpace(input.Instructions)
	input.QRImageURL = strings.TrimSpace(input.QRImageURL)
	input.AccountName = strings.TrimSpace(input.AccountName)
	input.AccountNumber = strings.TrimSpace(input.AccountNumber)
	input.BankName = strings.TrimSpace(input.BankName)
	input.IsActive = true
	return input
}

func normalizePostCreatePolicy(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "participants", "participants_and_organizers":
		return "participants"
	case "organizers_only", "organizer_only", "organizers":
		return "organizers_only"
	default:
		return ""
	}
}

func normalizeUpdatePaymentMethod(input *eventsrepo.UpdatePaymentMethodInput) {
	trimStringPtr := func(value **string) {
		if value == nil || *value == nil {
			return
		}
		trimmed := strings.TrimSpace(**value)
		*value = &trimmed
	}
	if input.Type != nil {
		value := strings.ToUpper(strings.TrimSpace(*input.Type))
		input.Type = &value
	}
	trimStringPtr(&input.Name)
	trimStringPtr(&input.Instructions)
	trimStringPtr(&input.QRImageURL)
	trimStringPtr(&input.AccountName)
	trimStringPtr(&input.AccountNumber)
	trimStringPtr(&input.BankName)
}

func validateUpdatePaymentMethod(input eventsrepo.UpdatePaymentMethodInput) error {
	if input.Type != nil && *input.Type != "MANUAL_QR" && *input.Type != "MANUAL_BANK_TRANSFER" {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"type"},
			Code:    "invalid",
			Message: "Payment method type is invalid",
		}}}
	}
	if input.Name != nil && *input.Name == "" {
		return required("name")
	}
	return nil
}

func validateEventAndActor(eventID, actorID string) error {
	if _, err := uuid.Parse(eventID); err != nil {
		return invalidUUID("eventId")
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	return nil
}

func invalidUUID(field string) ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "invalid_uuid",
		Message: "Must be a valid UUID",
	}}}
}

func required(field string) ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{
		Path:    []any{field},
		Code:    "required",
		Message: "This field is required",
	}}}
}
