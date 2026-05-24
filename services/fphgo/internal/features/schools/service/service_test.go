package service

import (
	"context"
	"testing"
	"time"

	schoolsrepo "fphgo/internal/features/schools/repo"
)

type fakeRepo struct {
	school  schoolsrepo.School
	role    string
	course  schoolsrepo.Course
	session schoolsrepo.Session
	booking schoolsrepo.Booking
}

func (f *fakeRepo) ListSchools(context.Context, string) ([]schoolsrepo.School, error) {
	return []schoolsrepo.School{f.school}, nil
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
func (f *fakeRepo) UpdateSchool(context.Context, string, schoolsrepo.UpdateSchoolInput) (schoolsrepo.School, error) {
	return f.school, nil
}
func (f *fakeRepo) DeleteSchool(context.Context, string) error { return nil }
func (f *fakeRepo) ListCourses(context.Context, string) ([]schoolsrepo.Course, error) {
	return []schoolsrepo.Course{f.course}, nil
}
func (f *fakeRepo) CreateCourse(context.Context, string, schoolsrepo.CreateCourseInput) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) GetCourse(context.Context, string, string) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) UpdateCourse(context.Context, string, string, schoolsrepo.UpdateCourseInput) (schoolsrepo.Course, error) {
	return f.course, nil
}
func (f *fakeRepo) DeleteCourse(context.Context, string, string) error { return nil }
func (f *fakeRepo) ListPaymentMethods(context.Context, string) ([]schoolsrepo.PaymentMethod, error) {
	return nil, nil
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
func (f *fakeRepo) CreateSession(context.Context, string, schoolsrepo.CreateSessionInput) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) GetSession(context.Context, string, string) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) UpdateSession(context.Context, string, string, schoolsrepo.UpdateSessionInput) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) SetSessionStatus(context.Context, string, string, string) (schoolsrepo.Session, error) {
	return f.session, nil
}
func (f *fakeRepo) DeleteSession(context.Context, string, string) error { return nil }
func (f *fakeRepo) ListSessionBookings(context.Context, string, string) ([]schoolsrepo.Booking, error) {
	return []schoolsrepo.Booking{f.booking}, nil
}
func (f *fakeRepo) ListBookings(context.Context, string, schoolsrepo.ListBookingsInput) ([]schoolsrepo.Booking, error) {
	return []schoolsrepo.Booking{f.booking}, nil
}
func (f *fakeRepo) CreateBooking(context.Context, string, schoolsrepo.CreateBookingInput) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) GetBooking(context.Context, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) UpdateBooking(context.Context, string, string, schoolsrepo.UpdateBookingInput) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) SetBookingStatus(context.Context, string, string, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) AssignBookingSession(context.Context, string, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) UnassignBookingSession(context.Context, string, string) (schoolsrepo.Booking, error) {
	return f.booking, nil
}
func (f *fakeRepo) ReviewBookingPayment(context.Context, string, string, string, string, string) (schoolsrepo.BookingPayment, error) {
	return schoolsrepo.BookingPayment{}, nil
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
		course: schoolsrepo.Course{ID: "course-1", SchoolID: "school-1", Status: "published", CourseType: "custom", Title: "Course", Currency: "PHP"},
		session: schoolsrepo.Session{
			ID:       "session-1",
			SchoolID: "school-1",
			CourseID: "course-1",
			Status:   "scheduled",
		},
		booking: schoolsrepo.Booking{ID: "booking-1", SchoolID: "school-1", CourseID: "course-1", Status: "approved"},
	})
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

func TestInstructorCannotCreateCourse(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.role = "instructor"
	svc := New(repo)
	_, err := svc.CreateCourse(context.Background(), "school", "actor", schoolsrepo.CreateCourseInput{
		Title: "Course", CourseType: "custom", Currency: "PHP", Status: "draft",
	})
	if err == nil {
		t.Fatal("expected instructor create course to be forbidden")
	}
}

func TestInstructorCannotListPaymentMethods(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.role = "instructor"
	svc := New(repo)
	_, err := svc.ListPaymentMethods(context.Background(), "school", "actor", "course-1")
	if err == nil {
		t.Fatal("expected instructor list payment methods to be forbidden")
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

func TestCancelMyBookingRejectsCompletedBooking(t *testing.T) {
	repo := seededService().repo.(*fakeRepo)
	repo.booking.Status = "completed"
	svc := New(repo)
	_, err := svc.CancelMyBooking(context.Background(), "student-1", "booking-1")
	if err == nil {
		t.Fatal("expected completed booking cancellation to fail")
	}
}
