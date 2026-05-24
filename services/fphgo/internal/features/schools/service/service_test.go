package service

import (
	"context"
	"strings"
	"testing"
	"time"

	schoolsrepo "fphgo/internal/features/schools/repo"
)

type fakeRepo struct {
	school         schoolsrepo.School
	role           string
	course         schoolsrepo.Course
	session        schoolsrepo.Session
	booking        schoolsrepo.Booking
	paymentMethods []schoolsrepo.PaymentMethod

	capturedCourse       schoolsrepo.CreateCourseInput
	capturedSession      schoolsrepo.CreateSessionInput
	capturedBooking      schoolsrepo.CreateBookingInput
	capturedPayment      schoolsrepo.SubmitBookingPaymentInput
	capturedSchool       schoolsrepo.UpdateSchoolInput
	listPaymentsSchoolID string

	verifiedInstructor bool
	instructorStatus   string
	platformAdmin      bool
}

func (f *fakeRepo) ListSchools(context.Context, string) ([]schoolsrepo.School, error) {
	return []schoolsrepo.School{f.school}, nil
}
func (f *fakeRepo) IsVerifiedInstructor(context.Context, string) (bool, error) {
	if f.instructorStatus != "" {
		return f.instructorStatus == "verified", nil
	}
	return f.verifiedInstructor, nil
}
func (f *fakeRepo) IsPlatformAdmin(context.Context, string) (bool, error) {
	return f.platformAdmin, nil
}
func (f *fakeRepo) CreateSchool(context.Context, schoolsrepo.CreateSchoolInput) (schoolsrepo.School, error) {
	return f.school, nil
}
func (f *fakeRepo) GetSchoolBySlug(context.Context, string, string) (schoolsrepo.School, error) {
	return f.school, nil
}
func (f *fakeRepo) GetMemberRole(context.Context, string, string) (string, error) {
	return f.role, nil
}
func (f *fakeRepo) UpdateSchool(_ context.Context, _ string, input schoolsrepo.UpdateSchoolInput) (schoolsrepo.School, error) {
	f.capturedSchool = input
	return f.school, nil
}
func (f *fakeRepo) DeleteSchool(context.Context, string) error { return nil }
func (f *fakeRepo) ListCourses(context.Context, string) ([]schoolsrepo.Course, error) {
	return []schoolsrepo.Course{f.course}, nil
}
func (f *fakeRepo) CreateCourse(_ context.Context, _ string, input schoolsrepo.CreateCourseInput) (schoolsrepo.Course, error) {
	f.capturedCourse = input
	return f.course, nil
}
func (f *fakeRepo) GetCourse(context.Context, string, string) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) UpdateCourse(context.Context, string, string, schoolsrepo.UpdateCourseInput) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) DeleteCourse(context.Context, string, string) error { return nil }
func (f *fakeRepo) ListPaymentMethods(_ context.Context, schoolID string) ([]schoolsrepo.PaymentMethod, error) {
	f.listPaymentsSchoolID = schoolID
	return f.paymentMethods, nil
}
func (f *fakeRepo) CreatePaymentMethod(context.Context, string, schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	return schoolsrepo.PaymentMethod{}, nil
}
func (f *fakeRepo) UpdatePaymentMethod(context.Context, string, string, schoolsrepo.CreatePaymentMethodInput) (schoolsrepo.PaymentMethod, error) {
	return schoolsrepo.PaymentMethod{}, nil
}
func (f *fakeRepo) DeletePaymentMethod(context.Context, string, string) error { return nil }
func (f *fakeRepo) ListSessions(context.Context, string, schoolsrepo.ListSessionsInput) ([]schoolsrepo.Session, error) {
	return []schoolsrepo.Session{f.session}, nil
}
func (f *fakeRepo) CreateSession(_ context.Context, _ string, input schoolsrepo.CreateSessionInput) (schoolsrepo.Session, error) {
	f.capturedSession = input
	return f.session, nil
}
func (f *fakeRepo) GetSession(context.Context, string, string) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) UpdateSession(context.Context, string, string, schoolsrepo.UpdateSessionInput, *schoolsrepo.SessionNotificationEvent) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) SetSessionStatus(context.Context, string, string, string, *schoolsrepo.SessionNotificationEvent) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) DeleteSession(context.Context, string, string) error { return nil }
func (f *fakeRepo) ListSessionBookings(context.Context, string, string) ([]schoolsrepo.Booking, error) {
	return []schoolsrepo.Booking{f.booking}, nil
}
func (f *fakeRepo) ListBookings(context.Context, string, schoolsrepo.ListBookingsInput) ([]schoolsrepo.Booking, error) {
	return []schoolsrepo.Booking{f.booking}, nil
}
func (f *fakeRepo) CreateBooking(_ context.Context, _ string, input schoolsrepo.CreateBookingInput, _ *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error) {
	f.capturedBooking = input
	return f.booking, nil
}
func (f *fakeRepo) GetBooking(context.Context, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) UpdateBooking(context.Context, string, string, schoolsrepo.UpdateBookingInput, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) SetBookingStatus(context.Context, string, string, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) AssignBookingSession(context.Context, string, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) UnassignBookingSession(context.Context, string, string, *schoolsrepo.BookingNotificationEvent) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) ReviewBookingPayment(context.Context, string, string, string, string, string) (schoolsrepo.BookingPayment, error) {
	return schoolsrepo.BookingPayment{}, nil
}
func (f *fakeRepo) SubmitMyBookingPayment(_ context.Context, _ string, _ string, input schoolsrepo.SubmitBookingPaymentInput) (schoolsrepo.Booking, error) {
	f.capturedPayment = input
	f.booking.Payment = &schoolsrepo.BookingPayment{
		ID:              "payment-1",
		BookingID:       f.booking.ID,
		CourseID:        f.booking.CourseID,
		SchoolID:        f.booking.SchoolID,
		PaymentMethodID: input.PaymentMethodID,
		ProofMediaID:    input.ProofMediaID,
		ReferenceNumber: input.ReferenceNumber,
		Status:          "submitted",
	}
	return f.booking, nil
}
func (f *fakeRepo) ListPublicSchools(context.Context, schoolsrepo.PublicSchoolFilters) ([]schoolsrepo.School, error) {
	return []schoolsrepo.School{f.school}, nil
}
func (f *fakeRepo) GetPublicSchoolBySlug(context.Context, string) (schoolsrepo.School, error) {
	return f.school, nil
}
func (f *fakeRepo) ListPublicCourses(context.Context, string, schoolsrepo.PublicCourseFilters) ([]schoolsrepo.Course, error) {
	return []schoolsrepo.Course{f.course}, nil
}
func (f *fakeRepo) GetPublicCourse(context.Context, string, string) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) ListPublicCourseSessions(context.Context, string, string) ([]schoolsrepo.Session, error) {
	return []schoolsrepo.Session{f.session}, nil
}
func (f *fakeRepo) ListMyBookings(context.Context, string) ([]schoolsrepo.Booking, error) {
	return []schoolsrepo.Booking{f.booking}, nil
}
func (f *fakeRepo) GetMyBooking(context.Context, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) CancelMyBooking(context.Context, string, string) (schoolsrepo.Booking, error) {
	f.booking.Status = "cancelled"
	return f.booking, nil
}

