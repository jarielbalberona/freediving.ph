package service

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	schoolsrepo "fphgo/internal/features/schools/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo          repository
	notifications notificationProcessor
	mediaSigner   *mediasign.Signer
	proofURLTTL   time.Duration
	nowFn         func() time.Time
}

type notificationProcessor interface {
	ProcessDueOutbox(ctx context.Context, limit int) (notificationsservice.OutboxProcessResult, error)
}

const (
	defaultCurrency                  = "PHP"
	defaultTimezone                  = "Asia/Manila"
	defaultBookingPaymentProofURLTTL = 5 * time.Minute
)

type repository interface {
	ListSchools(context.Context, string) ([]schoolsrepo.School, error)
	HasInstructorProfile(context.Context, string) (bool, error)
	IsPlatformAdmin(context.Context, string) (bool, error)
	CreateSchool(context.Context, schoolsrepo.CreateSchoolInput) (schoolsrepo.School, error)
	GetSchoolBySlug(context.Context, string, string) (schoolsrepo.School, error)
	GetMemberRole(context.Context, string, string) (string, error)
	UpdateSchool(context.Context, string, schoolsrepo.UpdateSchoolInput) (schoolsrepo.School, error)
	MediaBelongsToSchool(context.Context, string, string) (bool, error)
	DeleteSchool(context.Context, string) error
	ListCourses(context.Context, string) ([]schoolsrepo.Course, error)
	CreateCourse(context.Context, string, schoolsrepo.CreateCourseInput) (schoolsrepo.Course, error)
	GetCourse(context.Context, string, string) (schoolsrepo.Course, error)
	UpdateCourse(context.Context, string, string, schoolsrepo.UpdateCourseInput) (schoolsrepo.Course, error)
	DeleteCourse(context.Context, string, string) error
	ListPaymentMethods(context.Context, string) ([]schoolsrepo.PaymentMethod, error)
	CreatePaymentMethod(context.Context, string, schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error)
	UpdatePaymentMethod(context.Context, string, string, schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error)
	DeletePaymentMethod(context.Context, string, string) error
	ListSessions(context.Context, string, schoolsrepo.ListSessionsInput) ([]schoolsrepo.Session, error)
	CreateSession(context.Context, string, schoolsrepo.CreateSessionInput) (schoolsrepo.Session, error)
	GetSession(context.Context, string, string) (schoolsrepo.Session, error)
	UpdateSession(context.Context, string, string, schoolsrepo.UpdateSessionInput, *schoolsrepo.SessionNotificationEvent) (schoolsrepo.Session, error)
	SetSessionStatus(context.Context, string, string, string, *schoolsrepo.SessionNotificationEvent) (schoolsrepo.Session, error)
	DeleteSession(context.Context, string, string) error
	ListSessionBookings(context.Context, string, string) ([]schoolsrepo.Booking, error)
	ListBookings(context.Context, string, schoolsrepo.ListBookingsInput) ([]schoolsrepo.Booking, error)
	CreateBooking(context.Context, string, schoolsrepo.CreateBookingInput, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error)
	GetBooking(context.Context, string, string) (schoolsrepo.Booking, error)
	UpdateBooking(context.Context, string, string, schoolsrepo.UpdateBookingInput, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error)
	SetBookingStatus(context.Context, string, string, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error)
	AssignBookingSession(context.Context, string, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error)
	UnassignBookingSession(context.Context, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error)
	ReviewBookingPayment(context.Context, string, string, string, string, string) (schoolsrepo.BookingPayment, error)
	GetBookingPaymentProof(context.Context, string, string) (schoolsrepo.BookingPaymentProof, error)
	SubmitMyBookingPayment(context.Context, string, string, schoolsrepo.SubmitBookingPaymentInput) (schoolsrepo.Booking, error)
	ListPublicSchools(context.Context, schoolsrepo.PublicSchoolFilters) ([]schoolsrepo.School, error)
	GetPublicSchoolBySlug(context.Context, string) (schoolsrepo.School, error)
	ListPublicCourses(context.Context, string, schoolsrepo.PublicCourseFilters) ([]schoolsrepo.Course, error)
	GetPublicCourse(context.Context, string, string) (schoolsrepo.Course, error)
	ListPublicCourseSessions(context.Context, string, string) ([]schoolsrepo.Session, error)
	ListMyBookings(context.Context, string) ([]schoolsrepo.Booking, error)
	GetMyBooking(context.Context, string, string) (schoolsrepo.Booking, error)
	CancelMyBooking(context.Context, string, string) (schoolsrepo.Booking, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type BookingPaymentProofURL struct {
	PaymentID        string
	BookingID        string
	ProofMediaID     string
	ProofFileName    string
	ProofContentType string
	URL              string
	ExpiresAt        int64
}

type Option func(*Service)

func WithNotifications(notifications notificationProcessor) Option {
	return func(s *Service) {
		s.notifications = notifications
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
		proofURLTTL: defaultBookingPaymentProofURLTTL,
		nowFn:       time.Now,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) ListSchools(ctx context.Context, actorID string) ([]schoolsrepo.School, error) {
	items, err := s.repo.ListSchools(ctx, actorID)
	if err != nil {
		return nil, err
	}
	for idx := range items {
		role, err := s.repo.GetMemberRole(ctx, items[idx].ID, actorID)
		if err == nil {
			items[idx].CurrentUserRole = role
		}
	}
	return items, nil
}

func (s *Service) CreateSchool(ctx context.Context, actorID string, input schoolsrepo.CreateSchoolInput) (schoolsrepo.School, error) {
	if ok, err := s.CanCreateSchool(ctx, actorID); err != nil {
		return schoolsrepo.School{}, err
	} else if !ok {
		return schoolsrepo.School{}, apperrors.New(http.StatusForbidden, "instructor_profile_required", "Create/complete your instructor profile before creating a school.", nil)
	}
	input.OwnerUserID = actorID
	input.Name = strings.TrimSpace(input.Name)
	input.Status = defaultString(normalize(input.Status), "draft")
	if input.Name == "" {
		return schoolsrepo.School{}, validation("name", "required", "Name is required")
	}
	if !oneOf(input.Status, "draft", "published", "suspended") {
		return schoolsrepo.School{}, validation("status", "invalid", "Invalid school status")
	}
	if err := validateEmail("contactEmail", input.ContactEmail); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := validateURL("websiteUrl", input.WebsiteURL); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := validateURL("facebookUrl", input.FacebookURL); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := validateURL("instagramUrl", input.InstagramURL); err != nil {
		return schoolsrepo.School{}, err
	}
	item, err := s.repo.CreateSchool(ctx, input)
	item.CurrentUserRole = "owner"
	return item, mapRepoErr(err, "school_create_failed")
}

func (s *Service) CanCreateSchool(ctx context.Context, userID string) (bool, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return false, apperrors.New(http.StatusUnauthorized, "auth_required", "sign in required", nil)
	}
	if ok, err := s.repo.HasInstructorProfile(ctx, userID); err != nil {
		return false, apperrors.New(http.StatusInternalServerError, "instructor_profile_check_failed", "failed to check instructor profile", err)
	} else if ok {
		return true, nil
	}
	if ok, err := s.repo.IsPlatformAdmin(ctx, userID); err != nil {
		return false, apperrors.New(http.StatusInternalServerError, "admin_status_check_failed", "failed to check platform admin access", err)
	} else if ok {
		return true, nil
	}
	return false, nil
}

func (s *Service) GetSchool(ctx context.Context, slug, actorID string) (schoolsrepo.School, error) {
	return s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
}

func (s *Service) UpdateSchool(ctx context.Context, slug, actorID string, input schoolsrepo.UpdateSchoolInput) (schoolsrepo.School, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner")
	if err != nil {
		return schoolsrepo.School{}, err
	}
	if input.Name != nil && strings.TrimSpace(*input.Name) == "" {
		return schoolsrepo.School{}, validation("name", "required", "Name is required")
	}
	if input.Status != nil && !oneOf(normalize(*input.Status), "draft", "published", "suspended") {
		return schoolsrepo.School{}, validation("status", "invalid", "Invalid school status")
	}
	if err := validateOptionalUUID("logoMediaId", input.LogoMediaID); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := validateOptionalUUID("coverMediaId", input.CoverMediaID); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := s.ensureSchoolMediaUsable(ctx, school.ID, "logoMediaId", input.LogoMediaID); err != nil {
		return schoolsrepo.School{}, err
	}
	if err := s.ensureSchoolMediaUsable(ctx, school.ID, "coverMediaId", input.CoverMediaID); err != nil {
		return schoolsrepo.School{}, err
	}
	return s.repo.UpdateSchool(ctx, school.ID, input)
}

func (s *Service) DeleteSchool(ctx context.Context, slug, actorID string) error {
	school, err := s.requireRole(ctx, slug, actorID, "owner")
	if err != nil {
		return err
	}
	return mapRepoErr(s.repo.DeleteSchool(ctx, school.ID), "school_delete_failed")
}

func (s *Service) ListPublicSchools(ctx context.Context, input schoolsrepo.PublicSchoolFilters) ([]schoolsrepo.School, error) {
	input.Search = strings.TrimSpace(input.Search)
	input.Location = strings.TrimSpace(input.Location)
	input.CourseType = normalize(input.CourseType)
	return s.repo.ListPublicSchools(ctx, input)
}

func (s *Service) GetPublicSchool(ctx context.Context, slug string) (schoolsrepo.School, error) {
	item, err := s.repo.GetPublicSchoolBySlug(ctx, strings.TrimSpace(slug))
	if err != nil {
		return item, mapNotFound(err, "school_not_found")
	}
	item.PaymentMethods, err = s.repo.ListPaymentMethods(ctx, item.ID)
	item.PaymentMethods = usablePaymentMethods(item.PaymentMethods)
	return item, err
}

func (s *Service) ListPublicCourses(ctx context.Context, slug string, input schoolsrepo.PublicCourseFilters) (schoolsrepo.School, []schoolsrepo.Course, error) {
	school, err := s.GetPublicSchool(ctx, slug)
	if err != nil {
		return schoolsrepo.School{}, nil, err
	}
	input.Search = strings.TrimSpace(input.Search)
	input.CourseType = normalize(input.CourseType)
	input.Level = normalize(input.Level)
	input.Payment = normalize(input.Payment)
	items, err := s.repo.ListPublicCourses(ctx, school.ID, input)
	return school, items, err
}

func (s *Service) GetPublicCourse(ctx context.Context, slug, courseSlug string) (schoolsrepo.School, schoolsrepo.Course, error) {
	school, err := s.GetPublicSchool(ctx, slug)
	if err != nil {
		return schoolsrepo.School{}, schoolsrepo.Course{}, err
	}
	course, err := s.repo.GetPublicCourse(ctx, school.ID, strings.TrimSpace(courseSlug))
	if err != nil {
		return school, course, mapNotFound(err, "course_not_found")
	}
	school.PaymentMethods, err = s.repo.ListPaymentMethods(ctx, school.ID)
	school.PaymentMethods = usablePaymentMethods(school.PaymentMethods)
	return school, course, err
}

func (s *Service) ListPublicCourseSessions(ctx context.Context, slug, courseSlug string) (schoolsrepo.School, schoolsrepo.Course, []schoolsrepo.Session, error) {
	school, course, err := s.GetPublicCourse(ctx, slug, courseSlug)
	if err != nil {
		return schoolsrepo.School{}, schoolsrepo.Course{}, nil, err
	}
	if !course.AllowSessionBooking {
		return school, course, []schoolsrepo.Session{}, nil
	}
	items, err := s.repo.ListPublicCourseSessions(ctx, school.ID, course.ID)
	return school, course, items, err
}

func (s *Service) CreateStudentBooking(ctx context.Context, slug, courseSlug, actorID string, input schoolsrepo.CreateBookingInput) (schoolsrepo.Booking, error) {
	school, course, err := s.GetPublicCourse(ctx, slug, courseSlug)
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	input = normalizeBooking(input)
	input.CourseID = course.ID
	input.StudentUserID = actorID
	input.AdminNotes = ""
	if strings.TrimSpace(actorID) == "" {
		return schoolsrepo.Booking{}, apperrors.New(http.StatusUnauthorized, "auth_required", "sign in required", nil)
	}
	if err := s.validatePublicBooking(ctx, school.ID, course, &input); err != nil {
		return schoolsrepo.Booking{}, err
	}
	if course.PaymentRequired {
		methods, err := s.repo.ListPaymentMethods(ctx, school.ID)
		if err != nil {
			return schoolsrepo.Booking{}, err
		}
		hasActiveMethod := false
		for _, method := range methods {
			if isUsablePaymentMethod(method) {
				hasActiveMethod = true
				break
			}
		}
		if !hasActiveMethod {
			return schoolsrepo.Booking{}, validation("paymentMethods", "missing", "School payment methods are not configured")
		}
	}
	item, err := s.repo.CreateBooking(ctx, school.ID, input, &schoolsrepo.BookingNotificationEvent{
		EventType:   notificationsrepo.OutboxEventBookingCreated,
		ActorUserID: actorID,
	})
	if err == nil {
		s.processNotificationOutbox(ctx, "booking_created", item.ID)
	}
	return item, err
}

func (s *Service) ListMyBookings(ctx context.Context, actorID string) ([]schoolsrepo.Booking, error) {
	return s.repo.ListMyBookings(ctx, actorID)
}

func (s *Service) GetMyBooking(ctx context.Context, actorID, bookingID string) (schoolsrepo.Booking, error) {
	item, err := s.repo.GetMyBooking(ctx, actorID, bookingID)
	return item, mapNotFound(err, "booking_not_found")
}

func (s *Service) CancelMyBooking(ctx context.Context, actorID, bookingID string) (schoolsrepo.Booking, error) {
	current, err := s.GetMyBooking(ctx, actorID, bookingID)
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	if !oneOf(current.Status, "pending_review", "approved", "scheduled") {
		return schoolsrepo.Booking{}, validation("status", "invalid_transition", "Booking cannot be cancelled by student")
	}
	item, err := s.repo.CancelMyBooking(ctx, actorID, bookingID)
	if err == nil {
		s.processNotificationOutbox(ctx, "booking_cancelled_by_student", item.ID)
	}
	return item, mapNotFound(err, "booking_not_found")
}

func (s *Service) SubmitMyBookingPayment(ctx context.Context, actorID, bookingID string, input schoolsrepo.SubmitBookingPaymentInput) (schoolsrepo.Booking, error) {
	if strings.TrimSpace(actorID) == "" {
		return schoolsrepo.Booking{}, apperrors.New(http.StatusUnauthorized, "auth_required", "sign in required", nil)
	}
	if !validUUID(bookingID) {
		return schoolsrepo.Booking{}, validation("bookingId", "invalid_uuid", "Invalid booking id")
	}
	input.PaymentMethodID = strings.TrimSpace(input.PaymentMethodID)
	input.ProofMediaID = strings.TrimSpace(input.ProofMediaID)
	input.ReferenceNumber = strings.TrimSpace(input.ReferenceNumber)
	if input.ProofMediaID == "" {
		return schoolsrepo.Booking{}, validation("proofMediaId", "required", "Payment receipt is required")
	}
	if !validUUID(input.ProofMediaID) {
		return schoolsrepo.Booking{}, validation("proofMediaId", "invalid_uuid", "Invalid receipt media id")
	}
	if input.PaymentMethodID != "" && !validUUID(input.PaymentMethodID) {
		return schoolsrepo.Booking{}, validation("paymentMethodId", "invalid_uuid", "Invalid payment method id")
	}
	item, err := s.repo.SubmitMyBookingPayment(ctx, actorID, bookingID, input)
	return item, mapNotFound(err, "booking_payment_not_found")
}

func (s *Service) ListCourses(ctx context.Context, slug, actorID string) ([]schoolsrepo.Course, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
	if err != nil {
		return nil, err
	}
	return s.repo.ListCourses(ctx, school.ID)
}

func (s *Service) CreateCourse(ctx context.Context, slug, actorID string, input schoolsrepo.CreateCourseInput) (schoolsrepo.Course, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Course{}, err
	}
	input = normalizeCourse(input)
	if err := validateCourse(input); err != nil {
		return schoolsrepo.Course{}, err
	}
	item, err := s.repo.CreateCourse(ctx, school.ID, input)
	return item, mapRepoErr(err, "course_create_failed")
}

func (s *Service) GetCourse(ctx context.Context, slug, actorID, courseID string) (schoolsrepo.Course, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
	if err != nil {
		return schoolsrepo.Course{}, err
	}
	item, err := s.repo.GetCourse(ctx, school.ID, courseID)
	return item, mapNotFound(err, "course_not_found")
}

func (s *Service) UpdateCourse(ctx context.Context, slug, actorID, courseID string, input schoolsrepo.UpdateCourseInput) (schoolsrepo.Course, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Course{}, err
	}
	current, err := s.repo.GetCourse(ctx, school.ID, courseID)
	if err != nil {
		return schoolsrepo.Course{}, mapNotFound(err, "course_not_found")
	}
	input = normalizeCourse(input)
	if !validCourseTransition(current.Status, input.Status) {
		return schoolsrepo.Course{}, validation("status", "invalid_transition", "Invalid course status transition")
	}
	if err := validateCourse(input); err != nil {
		return schoolsrepo.Course{}, err
	}
	return s.repo.UpdateCourse(ctx, school.ID, courseID, input)
}

