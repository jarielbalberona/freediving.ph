package service

import (
	"context"
	"errors"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	schoolsrepo "fphgo/internal/features/schools/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type Service struct {
	repo repository
}

type repository interface {
	ListSchools(context.Context, string) ([]schoolsrepo.School, error)
	CreateSchool(context.Context, schoolsrepo.CreateSchoolInput) (schoolsrepo.School, error)
	GetSchoolBySlug(context.Context, string, string) (schoolsrepo.School, error)
	GetMemberRole(context.Context, string, string) (string, error)
	UpdateSchool(context.Context, string, schoolsrepo.UpdateSchoolInput) (schoolsrepo.School, error)
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
	UpdateSession(context.Context, string, string, schoolsrepo.UpdateSessionInput) (schoolsrepo.Session, error)
	SetSessionStatus(context.Context, string, string, string) (schoolsrepo.Session, error)
	DeleteSession(context.Context, string, string) error
	ListSessionBookings(context.Context, string, string) ([]schoolsrepo.Booking, error)
	ListBookings(context.Context, string, schoolsrepo.ListBookingsInput) ([]schoolsrepo.Booking, error)
	CreateBooking(context.Context, string, schoolsrepo.CreateBookingInput) (schoolsrepo.Booking, error)
	GetBooking(context.Context, string, string) (schoolsrepo.Booking, error)
	UpdateBooking(context.Context, string, string, schoolsrepo.UpdateBookingInput) (schoolsrepo.Booking, error)
	SetBookingStatus(context.Context, string, string, string, string) (schoolsrepo.Booking, error)
	AssignBookingSession(context.Context, string, string, string) (schoolsrepo.Booking, error)
	UnassignBookingSession(context.Context, string, string) (schoolsrepo.Booking, error)
	ReviewBookingPayment(context.Context, string, string, string, string, string) (schoolsrepo.BookingPayment, error)
	ListPublicSchools(context.Context, schoolsrepo.PublicSchoolFilters) ([]schoolsrepo.School, error)
	GetPublicSchoolBySlug(context.Context, string) (schoolsrepo.School, error)
	ListPublicCourses(context.Context, string, schoolsrepo.PublicCourseFilters) ([]schoolsrepo.Course, error)
	GetPublicCourse(context.Context, string, string) (schoolsrepo.Course, error)
	ListMyBookings(context.Context, string) ([]schoolsrepo.Booking, error)
	GetMyBooking(context.Context, string, string) (schoolsrepo.Booking, error)
	CancelMyBooking(context.Context, string, string) (schoolsrepo.Booking, error)
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

func New(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListSchools(ctx context.Context, actorID string) ([]schoolsrepo.School, error) {
	return s.repo.ListSchools(ctx, actorID)
}

func (s *Service) CreateSchool(ctx context.Context, actorID string, input schoolsrepo.CreateSchoolInput) (schoolsrepo.School, error) {
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
	return item, mapRepoErr(err, "school_create_failed")
}

func (s *Service) GetSchool(ctx context.Context, slug, actorID string) (schoolsrepo.School, error) {
	item, err := s.repo.GetSchoolBySlug(ctx, strings.TrimSpace(slug), actorID)
	return item, mapNotFound(err, "school_not_found")
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
	return item, mapNotFound(err, "school_not_found")
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
	return school, course, mapNotFound(err, "course_not_found")
}

func (s *Service) CreateStudentBooking(ctx context.Context, slug, courseSlug, actorID string, input schoolsrepo.CreateBookingInput) (schoolsrepo.Booking, error) {
	school, course, err := s.GetPublicCourse(ctx, slug, courseSlug)
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	input = normalizeBooking(input)
	input.CourseID = course.ID
	input.StudentUserID = actorID
	input.SessionID = ""
	input.Status = "pending_review"
	input.AdminNotes = ""
	if strings.TrimSpace(actorID) == "" {
		return schoolsrepo.Booking{}, apperrors.New(http.StatusUnauthorized, "auth_required", "sign in required", nil)
	}
	if input.PreferredDate.IsZero() {
		return schoolsrepo.Booking{}, validation("preferredDate", "required", "Preferred date is required")
	}
	today := time.Now().In(time.FixedZone("PHT", 8*60*60)).Truncate(24 * time.Hour)
	if input.PreferredDate.Before(today) {
		return schoolsrepo.Booking{}, validation("preferredDate", "past", "Preferred date cannot be in the past")
	}
	return s.repo.CreateBooking(ctx, school.ID, input)
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
	return item, mapNotFound(err, "booking_not_found")
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
	course, err := s.requireCourseManager(ctx, slug, actorID, courseID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListPaymentMethods(ctx, course.ID)
}

func (s *Service) CreatePaymentMethod(ctx context.Context, slug, actorID, courseID string, input schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	course, err := s.requireCourseManager(ctx, slug, actorID, courseID)
	if err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	input = normalizePaymentMethod(input)
	if err := validatePaymentMethod(input); err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	return s.repo.CreatePaymentMethod(ctx, course.ID, input)
}

func (s *Service) UpdatePaymentMethod(ctx context.Context, slug, actorID, courseID, methodID string, input schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	course, err := s.requireCourseManager(ctx, slug, actorID, courseID)
	if err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	input = normalizePaymentMethod(input)
	if err := validatePaymentMethod(input); err != nil {
		return schoolsrepo.PaymentMethod{}, err
	}
	item, err := s.repo.UpdatePaymentMethod(ctx, course.ID, methodID, input)
	return item, mapNotFound(err, "payment_method_not_found")
}

func (s *Service) DeletePaymentMethod(ctx context.Context, slug, actorID, courseID, methodID string) error {
	course, err := s.requireCourseManager(ctx, slug, actorID, courseID)
	if err != nil {
		return err
	}
	return s.repo.DeletePaymentMethod(ctx, course.ID, methodID)
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
	return s.repo.UpdateSession(ctx, school.ID, sessionID, input)
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
	return s.repo.SetSessionStatus(ctx, school.ID, sessionID, status)
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
	return s.repo.CreateBooking(ctx, school.ID, input)
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
	return s.repo.UpdateBooking(ctx, school.ID, bookingID, input)
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
	return s.repo.SetBookingStatus(ctx, school.ID, bookingID, actorID, status)
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
	if session.Status == "completed" || session.Status == "cancelled" {
		return schoolsrepo.Booking{}, validation("sessionId", "closed", "Cannot assign bookings to completed or cancelled sessions")
	}
	return s.repo.AssignBookingSession(ctx, school.ID, bookingID, session.ID)
}

func (s *Service) UnassignBookingSession(ctx context.Context, slug, actorID, bookingID string) (schoolsrepo.Booking, error) {
	school, err := s.requireRole(ctx, slug, actorID, "owner", "admin")
	if err != nil {
		return schoolsrepo.Booking{}, err
	}
	return s.repo.UnassignBookingSession(ctx, school.ID, bookingID)
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
	if input.PreferredDate.IsZero() {
		return validation("preferredDate", "required", "Preferred date is required")
	}
	if input.Status == "scheduled" && input.SessionID == "" {
		return validation("sessionId", "required", "Scheduling requires a session")
	}
	if input.SessionID != "" {
		session, err := s.repo.GetSession(ctx, schoolID, input.SessionID)
		if err != nil {
			return mapNotFound(err, "session_not_found")
		}
		if session.CourseID != input.CourseID {
			return validation("sessionId", "course_mismatch", "Session must belong to the booking course")
		}
	}
	return nil
}

func normalizeCourse(input schoolsrepo.CreateCourseInput) schoolsrepo.CreateCourseInput {
	input.Title = strings.TrimSpace(input.Title)
	input.CourseType = defaultString(normalize(input.CourseType), "custom")
	input.Level = normalize(input.Level)
	input.Currency = defaultString(strings.ToUpper(strings.TrimSpace(input.Currency)), "PHP")
	input.Status = defaultString(normalize(input.Status), "draft")
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
	if input.PaymentRequired && input.PriceAmount == nil {
		return validation("priceAmount", "required", "Price is required when payment is required")
	}
	return nil
}

func normalizeSession(input schoolsrepo.CreateSessionInput) schoolsrepo.CreateSessionInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Timezone = defaultString(strings.TrimSpace(input.Timezone), "Asia/Manila")
	input.Status = defaultString(normalize(input.Status), "draft")
	return input
}

func normalizeBooking(input schoolsrepo.CreateBookingInput) schoolsrepo.CreateBookingInput {
	input.Status = defaultString(normalize(input.Status), "pending_review")
	return input
}

func normalizePaymentMethod(input schoolsrepo.CreatePaymentMethodInput) schoolsrepo.CreatePaymentMethodInput {
	input.Type = strings.ToUpper(strings.TrimSpace(input.Type))
	input.Name = strings.TrimSpace(input.Name)
	return input
}

func validatePaymentMethod(input schoolsrepo.CreatePaymentMethodInput) error {
	if !oneOf(input.Type, "MANUAL_QR", "MANUAL_BANK_TRANSFER") {
		return validation("type", "invalid", "Invalid payment method type")
	}
	if input.Name == "" {
		return validation("name", "required", "Name is required")
	}
	if input.Type == "MANUAL_QR" && input.QRMediaID == "" && strings.TrimSpace(input.Instructions) == "" {
		return validation("instructions", "required", "Manual QR needs instructions or a QR media id")
	}
	if input.Type == "MANUAL_BANK_TRANSFER" && (input.BankName == "" || input.AccountName == "" || input.AccountNumber == "") {
		return validation("bankName", "required", "Bank transfer requires bank name, account name, and account number")
	}
	return nil
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

func normalize(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
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