func seededService() *Service {
	return New(&fakeRepo{
		school: schoolsrepo.School{ID: "school-1", Slug: "school"},
		role:   "owner",
		course: schoolsrepo.Course{ID: "course-1", SchoolID: "school-1", Status: "published", CourseType: "custom", Title: "Course", Currency: "PHP", LocationMode: "inherit_school", AllowPreferredDateRequest: true},
		session: schoolsrepo.Session{
			ID:       "session-1",
			SchoolID: "school-1",
			CourseID: "course-1",
			Status:   "scheduled",
			StartsAt: time.Now().AddDate(0, 0, 7),
		},
		booking: schoolsrepo.Booking{ID: "booking-1", SchoolID: "school-1", CourseID: "course-1", Status: "approved"},
	})
}

func TestCreateSchoolRequiresVerifiedInstructor(t *testing.T) {
	for _, status := range []string{"", "draft", "pending", "rejected", "suspended"} {
		t.Run(defaultString(status, "none"), func(t *testing.T) {
			repo := seededService().repo.(*fakeRepo)
			repo.instructorStatus = status
			svc := New(repo)
			_, err := svc.CreateSchool(context.Background(), "actor", schoolsrepo.CreateSchoolInput{Name: "School"})
			if err == nil {
				t.Fatal("expected school create to require verified instructor")
			}
			if !strings.Contains(err.Error(), "instructor_verification_required") {
				t.Fatalf("expected instructor gate error, got %v", err)
			}
		})
	}
}