func (s *Service) DeleteCourse(ctx context.Context, slug, actorID, courseID string) error {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return err
	}
	return mapRepoErr(s.repo.DeleteCourse(ctx, school.ID, courseID), "course_delete_failed")
}

func (s *Service) ListPaymentMethods(ctx context.Context, slug, actorID, courseID string) ([]schoolsrepo.PaymentMethod, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(courseID) != "" {
		if _, err := s.repo.GetCourse(ctx, school.ID, courseID); err != nil {
			return nil, mapNotFound(err, "course_not_found")
		}
	}
	return s.repo.ListPaymentMethods(ctx, school.ID)
}

func (s *Service) CreatePaymentMethod(ctx context.Context, slug, actorID, courseID string, input schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	if strings.TrimSpace(courseID) != "" {
		if _, err := s.repo.GetCourse(ctx, school.ID, courseID); err != nil {
			return schoolsrepo.PaymentMethod{}, mapNotFound(err, "course_not_found")
		}
	}
	input = normalizePaymentMethod(input)
	if err := validatePaymentMethod(input); err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	return s.repo.CreatePaymentMethod(ctx, school.ID, input)
}

func (s *Service) UpdatePaymentMethod(ctx context.Context, slug, actorID, courseID, methodID string, input schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	if strings.TrimSpace(courseID) != "" {
		if _, err := s.repo.GetCourse(ctx, school.ID, courseID); err != nil {
			return schoolsrepo.PaymentMethod{}, mapNotFound(err, "course_not_found")
		}
	}
	input = normalizePaymentMethod(input)
	if err := validatePaymentMethod(input); err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	item, err := s.repo.UpdatePaymentMethod(ctx, school.ID, methodID, input)
	return item, mapNotFound(err, "payment_method_not_found")
}