func TestVerifiedInstructorCanCreateSchool(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.verifiedInstructor = true
	svc := New(repo)
	_, err := svc.CreateSchool(context.Background(), "actor", schoolsrepo.CreateSchoolInput{Name: "School"})
	if err != nil {
		t.Fatalf("expected verified instructor to create school: %v", err)
	}
}

func TestPlatformAdminCanCreateSchoolWithoutInstructorProfile(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.platformAdmin = true
	svc := New(repo)
	_, err := svc.CreateSchool(context.Background(), "actor", schoolsrepo.CreateSchoolInput{Name: "School"})
	if err != nil {
		t.Fatalf("expected platform admin bypass: %v", err)
	}
}

func TestOwnerCanPublishSchool(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.role = "owner"
	svc := New(repo)
	status := "published"

	_, err := svc.UpdateSchool(context.Background(), "school", "actor", schoolsrepo.UpdateSchoolInput{Status: &status})
	if err != nil {
		t.Fatalf("expected owner to update school status: %v", err)
	}
	if repo.capturedSchool.Status == nil || *repo.capturedSchool.Status != "published" {
		t.Fatalf("expected published status update, got %#v", repo.capturedSchool.Status)
	}
}

func TestUpdateCourseRejectsInvalidStatusTransition(t *testing.T) {
	svc := seededService()
	_, err := svc.UpdateCourse(context.Background(), "school", "actor", "course-1", schoolsrepo.UpdateCourseInput{
		Title: "Course", CourseType: "custom", Currency: "PHP", Status: "draft",
	})
	if err == nil {
		t.Fatal("expected invalid transition error")
	}
}

func TestScheduleBookingRequiresAssignedSession(t *testing.T) {
	svc := seededService()
	_, err := svc.SetBookingStatus(context.Background(), "school", "actor", "booking-1", "scheduled")
	if err == nil {
		t.Fatal("expected scheduling without session to fail")
	}
}

func TestCreateSessionRejectsInvalidTimeRange(t *testing.T) {
	svc := seededService()
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	_, err := svc.CreateSession(context.Background(), "school", "actor", schoolsrepo.CreateSessionInput{
		CourseID: "course-1",
		Title:    "Bad range",
		StartsAt: start,
		EndsAt:   start.Add(-time.Hour),
		Timezone: "Asia/Manila",
		Status:   "draft",
	})
	if err == nil {
		t.Fatal("expected invalid time range to fail")
	}
}

func TestCreateSessionDefaultsToCourseLocation(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	_, err := svc.CreateSession(context.Background(), "school", "actor", schoolsrepo.CreateSessionInput{
		CourseID: "course-1",
		Title:    "Session",
		StartsAt: start,
		EndsAt:   start.Add(time.Hour),
		Status:   "draft",
	})
	if err != nil {
		t.Fatalf("expected session create to pass: %v", err)
	}
	if repo.capturedSession.LocationMode != "inherit_course" {
		t.Fatalf("expected inherit_course, got %q", repo.capturedSession.LocationMode)
	}
	if repo.capturedSession.Timezone != "Asia/Manila" {
		t.Fatalf("expected Asia/Manila timezone, got %q", repo.capturedSession.Timezone)
	}
}

func TestCreateSessionTextOnlyRequiresLocationLabel(t *testing.T) {
	svc := seededService()
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	_, err := svc.CreateSession(context.Background(), "school", "actor", schoolsrepo.CreateSessionInput{
		CourseID:     "course-1",
		Title:        "Session",
		StartsAt:     start,
		EndsAt:       start.Add(time.Hour),
		Timezone:     "Asia/Manila",
		Status:       "draft",
		LocationMode: "text_only",
	})
	if err == nil {
		t.Fatal("expected text-only session without location label to fail")
	}
}