func (s *Service) DeletePaymentMethod(ctx context.Context, slug, actorID, courseID, methodID string) error {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return err
	}
	if strings.TrimSpace(courseID) != "" {
		if _, err := s.repo.GetCourse(ctx, school.ID, courseID); err != nil {
			return mapNotFound(err, "course_not_found")
		}
	}
	return s.repo.DeletePaymentMethod(ctx, school.ID, methodID)
}

func (s *Service) ListSessions(ctx context.Context, slug, actorID string, input schoolsrepo.ListSessionsInput) ([]schoolsrepo.Session, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
	if err != nil {
		return nil, err
	}
	return s.repo.ListSessions(ctx, school.ID, input)
}

func (s *Service) CreateSession(ctx context.Context, slug, actorID string, input schoolsrepo.CreateSessionInput) (schoolsrepo.Session, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Session{}, err
	}
	input = normalizeSession(input)
	if err := s.validateSession(ctx, school.ID, input); err != nil {
		return schoolsrepo.Session{}, err
	}
	return s.repo.CreateSession(ctx, school.ID, input)
}

func (s *Service) UpdateSession(ctx context.Context, slug, actorID, sessionID string, input schoolsrepo.UpdateSessionInput) (schoolsrepo.Session, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Session{}, err
	}
	current, err := s.repo.GetSession(ctx, school.ID, sessionID)
	if err != nil {
		return schoolsrepo.Session{}, mapNotFound(err, "session_not_found")
	}
	if current.Status == "completed" || current.Status == "cancelled" {
		return schoolsrepo.Session{}, validation("status", "locked", "Completed or cancelled sessions are read-only")
	}
	input = normalizeSession(input)
	if !validSessionTransition(current.Status, input.Status) {
		return schoolsrepo.Session{}, validation("status", "invalid_transition", "Invalid session status transition")
	}
	if err := s.validateSession(ctx, school.ID, input); err != nil {
		return schoolsrepo.Session{}, err
	}
	changes := meaningfulSessionChanges(current, input)
	var event *schoolsrepo.SessionNotificationEvent
	if len(changes) > 0 {
		event = &schoolsrepo.SessionNotificationEvent{
			EventType:        notificationsrepo.OutboxEventSessionUpdated,
			ActorUserID:      actorID,
			ChangeTypes:      changes,
			PreviousStatus:   current.Status,
			PreviousStartsAt: current.StartsAt,
			PreviousEndsAt:   current.EndsAt,
		}
	}
	item, err := s.repo.UpdateSession(ctx, school.ID, sessionID, input, event)
	if err == nil && event != nil {
		s.processNotificationOutbox(ctx, "session_updated", item.ID)
	}
	return item, err
}