func TestCreateSessionInheritedClearsOverrideFields(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	_, err := svc.CreateSession(context.Background(), "school", "actor", schoolsrepo.CreateSessionInput{
		CourseID:     "course-1",
		Title:        "Session",
		StartsAt:     start,
		EndsAt:       start.Add(time.Hour),
		Timezone:     "Asia/Manila",
		Status:       "draft",
		LocationMode: "inherit_school", LocationLabel: "Old pool", FormattedAddress: "Old address", RegionCode: "07",
	})
	if err != nil {
		t.Fatalf("expected session create to pass: %v", err)
	}
	if repo.capturedSession.LocationLabel != "" || repo.capturedSession.FormattedAddress != "" || repo.capturedSession.RegionCode != "" {
		t.Fatal("expected inherited session location to clear override fields")
	}
}

func TestInstructorCannotCreateCourse(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.role = "instructor"
	svc := New(repo)
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Course", CourseType: "custom", Status: "draft",
	})
	if err == nil {
		t.Fatal("expected instructor create course to be forbidden")
	}
}

func TestCreateCourseDefaultsToSchoolLocation(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Course", CourseType: "custom", Currency: "PHP", Status: "draft",
	})
	if err != nil {
		t.Fatalf("expected course create to pass: %v", err)
	}
	if repo.capturedCourse.LocationMode != "inherit_school" {
		t.Fatalf("expected inherit_school, got %q", repo.capturedCourse.LocationMode)
	}
	if repo.capturedCourse.Currency != "PHP" {
		t.Fatalf("expected PHP currency, got %q", repo.capturedCourse.Currency)
	}
}

func TestCreateCourseSavesBookingOptions(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title:                     "Weekend batch",
		CourseType:                "custom",
		Currency:                  "PHP",
		Status:                    "published",
		AllowSessionBooking:       true,
		AllowPreferredDateRequest: false,
	})
	if err != nil {
		t.Fatalf("expected course create to pass: %v", err)
	}
	if !repo.capturedCourse.AllowSessionBooking || repo.capturedCourse.AllowPreferredDateRequest {
		t.Fatalf("expected session-only booking options, got %#v", repo.capturedCourse)
	}
}

func TestPublishedCourseRequiresBookingOption(t *testing.T) {
	svc := seededService()
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Closed course", CourseType: "custom", Currency: "PHP", Status: "published",
	})
	if err == nil {
		t.Fatal("expected published course without booking options to fail")
	}
}

func TestCreateCourseTextOnlyRequiresLocationLabel(t *testing.T) {
	svc := seededService()
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Course", CourseType: "custom", Currency: "PHP", Status: "draft", LocationMode: "text_only",
	})
	if err == nil {
		t.Fatal("expected text-only course without location label to fail")
	}
}

func TestCreateCourseInheritedClearsOverrideFields(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Course", CourseType: "custom", Currency: "PHP", Status: "draft",
		LocationMode: "inherit_school", LocationLabel: "Old pool", FormattedAddress: "Old address", RegionCode: "07",
	})
	if err != nil {
		t.Fatalf("expected course create to pass: %v", err)
	}
	if repo.capturedCourse.LocationLabel != "" || repo.capturedCourse.FormattedAddress != "" || repo.capturedCourse.RegionCode != "" {
		t.Fatal("expected inherited course location to clear override fields")
	}
}

func TestInstructorCannotListPaymentMethods(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.role = "instructor"
	svc := New(repo)
	_, err := svc.ListPaymentMethods(context.Background(), "school", "actor", "")
	if err == nil {
		t.Fatal("expected instructor list payment methods to be forbidden")
	}
}

func TestCreatePaymentMethodValidatesActiveManualQR(t *testing.T) {
	svc := seededService()
	_, err := svc.CreatePaymentMethod(context.Background(), "school", "actor", "", schoolsrepo.CreatePaymentMethodInput{
		Type:     "manual_qr",
		IsActive: true,
	})
	if err == nil {
		t.Fatal("expected manual QR without media to fail")
	}
}

func TestCreatePaymentMethodValidatesActiveBankTransfer(t *testing.T) {
	svc := seededService()
	_, err := svc.CreatePaymentMethod(context.Background(), "school", "actor", "", schoolsrepo.CreatePaymentMethodInput{
		Type:     "bank_transfer",
		BankName: "BPI",
		IsActive: true,
	})
	if err == nil {
		t.Fatal("expected incomplete bank transfer to fail")
	}
}

func TestCreatePaymentMethodRejectsWhitespaceBankTransfer(t *testing.T) {
	svc := seededService()
	_, err := svc.CreatePaymentMethod(context.Background(), "school", "actor", "", schoolsrepo.CreatePaymentMethodInput{
		Type:          "bank_transfer",
		BankName:      " ",
		AccountName:   "\t",
		AccountNumber: " ",
		IsActive:      true,
	})
	if err == nil {
		t.Fatal("expected whitespace-only bank transfer to fail")
	}
}

func TestLegacyCoursePaymentMethodRouteReadsSchoolMethods(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	_, err := svc.ListPaymentMethods(context.Background(), "school", "actor", repo.course.ID)
	if err != nil {
		t.Fatalf("expected legacy course payment route shim to pass: %v", err)
	}
	if repo.listPaymentsSchoolID != repo.school.ID {
		t.Fatalf("expected payment methods to resolve by school id, got %q", repo.listPaymentsSchoolID)
	}
}

func TestCreateStudentBookingRejectsPastPreferredDate(t *testing.T) {
	svc := seededService()
	_, err := svc.CreateStudentBooking(context.Background(), "school", "course", "student-1", schoolsrepo.CreateBookingInput{
		PreferredDate: time.Now().AddDate(0, 0, -1),
	})
	if err == nil {
		t.Fatal("expected past preferred date to fail")
	}
}

func TestCreateStudentBookingCreatesPendingReviewForActor(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	svc := New(repo)
	booking, err := svc.CreateStudentBooking(context.Background(), "school", "course", "student-1", schoolsrepo.CreateBookingInput{
		PreferredDate: time.Now().AddDate(0, 0, 7),
	})
	if err != nil {
		t.Fatalf("expected booking to pass: %v", err)
	}
	if booking.ID == "" {
		t.Fatal("expected booking")
	}
}

func TestCreateStudentPaidBookingRejectsIncompleteActiveSchoolMethod(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.course.PaymentRequired = true
	repo.paymentMethods = []schoolsrepo.PaymentMethod{{
		ID:       "method-1",
		SchoolID: repo.school.ID,
		Type:     "manual_qr",
		Name:     "Manual QR",
		IsActive: true,
	}}
	svc := New(repo)
	_, err := svc.CreateStudentBooking(context.Background(), "school", "course", "student-1", schoolsrepo.CreateBookingInput{
		PreferredDate: time.Now().AddDate(0, 0, 7),
	})
	if err == nil {
		t.Fatal("expected paid booking with incomplete active school method to fail")
	}
}

func TestPublicSchoolOnlyReturnsUsablePaymentMethods(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.paymentMethods = []schoolsrepo.PaymentMethod{
		{ID: "inactive", SchoolID: repo.school.ID, Type: "bank_transfer", Name: "Inactive", IsActive: false},
		{ID: "broken", SchoolID: repo.school.ID, Type: "manual_qr", Name: "Broken QR", IsActive: true},
		{ID: "ready", SchoolID: repo.school.ID, Type: "manual_qr", Name: "Manual QR", QRMediaID: "media-1", IsActive: true},
	}
	svc := New(repo)
	school, err := svc.GetPublicSchool(context.Background(), "school")
	if err != nil {
		t.Fatalf("expected public school to load: %v", err)
	}
	if len(school.PaymentMethods) != 1 || school.PaymentMethods[0].ID != "ready" {
		t.Fatalf("expected only usable payment methods, got %#v", school.PaymentMethods)
	}
}

func TestCreateStudentSessionBookingStoresSessionMode(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.course.AllowSessionBooking = true
	repo.course.AllowPreferredDateRequest = false
	svc := New(repo)
	_, err := svc.CreateStudentBooking(context.Background(), "school", "course", "student-1", schoolsrepo.CreateBookingInput{
		BookingMode: "session",
		SessionID:   "session-1",
	})
	if err != nil {
		t.Fatalf("expected session booking to pass: %v", err)
	}
	if repo.capturedBooking.BookingMode != "session" || repo.capturedBooking.SessionID != "session-1" {
		t.Fatalf("expected captured session booking, got %#v", repo.capturedBooking)
	}
	if !repo.capturedBooking.PreferredDate.IsZero() {
		t.Fatalf("expected session booking to clear preferred date, got %v", repo.capturedBooking.PreferredDate)
	}
}