func (s *Service) SetSessionStatus(ctx context.Context, slug, actorID, sessionID, status string) (schoolsrepo.Session, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Session{}, err
	}
	current, err := s.repo.GetSession(ctx, school.ID, sessionID)
	if err != nil {
		return schoolsrepo.Session{}, mapNotFound(err, "session_not_found")
	}
	if !validSessionTransition(current.Status, status) {
		return schoolsrepo.Session{}, validation("status", "invalid_transition", "Invalid session status transition")
	}
	var event *schoolsrepo.SessionNotificationEvent
	if status == "cancelled" && current.Status != "cancelled" {
		event = &schoolsrepo.SessionNotificationEvent{
			EventType:         notificationsrepo.OutboxEventSessionCancelled,
			ActorUserID:       actorID,
			ChangeTypes:       []string{"status"},
			PreviousStatus:    current.Status,
			PreviousStartsAt:  current.StartsAt,
			PreviousEndsAt:    current.EndsAt,
			IdempotencySuffix: "cancelled",
		}
	}
	item, err := s.repo.SetSessionStatus(ctx, school.ID, sessionID, status, event)
	if err == nil && event != nil {
		s.processNotificationOutbox(ctx, "session_cancelled", item.ID)
	}
	return item, err
}

func (s *Service) DeleteSession(ctx context.Context, slug, actorID, sessionID string) error {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return err
	}
	return s.repo.DeleteSession(ctx, school.ID, sessionID)
}

func (s *Service) ListSessionBookings(ctx context.Context, slug, actorID, sessionID string) ([]schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
	if err != nil {
		return nil, err
	}
	session, err := s.repo.GetSession(ctx, school.ID, sessionID)
	if err != nil {
		return nil, mapNotFound(err, "session_not_found")
	}
	return s.repo.ListSessionBookings(ctx, school.ID, session.ID)
}

func (s *Service) ListBookings(ctx context.Context, slug, actorID string, input schoolsrepo.ListBookingsInput) ([]schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin", "instructor")
	if err != nil {
		return nil, err
	}
	return s.repo.ListBookings(ctx, school.ID, input)
}

func (s *Service) CreateBooking(ctx context.Context, slug, actorID string, input schoolsrepo.CreateBookingInput) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	input = normalizeBooking(input)
	if err := s.validateBooking(ctx, school.ID, input); err != nil {
		return schoolsrepo.Booking{}, err
	}
	item, err := s.repo.CreateBooking(ctx, school.ID, input, nil)
	return item, err
}

func (s *Service) UpdateBooking(ctx context.Context, slug, actorID, bookingID string, input schoolsrepo.UpdateBookingInput) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	current, err := s.repo.GetBooking(ctx, school.ID, bookingID)
	if err != nil {
		return schoolsrepo.Booking{}, mapNotFound(err, "booking_not_found")
	}
	if current.Status == "completed" || current.Status == "cancelled" || current.Status == "rejected" {
		return schoolsrepo.Booking{}, validation("status", "locked", "Completed, cancelled, or rejected bookings cannot be edited")
	}
	input = normalizeBooking(input)
	if !validBookingTransition(current.Status, input.Status) {
		return schoolsrepo.Booking{}, validation("status", "invalid_transition", "Invalid booking status transition")
	}
	if err := s.validateBooking(ctx, school.ID, input); err != nil {
		return schoolsrepo.Booking{}, err
	}
	var event *schoolsrepo.BookingNotificationEvent
	if current.SessionID != input.SessionID || !sameDate(current.PreferredDate, input.PreferredDate) {
		event = &schoolsrepo.BookingNotificationEvent{
			EventType:         notificationsrepo.OutboxEventBookingRescheduled,
			ActorUserID:       actorID,
			PreviousSessionID: current.SessionID,
			IdempotencySuffix: "rescheduled:" + defaultString(input.SessionID, "unassigned") + ":" + input.PreferredDate.Format("20060102"),
		}
	}
	item, err := s.repo.UpdateBooking(ctx, school.ID, bookingID, input, event)
	if err == nil {
		s.processNotificationOutbox(ctx, "booking_rescheduled", item.ID)
	}
	return item, err
}

func (s *Service) SetBookingStatus(ctx context.Context, slug, actorID, bookingID, status string) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	current, err := s.repo.GetBooking(ctx, school.ID, bookingID)
	if err != nil {
		return schoolsrepo.Booking{}, mapNotFound(err, "booking_not_found")
	}
	if status == "scheduled" && current.SessionID == "" {
		return schoolsrepo.Booking{}, validation("sessionId", "required", "Scheduling requires a valid session assignment")
	}
	if !validBookingTransition(current.Status, status) {
		return schoolsrepo.Booking{}, validation("status", "invalid_transition", "Invalid booking status transition")
	}
	var event *schoolsrepo.BookingNotificationEvent
	if current.Status != status {
		switch status {
		case "approved":
			event = &schoolsrepo.BookingNotificationEvent{EventType: notificationsrepo.OutboxEventBookingApproved, ActorUserID: actorID, IdempotencySuffix: "approved"}
		case "rejected":
			event = &schoolsrepo.BookingNotificationEvent{EventType: notificationsrepo.OutboxEventBookingRejected, ActorUserID: actorID, IdempotencySuffix: "rejected"}
		case "cancelled":
			event = &schoolsrepo.BookingNotificationEvent{EventType: notificationsrepo.OutboxEventBookingCancelledBySchool, ActorUserID: actorID, IdempotencySuffix: "cancelled-by-school"}
		}
	}
	item, err := s.repo.SetBookingStatus(ctx, school.ID, bookingID, actorID, status, event)
	if err == nil && event != nil {
		s.processNotificationOutbox(ctx, "booking_status_"+status, item.ID)
	}
	return item, err
}

func (s *Service) AssignBookingSession(ctx context.Context, slug, actorID, bookingID, sessionID string) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	booking, err := s.repo.GetBooking(ctx, school.ID, bookingID)
	if err != nil {
		return schoolsrepo.Booking{}, mapNotFound(err, "booking_not_found")
	}
	if booking.Status != "approved" && booking.Status != "scheduled" {
		return schoolsrepo.Booking{}, validation("status", "invalid_transition", "Only approved bookings can be scheduled")
	}
	session, err := s.repo.GetSession(ctx, school.ID, sessionID)
	if err != nil {
		return schoolsrepo.Booking{}, mapNotFound(err, "session_not_found")
	}
	if session.CourseID != booking.CourseID {
		return schoolsrepo.Booking{}, validation("sessionId", "course_mismatch", "Session must belong to the booking course")
	}
	if err := validateBookableSession(session); err != nil {
		return schoolsrepo.Booking{}, err
	}
	if session.Capacity != nil && booking.SessionID != session.ID && session.AssignedBookingCount >= *session.Capacity {
		return schoolsrepo.Booking{}, validation("sessionId", "full", "Session is full")
	}
	var event *schoolsrepo.BookingNotificationEvent
	if booking.SessionID != session.ID {
		event = &schoolsrepo.BookingNotificationEvent{
			EventType:         notificationsrepo.OutboxEventBookingRescheduled,
			ActorUserID:       actorID,
			PreviousSessionID: booking.SessionID,
			IdempotencySuffix: "rescheduled:" + session.ID,
		}
	}
	item, err := s.repo.AssignBookingSession(ctx, school.ID, bookingID, session.ID, event)
	if err == nil && event != nil {
		s.processNotificationOutbox(ctx, "booking_rescheduled", item.ID)
	}
	return item, err
}

func (s *Service) UnassignBookingSession(ctx context.Context, slug, actorID, bookingID string) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	booking, err := s.repo.GetBooking(ctx, school.ID, bookingID)
	if err != nil {
		return schoolsrepo.Booking{}, mapNotFound(err, "booking_not_found")
	}
	var event *schoolsrepo.BookingNotificationEvent
	if booking.SessionID != "" {
		event = &schoolsrepo.BookingNotificationEvent{
			EventType:         notificationsrepo.OutboxEventBookingRescheduled,
			ActorUserID:       actorID,
			PreviousSessionID: booking.SessionID,
			IdempotencySuffix: "rescheduled:unassigned",
		}
	}
	item, err := s.repo.UnassignBookingSession(ctx, school.ID, bookingID, event)
	if err == nil && event != nil {
		s.processNotificationOutbox(ctx, "booking_rescheduled", item.ID)
	}
	return item, err
}

func (s *Service) ReviewBookingPayment(ctx context.Context, slug, actorID, bookingID, status, notes string) (schoolsrepo.BookingPayment, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.BookingPayment{}, err
	}
	if !oneOf(status, "verified", "rejected") {
		return schoolsrepo.BookingPayment{}, validation("status", "invalid", "Invalid payment review status")
	}
	return s.repo.ReviewBookingPayment(ctx, school.ID, bookingID, actorID, status, notes)
}

func (s *Service) GetBookingPaymentProofURL(ctx context.Context, slug, actorID, bookingID string) (BookingPaymentProofURL, error) {
	if !validUUID(bookingID) {
		return BookingPaymentProofURL{}, validation("bookingId", "invalid_uuid", "Invalid booking id")
	}
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return BookingPaymentProofURL{}, err
	}
	proof, err := s.repo.GetBookingPaymentProof(ctx, school.ID, bookingID)
	if err != nil {
		if schoolsrepo.IsNoRows(err) {
			return BookingPaymentProofURL{}, apperrors.New(http.StatusNotFound, "booking_payment_proof_not_found", "payment receipt not found", err)
		}
		return BookingPaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "booking_payment_proof_get_failed", "failed to load payment receipt", err)
	}
	if s.mediaSigner == nil || !s.mediaSigner.Configured() {
		return BookingPaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	url := s.mediaSigner.URLWithTransform(proof.ObjectKey, 0, 0, "", s.proofURLTTL)
	if url == "" {
		return BookingPaymentProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	return BookingPaymentProofURL{
		PaymentID:        proof.PaymentID,
		BookingID:        proof.BookingID,
		ProofMediaID:     proof.ProofMediaID,
		ProofFileName:    proof.FileName,
		ProofContentType: proof.ContentType,
		URL:              url,
		ExpiresAt:        s.nowFn().Add(s.proofURLTTL).Unix(),
	}, nil
}

func (s *Service) requireCourseManager(ctx context.Context, slug, actorID, courseID string) (schoolsrepo.Course, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Course{}, err
	}
	course, err := s.repo.GetCourse(ctx, school.ID, courseID)
	return course, mapNotFound(err, "course_not_found")
}