func TestCreateStudentSessionBookingRejectsFullSession(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	capacity := 1
	repo.course.AllowSessionBooking = true
	repo.session.Capacity = &capacity
	repo.session.AssignedBookingCount = 1
	svc := New(repo)
	_, err := svc.CreateStudentBooking(context.Background(), "school", "course", "student-1", schoolsrepo.CreateBookingInput{
		BookingMode: "session",
		SessionID:   "session-1",
	})
	if err == nil {
		t.Fatal("expected full session booking to fail")
	}
}

func TestCancelMyBookingRejectsCompletedBooking(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.booking.Status = "completed"
	svc := New(repo)
	_, err := svc.CancelMyBooking(context.Background(), "student-1", "booking-1")
	if err == nil {
		t.Fatal("expected completed booking cancellation to fail")
	}
}

func TestSubmitMyBookingPaymentStoresReceiptPayload(t *testing.T) {
	repo := &fakeRepo{
		booking: schoolsrepo.Booking{
			ID:       "11111111-1111-4111-8111-111111111111",
			SchoolID: "22222222-2222-4222-8222-222222222222",
			CourseID: "33333333-3333-4333-8333-333333333333",
			Status:   "approved",
		},
	}
	svc := New(repo)
	item, err := svc.SubmitMyBookingPayment(context.Background(), "44444444-4444-4444-8444-444444444444", repo.booking.ID, schoolsrepo.SubmitBookingPaymentInput{
		PaymentMethodID: "55555555-5555-4555-8555-555555555555",
		ProofMediaID:    "66666666-6666-4666-8666-666666666666",
		ReferenceNumber: " ref-123 ",
	})
	if err != nil {
		t.Fatalf("expected receipt upload to pass: %v", err)
	}
	if item.Payment == nil || item.Payment.Status != "submitted" {
		t.Fatalf("expected submitted payment, got %#v", item.Payment)
	}
	if repo.capturedPayment.ReferenceNumber != "ref-123" {
		t.Fatalf("expected trimmed reference number, got %#v", repo.capturedPayment)
	}
}

func TestSubmitMyBookingPaymentRequiresProof(t *testing.T) {
	svc := New(&fakeRepo{})
	_, err := svc.SubmitMyBookingPayment(context.Background(), "44444444-4444-4444-8444-444444444444", "11111111-1111-4111-8111-111111111111", schoolsrepo.SubmitBookingPaymentInput{})
	if err == nil {
		t.Fatal("expected missing proof media id to fail")
	}
}

func TestMeaningfulSessionChangesIgnoresNotesOnlyEdit(t *testing.T) {
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	current := schoolsrepo.Session{
		StartsAt:         start,
		EndsAt:           start.Add(time.Hour),
		LocationMode:     "inherit_course",
		Status:           "scheduled",
		InstructorUserID: "instructor-1",
	}
	input := schoolsrepo.UpdateSessionInput{
		StartsAt:         current.StartsAt,
		EndsAt:           current.EndsAt,
		LocationMode:     current.LocationMode,
		Status:           current.Status,
		InstructorUserID: current.InstructorUserID,
		NotesMarkdown:    "Typo fix",
	}
	if changes := meaningfulSessionChanges(current, input); len(changes) != 0 {
		t.Fatalf("expected notes-only edit to be non-meaningful, got %#v", changes)
	}
}

func TestMeaningfulSessionChangesIncludesOperationalFields(t *testing.T) {
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	currentCapacity := 4
	newCapacity := 3
	current := schoolsrepo.Session{
		StartsAt:             start,
		EndsAt:               start.Add(time.Hour),
		LocationMode:         "inherit_course",
		Status:               "scheduled",
		InstructorUserID:     "instructor-1",
		Capacity:             &currentCapacity,
		AssignedBookingCount: 1,
	}
	input := schoolsrepo.UpdateSessionInput{
		StartsAt:         current.StartsAt.Add(time.Hour),
		EndsAt:           current.EndsAt.Add(time.Hour),
		LocationMode:     "text_only",
		LocationLabel:    "Pool B",
		Status:           "cancelled",
		InstructorUserID: "instructor-2",
		Capacity:         &newCapacity,
	}
	changes := meaningfulSessionChanges(current, input)
	for _, want := range []string{"starts_at", "ends_at", "location", "instructor", "status", "capacity"} {
		if !containsString(changes, want) {
			t.Fatalf("expected changes %#v to include %s", changes, want)
		}
	}
}

func containsString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