func (s *Service) requireRole(ctx context.Context, slug, actorID string, allowed ...string) (schoolsrepo.School, error) {
	school, err := s.repo.GetSchoolBySlug(ctx, strings.TrimSpace(slug), actorID)
	if err != nil {
		return schoolsrepo.School{}, mapNotFound(err, "school_not_found")
	}
	role, err := s.repo.GetMemberRole(ctx, school.ID, actorID)
	if err != nil {
		return schoolsrepo.School{}, apperrors.New(http.StatusForbidden, "forbidden", "school membership required", err)
	}
	for _, item := range allowed {
		if role == item {
			school.CurrentUserRole = role
			return school, nil
		}
	}
	return schoolsrepo.School{}, apperrors.New(http.StatusForbidden, "forbidden", "insufficient school role", nil)
}

func (s *Service) validateSession(ctx context.Context, schoolID string, input schoolsrepo.CreateSessionInput) error {
	if input.CourseID == "" {
		return validation("courseId", "required", "Course is required")
	}
	course, err := s.repo.GetCourse(ctx, schoolID, input.CourseID)
	if err != nil {
		return mapNotFound(err, "course_not_found")
	}
	if course.Status == "archived" {
		return validation("courseId", "archived", "Archived courses cannot receive new sessions")
	}
	if input.Title == "" {
		return validation("title", "required", "Title is required")
	}
	if input.StartsAt.IsZero() || input.EndsAt.IsZero() || !input.EndsAt.After(input.StartsAt) {
		return validation("endsAt", "invalid_range", "End time must be after start time")
	}
	if _, err := time.LoadLocation(input.Timezone); err != nil {
		return validation("timezone", "invalid", "Timezone must be a valid IANA timezone")
	}
	if input.Capacity != nil && *input.Capacity < 1 {
		return validation("capacity", "invalid", "Capacity must be positive")
	}
	if input.InstructorUserID != "" {
		role, err := s.repo.GetMemberRole(ctx, schoolID, input.InstructorUserID)
		if err != nil || !oneOf(role, "owner", "admin", "instructor") {
			return validation("instructorUserId", "invalid", "Instructor must be an active school member")
		}
	}
	if !oneOf(input.LocationMode, "inherit_course", "inherit_school", "structured", "text_only") {
		return validation("locationMode", "invalid", "Invalid session location mode")
	}
	if input.LocationMode == "structured" && firstNonEmpty(input.LocationLabel, input.FormattedAddress) == "" {
		return validation("locationLabel", "required", "A structured location is required")
	}
	if input.LocationMode == "text_only" && input.LocationLabel == "" {
		return validation("locationLabel", "required", "Location label is required for text-only locations")
	}
	return nil
}

func (s *Service) validateBooking(ctx context.Context, schoolID string, input schoolsrepo.CreateBookingInput) error {
	if input.CourseID == "" {
		return validation("courseId", "required", "Course is required")
	}
	course, err := s.repo.GetCourse(ctx, schoolID, input.CourseID)
	if err != nil {
		return mapNotFound(err, "course_not_found")
	}
	if course.Status == "archived" {
		return validation("courseId", "archived", "Archived courses cannot receive new bookings")
	}
	if input.BookingMode == "" {
		if input.SessionID != "" {
			input.BookingMode = "session"
		} else {
			input.BookingMode = "preferred_date"
		}
	}
	if !oneOf(input.BookingMode, "session", "preferred_date") {
		return validation("bookingMode", "invalid", "Invalid booking mode")
	}
	if input.BookingMode == "preferred_date" && input.PreferredDate.IsZero() {
		return validation("preferredDate", "required", "Preferred date is required")
	}
	if input.BookingMode == "session" && input.SessionID == "" {
		return validation("sessionId", "required", "Choose an available schedule")
	}
	if input.SessionID != "" {
		session, err := s.repo.GetSession(ctx, schoolID, input.SessionID)
		if err != nil {
			return mapNotFound(err, "session_not_found")
		}
		if session.CourseID != input.CourseID {
			return validation("sessionId", "course_mismatch", "Session must belong to the booking course")
		}
		if input.BookingMode == "session" {
			if err := validateBookableSession(session); err != nil {
				return err
			}
			if session.Capacity != nil && session.AssignedBookingCount >= *session.Capacity {
				return validation("sessionId", "full", "Session is full")
			}
		}
	}
	if input.Status == "scheduled" && input.SessionID == "" {
		return validation("sessionId", "required", "Scheduling requires a session")
	}
	return nil
}

func (s *Service) validatePublicBooking(ctx context.Context, schoolID string, course schoolsrepo.Course, input *schoolsrepo.CreateBookingInput) error {
	input.BookingMode = defaultString(normalize(input.BookingMode), "preferred_date")
	input.Status = "pending_review"
	if !course.AllowSessionBooking && !course.AllowPreferredDateRequest {
		return validation("bookingMode", "unavailable", "Bookings are currently unavailable for this course")
	}
	switch input.BookingMode {
	case "session":
		if !course.AllowSessionBooking {
			return validation("bookingMode", "disabled", "This course does not allow schedule booking")
		}
		if input.SessionID == "" {
			return validation("sessionId", "required", "Choose an available schedule")
		}
		session, err := s.repo.GetSession(ctx, schoolID, input.SessionID)
		if err != nil {
			return mapNotFound(err, "session_not_found")
		}
		if session.CourseID != course.ID {
			return validation("sessionId", "course_mismatch", "Session must belong to this course")
		}
		if err := validateBookableSession(session); err != nil {
			return err
		}
		if session.Capacity != nil && session.AssignedBookingCount >= *session.Capacity {
			return validation("sessionId", "full", "Session is full")
		}
		input.PreferredDate = time.Time{}
		input.AlternateDate = nil
		if !course.ApprovalRequired {
			input.Status = "scheduled"
		}
	case "preferred_date":
		if !course.AllowPreferredDateRequest {
			return validation("bookingMode", "disabled", "This course does not allow preferred date requests")
		}
		input.SessionID = ""
		if input.PreferredDate.IsZero() {
			return validation("preferredDate", "required", "Preferred date is required")
		}
		today := time.Now().In(time.FixedZone("PHT", 8*60*60)).Truncate(24 * time.Hour)
		if input.PreferredDate.Before(today) {
			return validation("preferredDate", "past", "Preferred date cannot be in the past")
		}
		if input.AlternateDate != nil && input.AlternateDate.Before(today) {
			return validation("alternateDate", "past", "Alternate date cannot be in the past")
		}
	default:
		return validation("bookingMode", "invalid", "Invalid booking mode")
	}
	return nil
}

func validateBookableSession(session schoolsrepo.Session) error {
	if session.Status != "scheduled" {
		return validation("sessionId", "closed", "Choose a scheduled future session")
	}
	if !session.StartsAt.After(time.Now()) {
		return validation("sessionId", "past", "Choose a future session")
	}
	return nil
}

func normalizeCourse(input schoolsrepo.CreateCourseInput) schoolsrepo.CreateCourseInput {
	input.Title = strings.TrimSpace(input.Title)
	input.CourseType = defaultString(normalize(input.CourseType), "custom")
	input.Level = normalize(input.Level)
	input.Currency = defaultString(strings.ToUpper(strings.TrimSpace(input.Currency)), defaultCurrency)
	input.Status = defaultString(normalize(input.Status), "draft")
	input.LocationMode = defaultString(normalize(input.LocationMode), "inherit_school")
	input.LocationSource = defaultString(normalize(input.LocationSource), "manual")
	input.LocationLabel = strings.TrimSpace(input.LocationLabel)
	input.LocationNote = strings.TrimSpace(input.LocationNote)
	input.FormattedAddress = strings.TrimSpace(input.FormattedAddress)
	if input.LocationMode == "inherit_school" {
		input.LocationLabel = ""
		input.FormattedAddress = ""
		input.RegionCode = ""
		input.RegionName = ""
		input.ProvinceCode = ""
		input.ProvinceName = ""
		input.CityCode = ""
		input.CityName = ""
		input.BarangayCode = ""
		input.BarangayName = ""
		input.LocationSource = "manual"
	}
	if input.LocationMode == "text_only" {
		input.FormattedAddress = ""
		input.RegionCode = ""
		input.RegionName = ""
		input.ProvinceCode = ""
		input.ProvinceName = ""
		input.CityCode = ""
		input.CityName = ""
		input.BarangayCode = ""
		input.BarangayName = ""
		input.LocationSource = "manual"
	}
	return input
}

func validateCourse(input schoolsrepo.CreateCourseInput) error {
	if input.Title == "" {
		return validation("title", "required", "Title is required")
	}
	if !oneOf(input.CourseType, "intro", "pool_training", "line_training", "depth_training", "certification", "coaching", "workshop", "trip_course", "custom") {
		return validation("courseType", "invalid", "Invalid course type")
	}
	if input.Level != "" && !oneOf(input.Level, "beginner", "intermediate", "advanced", "all_levels") {
		return validation("level", "invalid", "Invalid course level")
	}
	if !oneOf(input.Status, "draft", "published", "paused", "archived") {
		return validation("status", "invalid", "Invalid course status")
	}
	if input.Status == "published" && !input.AllowSessionBooking && !input.AllowPreferredDateRequest {
		return validation("bookingOptions", "required", "Published courses need at least one booking option")
	}
	if input.PaymentRequired && input.PriceAmount == nil {
		return validation("priceAmount", "required", "Price is required when payment is required")
	}
	if !oneOf(input.LocationMode, "inherit_school", "structured", "text_only") {
		return validation("locationMode", "invalid", "Invalid course location mode")
	}
	if input.LocationMode == "structured" && firstNonEmpty(input.LocationLabel, input.FormattedAddress) == "" {
		return validation("locationLabel", "required", "A structured location is required")
	}
	if input.LocationMode == "text_only" && input.LocationLabel == "" {
		return validation("locationLabel", "required", "Location label is required for text-only locations")
	}
	return nil
}

func normalizeSession(input schoolsrepo.CreateSessionInput) schoolsrepo.CreateSessionInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Timezone = defaultString(strings.TrimSpace(input.Timezone), defaultTimezone)
	input.Status = defaultString(normalize(input.Status), "draft")
	input.LocationMode = defaultString(normalize(input.LocationMode), "inherit_course")
	input.LocationSource = defaultString(normalize(input.LocationSource), "manual")
	input.LocationLabel = strings.TrimSpace(input.LocationLabel)
	input.LocationNote = strings.TrimSpace(input.LocationNote)
	input.FormattedAddress = strings.TrimSpace(input.FormattedAddress)
	if input.LocationMode == "inherit_course" || input.LocationMode == "inherit_school" {
		input.LocationLabel = ""
		input.FormattedAddress = ""
		input.RegionCode = ""
		input.RegionName = ""
		input.ProvinceCode = ""
		input.ProvinceName = ""
		input.CityCode = ""
		input.CityName = ""
		input.BarangayCode = ""
		input.BarangayName = ""
		input.LocationSource = "manual"
	}
	if input.LocationMode == "text_only" {
		input.FormattedAddress = ""
		input.RegionCode = ""
		input.RegionName = ""
		input.ProvinceCode = ""
		input.ProvinceName = ""
		input.CityCode = ""
		input.CityName = ""
		input.BarangayCode = ""
		input.BarangayName = ""
		input.LocationSource = "manual"
	}
	return input
}

func meaningfulSessionChanges(current schoolsrepo.Session, input schoolsrepo.UpdateSessionInput) []string {
	changes := []string{}
	if !current.StartsAt.Equal(input.StartsAt) {
		changes = append(changes, "starts_at")
	}
	if !current.EndsAt.Equal(input.EndsAt) {
		changes = append(changes, "ends_at")
	}
	if current.LocationMode != input.LocationMode ||
		current.LocationLabel != input.LocationLabel ||
		current.FormattedAddress != input.FormattedAddress ||
		current.RegionCode != input.RegionCode ||
		current.ProvinceCode != input.ProvinceCode ||
		current.CityCode != input.CityCode ||
		current.BarangayCode != input.BarangayCode ||
		current.DiveSiteID != input.DiveSiteID {
		changes = append(changes, "location")
	}
	if current.InstructorUserID != input.InstructorUserID {
		changes = append(changes, "instructor")
	}
	if current.Status != input.Status {
		changes = append(changes, "status")
	}
	if !sameIntPtr(current.Capacity, input.Capacity) && current.AssignedBookingCount > 0 {
		changes = append(changes, "capacity")
	}
	return changes
}

func sameIntPtr(left, right *int) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return *left == *right
}

func sameDate(left, right time.Time) bool {
	return left.Format("2006-01-02") == right.Format("2006-01-02")
}

func (s *Service) processNotificationOutbox(ctx context.Context, transition, id string) {
	if s.notifications == nil {
		return
	}
	if _, err := s.notifications.ProcessDueOutbox(ctx, 10); err != nil {
		slog.Default().Warn("schools.notification_outbox_process_failed",
			slog.String("transition", transition),
			slog.String("id", id),
			slog.Any("error", err),
		)
	}
}

func normalizeBooking(input schoolsrepo.CreateBookingInput) schoolsrepo.CreateBookingInput {
	input.BookingMode = normalize(input.BookingMode)
	if input.BookingMode == "" {
		if strings.TrimSpace(input.SessionID) != "" {
			input.BookingMode = "session"
		} else {
			input.BookingMode = "preferred_date"
		}
	}
	input.SessionID = strings.TrimSpace(input.SessionID)
	input.Status = defaultString(normalize(input.Status), "pending_review")
	return input
}

func normalizePaymentMethod(input schoolsrepo.CreatePaymentMethodInput) schoolsrepo.CreatePaymentMethodInput {
	input.Type = normalizePaymentMethodType(input.Type)
	input.Name = strings.TrimSpace(input.Name)
	input.Instructions = strings.TrimSpace(input.Instructions)
	input.QRMediaID = strings.TrimSpace(input.QRMediaID)
	input.BankName = strings.TrimSpace(input.BankName)
	input.AccountName = strings.TrimSpace(input.AccountName)
	input.AccountNumber = strings.TrimSpace(input.AccountNumber)
	if input.Name == "" && input.Type != "" {
		input.Name = defaultPaymentMethodName(input.Type)
	}
	return input
}

func validatePaymentMethod(input schoolsrepo.CreatePaymentMethodInput) error {
	if !oneOf(input.Type, "manual_qr", "bank_transfer") {
		return validation("type", "invalid", "Invalid payment method type")
	}
	if !input.IsActive {
		return nil
	}
	if input.Type == "manual_qr" && input.QRMediaID == "" {
		return validation("qrMediaId", "required", "Upload a QR image before activating this payment method")
	}
	if input.Type == "bank_transfer" && (input.BankName == "" || input.AccountName == "" || input.AccountNumber == "") {
		return validation("bankName", "required", "Bank transfer requires bank name, account name, and account number")
	}
	return nil
}

func normalizePaymentMethodType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "manual_qr", "manual qr":
		return "manual_qr"
	case "bank_transfer", "bank transfer", "manual_bank_transfer":
		return "bank_transfer"
	default:
		return ""
	}
}

func defaultPaymentMethodName(value string) string {
	if value == "manual_qr" {
		return "Manual QR"
	}
	if value == "bank_transfer" {
		return "Bank transfer"
	}
	return ""
}

func usablePaymentMethods(items []schoolsrepo.PaymentMethod) []schoolsrepo.PaymentMethod {
	usable := make([]schoolsrepo.PaymentMethod, 0, len(items))
	for _, item := range items {
		if isUsablePaymentMethod(item) {
			usable = append(usable, item)
		}
	}
	return usable
}

func isUsablePaymentMethod(item schoolsrepo.PaymentMethod) bool {
	if !item.IsActive {
		return false
	}
	switch item.Type {
	case "manual_qr":
		return strings.TrimSpace(item.QRMediaID) != ""
	case "bank_transfer":
		return strings.TrimSpace(item.BankName) != "" &&
			strings.TrimSpace(item.AccountName) != "" &&
			strings.TrimSpace(item.AccountNumber) != ""
	default:
		return false
	}
}

func validCourseTransition(from, to string) bool {
	if from == to {
		return true
	}
	return (from == "draft" && to == "published") || (from == "published" && to == "paused") || (from == "paused" && to == "published") || (to == "archived" && oneOf(from, "draft", "published", "paused"))
}

func validSessionTransition(from, to string) bool {
	if from == to {
		return true
	}
	return (from == "draft" && oneOf(to, "scheduled", "cancelled")) || (from == "scheduled" && oneOf(to, "completed", "cancelled"))
}

func validBookingTransition(from, to string) bool {
	if from == to {
		return true
	}
	if to == "cancelled" && oneOf(from, "pending_review", "approved", "scheduled") {
		return true
	}
	switch from {
	case "pending_review":
		return oneOf(to, "approved", "rejected")
	case "approved":
		return oneOf(to, "scheduled", "reschedule_requested")
	case "scheduled":
		return oneOf(to, "completed", "reschedule_requested")
	}
	return false
}

func validateEmail(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	if _, err := mail.ParseAddress(value); err != nil {
		return validation(field, "invalid", "Invalid email")
	}
	return nil
}

func validateURL(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return validation(field, "invalid", "Invalid URL")
	}
	return nil
}

func mapNotFound(err error, code string) error {
	if err == nil {
		return nil
	}
	if schoolsrepo.IsNoRows(err) {
		return apperrors.New(http.StatusNotFound, code, "resource not found", err)
	}
	return mapRepoErr(err, code)
}

func mapRepoErr(err error, code string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, schoolsrepo.ErrSlugCollision) {
		return apperrors.New(http.StatusConflict, "slug_collision", "could not generate a unique slug", err)
	}
	return apperrors.New(http.StatusInternalServerError, code, "operation failed", err)
}

func validation(path, code, message string) ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{Path: []any{path}, Code: code, Message: message}}}
}

func validateOptionalUUID(field string, value *string) error {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	if _, err := uuid.Parse(strings.TrimSpace(*value)); err != nil {
		return validation(field, "invalid_uuid", "Must be a valid UUID")
	}
	return nil
}

func (s *Service) ensureSchoolMediaUsable(ctx context.Context, schoolID, field string, mediaID *string) error {
	if mediaID == nil || strings.TrimSpace(*mediaID) == "" {
		return nil
	}
	ok, err := s.repo.MediaBelongsToSchool(ctx, schoolID, strings.TrimSpace(*mediaID))
	if err != nil {
		return apperrors.New(http.StatusInternalServerError, "media_check_failed", "failed to validate media ownership", err)
	}
	if !ok {
		return validation(field, "not_found", "Media was not found for this school")
	}
	return nil
}

func normalize(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func validUUID(value string) bool {
	_, err := uuid.Parse(value)
	return err == nil
}

var _ = validUUID
