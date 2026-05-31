package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	schoolsrepo "fphgo/internal/features/schools/repo"
	schoolsservice "fphgo/internal/features/schools/service"
	"fphgo/internal/middleware"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *schoolsservice.Service
	validator httpx.Validator
}

func New(service *schoolsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

func Routes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequireMember)
	r.Get("/schools", h.ListSchools)
	r.Post("/schools", h.CreateSchool)
	r.Get("/schools/{slug}", h.GetSchool)
	r.Patch("/schools/{slug}", h.UpdateSchool)
	r.Delete("/schools/{slug}", h.DeleteSchool)
	r.Get("/schools/{slug}/payment-methods", h.ListPaymentMethods)
	r.Post("/schools/{slug}/payment-methods", h.CreatePaymentMethod)
	r.Patch("/schools/{slug}/payment-methods/{paymentMethodId}", h.UpdatePaymentMethod)
	r.Delete("/schools/{slug}/payment-methods/{paymentMethodId}", h.DeletePaymentMethod)
	r.Get("/schools/{slug}/members", h.ListMembers)
	r.Post("/schools/{slug}/members", h.CreateMember)
	r.Patch("/schools/{slug}/members/{memberId}", h.UpdateMember)
	r.Delete("/schools/{slug}/members/{memberId}", h.DeleteMember)
	r.Get("/schools/{slug}/courses", h.ListCourses)
	r.Post("/schools/{slug}/courses", h.CreateCourse)
	r.Get("/schools/{slug}/courses/{courseIdOrSlug}", h.GetCourse)
	r.Patch("/schools/{slug}/courses/{courseIdOrSlug}", h.UpdateCourse)
	r.Delete("/schools/{slug}/courses/{courseIdOrSlug}", h.DeleteCourse)
	r.Get("/schools/{slug}/courses/{courseIdOrSlug}/payment-methods", h.ListPaymentMethods)
	r.Post("/schools/{slug}/courses/{courseIdOrSlug}/payment-methods", h.CreatePaymentMethod)
	r.Patch("/schools/{slug}/courses/{courseIdOrSlug}/payment-methods/{paymentMethodId}", h.UpdatePaymentMethod)
	r.Delete("/schools/{slug}/courses/{courseIdOrSlug}/payment-methods/{paymentMethodId}", h.DeletePaymentMethod)
	r.Get("/schools/{slug}/sessions", h.ListSessions)
	r.Post("/schools/{slug}/sessions", h.CreateSession)
	r.Get("/schools/{slug}/sessions/{sessionIdOrSlug}", h.GetSession)
	r.Post("/schools/{slug}/sessions/{sessionIdOrSlug}/duplicate", h.DuplicateSession)
	r.Patch("/schools/{slug}/sessions/{sessionIdOrSlug}", h.UpdateSession)
	r.Delete("/schools/{slug}/sessions/{sessionIdOrSlug}", h.DeleteSession)
	r.Patch("/schools/{slug}/sessions/{sessionIdOrSlug}/complete", h.CompleteSession)
	r.Patch("/schools/{slug}/sessions/{sessionIdOrSlug}/cancel", h.CancelSession)
	r.Get("/schools/{slug}/sessions/{sessionIdOrSlug}/bookings", h.ListSessionBookings)
	r.Get("/schools/{slug}/bookings", h.ListBookings)
	r.Post("/schools/{slug}/bookings", h.CreateBooking)
	r.Get("/schools/{slug}/bookings/{bookingId}", h.GetBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}", h.UpdateBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/approve", h.ApproveBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/reject", h.RejectBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/schedule", h.ScheduleBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/complete", h.CompleteBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/cancel", h.CancelBooking)
	r.Patch("/schools/{slug}/bookings/{bookingId}/assign-session", h.AssignBookingSession)
	r.Patch("/schools/{slug}/bookings/{bookingId}/unassign-session", h.UnassignBookingSession)
	r.Patch("/schools/{slug}/bookings/{bookingId}/payment/verify", h.VerifyBookingPayment)
	r.Patch("/schools/{slug}/bookings/{bookingId}/payment/reject", h.RejectBookingPayment)
	r.Get("/schools/{slug}/bookings/{bookingId}/payment/proof-url", h.GetBookingPaymentProofURL)
	return r
}

func PublicRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListPublicSchools)
	r.Get("/{slug}", h.GetPublicSchool)
	r.Get("/{slug}/courses", h.ListPublicCourses)
	r.Get("/{slug}/courses/{courseSlug}", h.GetPublicCourse)
	r.Get("/{slug}/courses/{courseSlug}/sessions", h.ListPublicCourseSessions)
	r.Group(func(protected chi.Router) {
		protected.Use(middleware.RequireMember)
		protected.Post("/{slug}/courses/{courseSlug}/bookings", h.CreatePublicBooking)
	})
	return r
}

func MeRoutes(h *Handlers) chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListMyBookings)
	r.Get("/{bookingId}", h.GetMyBooking)
	r.Patch("/{bookingId}/cancel", h.CancelMyBooking)
	r.Patch("/{bookingId}/payment", h.SubmitMyBookingPayment)
	r.Post("/{bookingId}/payment-proof", h.SubmitMyBookingPayment)
	return r
}

type CreateSchoolRequest struct {
	Name                string `json:"name" validate:"required"`
	ShortDescription    string `json:"shortDescription"`
	DescriptionMarkdown string `json:"descriptionMarkdown"`
	BaseLocation        string `json:"baseLocation"`
	BaseLocationLabel   string `json:"baseLocationLabel"`
	FormattedAddress    string `json:"formattedAddress"`
	RegionCode          string `json:"regionCode"`
	RegionName          string `json:"regionName"`
	ProvinceCode        string `json:"provinceCode"`
	ProvinceName        string `json:"provinceName"`
	CityCode            string `json:"cityCode"`
	CityName            string `json:"cityName"`
	BarangayCode        string `json:"barangayCode"`
	BarangayName        string `json:"barangayName"`
	LocationSource      string `json:"locationSource"`
	DiveSiteID          string `json:"diveSiteId"`
	ContactEmail        string `json:"contactEmail"`
	ContactPhone        string `json:"contactPhone"`
	WebsiteURL          string `json:"websiteUrl"`
	FacebookURL         string `json:"facebookUrl"`
	InstagramURL        string `json:"instagramUrl"`
	Status              string `json:"status"`
}

type UpdateSchoolRequest struct {
	Name                *string              `json:"name"`
	ShortDescription    *string              `json:"shortDescription"`
	DescriptionMarkdown *string              `json:"descriptionMarkdown"`
	LogoMediaID         httpx.NullableString `json:"logoMediaId"`
	CoverMediaID        httpx.NullableString `json:"coverMediaId"`
	BaseLocation        *string              `json:"baseLocation"`
	BaseLocationLabel   *string              `json:"baseLocationLabel"`
	FormattedAddress    *string              `json:"formattedAddress"`
	RegionCode          *string              `json:"regionCode"`
	RegionName          *string              `json:"regionName"`
	ProvinceCode        *string              `json:"provinceCode"`
	ProvinceName        *string              `json:"provinceName"`
	CityCode            *string              `json:"cityCode"`
	CityName            *string              `json:"cityName"`
	BarangayCode        *string              `json:"barangayCode"`
	BarangayName        *string              `json:"barangayName"`
	LocationSource      *string              `json:"locationSource"`
	DiveSiteID          *string              `json:"diveSiteId"`
	ContactEmail        *string              `json:"contactEmail"`
	ContactPhone        *string              `json:"contactPhone"`
	WebsiteURL          *string              `json:"websiteUrl"`
	FacebookURL         *string              `json:"facebookUrl"`
	InstagramURL        *string              `json:"instagramUrl"`
	Status              *string              `json:"status"`
}

type CourseRequest struct {
	Title                      string   `json:"title"`
	ShortDescription           string   `json:"shortDescription"`
	DescriptionMarkdown        string   `json:"descriptionMarkdown"`
	CourseType                 string   `json:"courseType"`
	Level                      string   `json:"level"`
	DurationLabel              string   `json:"durationLabel"`
	PriceAmount                *float64 `json:"priceAmount"`
	Currency                   string   `json:"currency"`
	PaymentRequired            bool     `json:"paymentRequired"`
	ApprovalRequired           bool     `json:"approvalRequired"`
	AllowSessionBooking        *bool    `json:"allowSessionBooking"`
	AllowPreferredDateRequest  *bool    `json:"allowPreferredDateRequest"`
	LocationMode               string   `json:"locationMode"`
	LocationLabel              string   `json:"locationLabel"`
	LocationNote               string   `json:"locationNote"`
	FormattedAddress           string   `json:"formattedAddress"`
	RegionCode                 string   `json:"regionCode"`
	RegionName                 string   `json:"regionName"`
	ProvinceCode               string   `json:"provinceCode"`
	ProvinceName               string   `json:"provinceName"`
	CityCode                   string   `json:"cityCode"`
	CityName                   string   `json:"cityName"`
	BarangayCode               string   `json:"barangayCode"`
	BarangayName               string   `json:"barangayName"`
	LocationSource             string   `json:"locationSource"`
	DiveSiteID                 string   `json:"diveSiteId"`
	IncludedMarkdown           string   `json:"includedMarkdown"`
	PrerequisitesMarkdown      string   `json:"prerequisitesMarkdown"`
	EquipmentMarkdown          string   `json:"equipmentMarkdown"`
	CancellationPolicyMarkdown string   `json:"cancellationPolicyMarkdown"`
	AvailabilityNote           string   `json:"availabilityNote"`
	Status                     string   `json:"status"`
}

type PaymentMethodRequest struct {
	Type          string `json:"type"`
	Name          string `json:"name"`
	Instructions  string `json:"instructions"`
	QRMediaID     string `json:"qrMediaId"`
	QRImageURL    string `json:"qrImageUrl"`
	BankName      string `json:"bankName"`
	AccountName   string `json:"accountName"`
	AccountNumber string `json:"accountNumber"`
	IsActive      *bool  `json:"isActive"`
}

type MemberRequest struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

type SessionRequest struct {
	CourseID         string `json:"courseId"`
	Title            string `json:"title"`
	StartsAt         string `json:"startsAt"`
	EndsAt           string `json:"endsAt"`
	Timezone         string `json:"timezone"`
	LocationMode     string `json:"locationMode"`
	LocationLabel    string `json:"locationLabel"`
	LocationNote     string `json:"locationNote"`
	FormattedAddress string `json:"formattedAddress"`
	RegionCode       string `json:"regionCode"`
	RegionName       string `json:"regionName"`
	ProvinceCode     string `json:"provinceCode"`
	ProvinceName     string `json:"provinceName"`
	CityCode         string `json:"cityCode"`
	CityName         string `json:"cityName"`
	BarangayCode     string `json:"barangayCode"`
	BarangayName     string `json:"barangayName"`
	LocationSource   string `json:"locationSource"`
	DiveSiteID       string `json:"diveSiteId"`
	InstructorUserID string `json:"instructorUserId"`
	Capacity         *int   `json:"capacity"`
	Status           string `json:"status"`
	NotesMarkdown    string `json:"notesMarkdown"`
}

type BookingRequest struct {
	CourseID           string `json:"courseId"`
	SessionID          string `json:"sessionId"`
	StudentUserID      string `json:"studentUserId"`
	StudentName        string `json:"studentName"`
	StudentEmail       string `json:"studentEmail"`
	StudentPhone       string `json:"studentPhone"`
	BookingMode        string `json:"bookingMode"`
	PreferredDate      string `json:"preferredDate"`
	AlternateDate      string `json:"alternateDate"`
	Status             string `json:"status"`
	StudentNote        string `json:"studentNote"`
	ExperienceLevel    string `json:"experienceLevel"`
	CertificationLevel string `json:"certificationLevel"`
	EquipmentNeeds     string `json:"equipmentNeeds"`
	AdminNotes         string `json:"adminNotes"`
}

type PublicBookingRequest struct {
	BookingMode        string `json:"bookingMode"`
	SessionID          string `json:"sessionId"`
	StudentName        string `json:"studentName"`
	StudentEmail       string `json:"studentEmail"`
	StudentPhone       string `json:"studentPhone"`
	PreferredDate      string `json:"preferredDate"`
	AlternateDate      string `json:"alternateDate"`
	StudentNote        string `json:"studentNote"`
	ExperienceLevel    string `json:"experienceLevel"`
	CertificationLevel string `json:"certificationLevel"`
	EquipmentNeeds     string `json:"equipmentNeeds"`
}

type AssignSessionRequest struct {
	SessionID string `json:"sessionId"`
}

type ReviewPaymentRequest struct {
	ReviewNotes string `json:"reviewNotes"`
}

type SubmitBookingPaymentRequest struct {
	PaymentMethodID string `json:"paymentMethodId" validate:"omitempty,uuid4"`
	ProofMediaID    string `json:"proofMediaId" validate:"required,uuid4"`
	ReferenceNumber string `json:"referenceNumber" validate:"omitempty,max=160"`
}

func (h *Handlers) ListSchools(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListSchools(r.Context(), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"schools": mapSchools(items)})
}

func (h *Handlers) CreateSchool(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[CreateSchoolRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.CreateSchool(r.Context(), actorID(r), schoolsrepo.CreateSchoolInput{Name: req.Name, ShortDescription: req.ShortDescription, DescriptionMarkdown: req.DescriptionMarkdown, BaseLocation: req.BaseLocation, BaseLocationLabel: req.BaseLocationLabel, FormattedAddress: req.FormattedAddress, RegionCode: req.RegionCode, RegionName: req.RegionName, ProvinceCode: req.ProvinceCode, ProvinceName: req.ProvinceName, CityCode: req.CityCode, CityName: req.CityName, BarangayCode: req.BarangayCode, BarangayName: req.BarangayName, LocationSource: req.LocationSource, DiveSiteID: req.DiveSiteID, ContactEmail: req.ContactEmail, ContactPhone: req.ContactPhone, WebsiteURL: req.WebsiteURL, FacebookURL: req.FacebookURL, InstagramURL: req.InstagramURL, Status: req.Status})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"school": mapSchool(item)})
}

func (h *Handlers) GetSchool(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetSchool(r.Context(), chi.URLParam(r, "slug"), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapSchool(item)})
}

func (h *Handlers) UpdateSchool(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[UpdateSchoolRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdateSchool(r.Context(), chi.URLParam(r, "slug"), actorID(r), schoolsrepo.UpdateSchoolInput{Name: req.Name, ShortDescription: req.ShortDescription, DescriptionMarkdown: req.DescriptionMarkdown, LogoMediaID: req.LogoMediaID.PtrOrEmptyForNull(), CoverMediaID: req.CoverMediaID.PtrOrEmptyForNull(), BaseLocation: req.BaseLocation, BaseLocationLabel: req.BaseLocationLabel, FormattedAddress: req.FormattedAddress, RegionCode: req.RegionCode, RegionName: req.RegionName, ProvinceCode: req.ProvinceCode, ProvinceName: req.ProvinceName, CityCode: req.CityCode, CityName: req.CityName, BarangayCode: req.BarangayCode, BarangayName: req.BarangayName, LocationSource: req.LocationSource, DiveSiteID: req.DiveSiteID, ContactEmail: req.ContactEmail, ContactPhone: req.ContactPhone, WebsiteURL: req.WebsiteURL, FacebookURL: req.FacebookURL, InstagramURL: req.InstagramURL, Status: req.Status})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapSchool(item)})
}

func (h *Handlers) DeleteSchool(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteSchool(r.Context(), chi.URLParam(r, "slug"), actorID(r)); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListPublicSchools(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListPublicSchools(r.Context(), schoolsrepo.PublicSchoolFilters{Search: q(r, "search"), Location: q(r, "location"), CourseType: q(r, "courseType")})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"schools": mapPublicSchools(items)})
}

func (h *Handlers) GetPublicSchool(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetPublicSchool(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapPublicSchool(item)})
}

func (h *Handlers) ListPublicCourses(w http.ResponseWriter, r *http.Request) {
	school, items, err := h.service.ListPublicCourses(r.Context(), chi.URLParam(r, "slug"), schoolsrepo.PublicCourseFilters{Search: q(r, "search"), CourseType: q(r, "courseType"), Level: q(r, "level"), Payment: q(r, "payment")})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapPublicSchool(school), "courses": mapPublicCourses(items)})
}

func (h *Handlers) GetPublicCourse(w http.ResponseWriter, r *http.Request) {
	school, item, err := h.service.GetPublicCourse(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "courseSlug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapPublicSchool(school), "course": mapPublicCourse(item)})
}

func (h *Handlers) ListPublicCourseSessions(w http.ResponseWriter, r *http.Request) {
	school, course, items, err := h.service.ListPublicCourseSessions(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "courseSlug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"school": mapPublicSchool(school), "course": mapPublicCourse(course), "sessions": mapPublicSessions(items)})
}

func (h *Handlers) CreatePublicBooking(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[PublicBookingRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input := schoolsrepo.CreateBookingInput{
		BookingMode:        req.BookingMode,
		SessionID:          req.SessionID,
		StudentName:        req.StudentName,
		StudentEmail:       req.StudentEmail,
		StudentPhone:       req.StudentPhone,
		PreferredDate:      parseDate(req.PreferredDate),
		AlternateDate:      parseDatePtr(req.AlternateDate),
		StudentNote:        req.StudentNote,
		ExperienceLevel:    req.ExperienceLevel,
		CertificationLevel: req.CertificationLevel,
		EquipmentNeeds:     req.EquipmentNeeds,
	}
	item, err := h.service.CreateStudentBooking(r.Context(), chi.URLParam(r, "slug"), chi.URLParam(r, "courseSlug"), actorID(r), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"booking": mapMyBooking(item)})
}

func (h *Handlers) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListMyBookings(r.Context(), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"bookings": mapMyBookings(items)})
}

func (h *Handlers) GetMyBooking(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetMyBooking(r.Context(), actorID(r), chi.URLParam(r, "bookingId"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapMyBooking(item)})
}

func (h *Handlers) CancelMyBooking(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.CancelMyBooking(r.Context(), actorID(r), chi.URLParam(r, "bookingId"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapMyBooking(item)})
}

func (h *Handlers) SubmitMyBookingPayment(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[SubmitBookingPaymentRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.SubmitMyBookingPayment(r.Context(), actorID(r), chi.URLParam(r, "bookingId"), schoolsrepo.SubmitBookingPaymentInput{
		PaymentMethodID: req.PaymentMethodID,
		ProofMediaID:    req.ProofMediaID,
		ReferenceNumber: req.ReferenceNumber,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapMyBooking(item)})
}

func (h *Handlers) ListCourses(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListCourses(r.Context(), chi.URLParam(r, "slug"), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"courses": mapCourses(items)})
}
func (h *Handlers) CreateCourse(w http.ResponseWriter, r *http.Request) { h.writeCourse(w, r, true) }
func (h *Handlers) UpdateCourse(w http.ResponseWriter, r *http.Request) { h.writeCourse(w, r, false) }
func (h *Handlers) writeCourse(w http.ResponseWriter, r *http.Request, create bool) {
	req, issues, ok := httpx.DecodeAndValidate[CourseRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	allowSession := false
	if req.AllowSessionBooking != nil {
		allowSession = *req.AllowSessionBooking
	}
	allowPreferred := true
	if req.AllowPreferredDateRequest != nil {
		allowPreferred = *req.AllowPreferredDateRequest
	}
	input := schoolsrepo.CreateCourseInput{Title: req.Title, ShortDescription: req.ShortDescription, DescriptionMarkdown: req.DescriptionMarkdown, CourseType: req.CourseType, Level: req.Level, DurationLabel: req.DurationLabel, PriceAmount: req.PriceAmount, Currency: req.Currency, PaymentRequired: req.PaymentRequired, ApprovalRequired: req.ApprovalRequired, AllowSessionBooking: allowSession, AllowPreferredDateRequest: allowPreferred, LocationMode: req.LocationMode, LocationLabel: req.LocationLabel, LocationNote: req.LocationNote, FormattedAddress: req.FormattedAddress, RegionCode: req.RegionCode, RegionName: req.RegionName, ProvinceCode: req.ProvinceCode, ProvinceName: req.ProvinceName, CityCode: req.CityCode, CityName: req.CityName, BarangayCode: req.BarangayCode, BarangayName: req.BarangayName, LocationSource: req.LocationSource, DiveSiteID: req.DiveSiteID, IncludedMarkdown: req.IncludedMarkdown, PrerequisitesMarkdown: req.PrerequisitesMarkdown, EquipmentMarkdown: req.EquipmentMarkdown, CancellationPolicyMarkdown: req.CancellationPolicyMarkdown, AvailabilityNote: req.AvailabilityNote, Status: req.Status}
	var item schoolsrepo.Course
	var err error
	if create {
		item, err = h.service.CreateCourse(r.Context(), chi.URLParam(r, "slug"), actorID(r), input)
	} else {
		item, err = h.service.UpdateCourse(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"), input)
	}
	if err != nil {
		handleError(w, r, err)
		return
	}
	status := http.StatusOK
	if create {
		status = http.StatusCreated
	}
	httpx.JSON(w, status, map[string]any{"course": mapCourse(item)})
}
func (h *Handlers) GetCourse(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.GetCourse(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"course": mapCourse(item)})
}
func (h *Handlers) DeleteCourse(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteCourse(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug")); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListPaymentMethods(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListPaymentMethods(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"paymentMethods": mapPaymentMethods(items)})
}
func (h *Handlers) CreatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	h.writePaymentMethod(w, r, true)
}
func (h *Handlers) UpdatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	h.writePaymentMethod(w, r, false)
}
func (h *Handlers) writePaymentMethod(w http.ResponseWriter, r *http.Request, create bool) {
	req, issues, ok := httpx.DecodeAndValidate[PaymentMethodRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	input := schoolsrepo.CreatePaymentMethodInput{Type: req.Type, Name: req.Name, Instructions: req.Instructions, QRMediaID: req.QRMediaID, BankName: req.BankName, AccountName: req.AccountName, AccountNumber: req.AccountNumber, IsActive: active}
	var item schoolsrepo.PaymentMethod
	var err error
	if create {
		item, err = h.service.CreatePaymentMethod(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"), input)
	} else {
		item, err = h.service.UpdatePaymentMethod(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"), chi.URLParam(r, "paymentMethodId"), input)
	}
	if err != nil {
		handleError(w, r, err)
		return
	}
	status := http.StatusOK
	if create {
		status = http.StatusCreated
	}
	httpx.JSON(w, status, map[string]any{"paymentMethod": mapPaymentMethod(item)})
}
func (h *Handlers) DeletePaymentMethod(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeletePaymentMethod(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "courseIdOrSlug"), chi.URLParam(r, "paymentMethodId")); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListMembers(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListMembers(r.Context(), chi.URLParam(r, "slug"), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"members": mapMembers(items)})
}

func (h *Handlers) CreateMember(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[MemberRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.CreateMember(r.Context(), chi.URLParam(r, "slug"), actorID(r), schoolsrepo.CreateMemberInput{
		UserID: req.UserID,
		Role:   req.Role,
		Status: req.Status,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"member": mapMember(item)})
}

func (h *Handlers) UpdateMember(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[MemberRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.UpdateMember(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "memberId"), schoolsrepo.UpdateMemberInput{
		Role:   req.Role,
		Status: req.Status,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"member": mapMember(item)})
}

func (h *Handlers) DeleteMember(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteMember(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "memberId")); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListSessions(w http.ResponseWriter, r *http.Request) {
	input := schoolsrepo.ListSessionsInput{CourseID: q(r, "course"), Status: q(r, "status"), InstructorUserID: q(r, "instructor"), Search: q(r, "search"), DateFrom: parseDatePtr(q(r, "dateFrom")), DateTo: parseDatePtr(q(r, "dateTo"))}
	items, err := h.service.ListSessions(r.Context(), chi.URLParam(r, "slug"), actorID(r), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"sessions": mapSessions(items)})
}
func (h *Handlers) CreateSession(w http.ResponseWriter, r *http.Request) { h.writeSession(w, r, true) }
func (h *Handlers) UpdateSession(w http.ResponseWriter, r *http.Request) { h.writeSession(w, r, false) }
func (h *Handlers) writeSession(w http.ResponseWriter, r *http.Request, create bool) {
	req, issues, ok := httpx.DecodeAndValidate[SessionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseTime(req.StartsAt, "startsAt")
	if err != nil {
		handleError(w, r, err)
		return
	}
	endsAt, err := parseTime(req.EndsAt, "endsAt")
	if err != nil {
		handleError(w, r, err)
		return
	}
	input := schoolsrepo.CreateSessionInput{CourseID: req.CourseID, Title: req.Title, StartsAt: startsAt, EndsAt: endsAt, Timezone: req.Timezone, LocationMode: req.LocationMode, LocationLabel: req.LocationLabel, LocationNote: req.LocationNote, FormattedAddress: req.FormattedAddress, RegionCode: req.RegionCode, RegionName: req.RegionName, ProvinceCode: req.ProvinceCode, ProvinceName: req.ProvinceName, CityCode: req.CityCode, CityName: req.CityName, BarangayCode: req.BarangayCode, BarangayName: req.BarangayName, LocationSource: req.LocationSource, DiveSiteID: req.DiveSiteID, InstructorUserID: req.InstructorUserID, Capacity: req.Capacity, Status: req.Status, NotesMarkdown: req.NotesMarkdown}
	var item schoolsrepo.Session
	if create {
		item, err = h.service.CreateSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), input)
	} else {
		item, err = h.service.UpdateSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "sessionIdOrSlug"), input)
	}
	if err != nil {
		handleError(w, r, err)
		return
	}
	status := http.StatusOK
	if create {
		status = http.StatusCreated
	}
	httpx.JSON(w, status, map[string]any{"session": mapSession(item)})
}
func (h *Handlers) DuplicateSession(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[SessionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	startsAt, err := parseTime(req.StartsAt, "startsAt")
	if err != nil {
		handleError(w, r, err)
		return
	}
	endsAt, err := parseTime(req.EndsAt, "endsAt")
	if err != nil {
		handleError(w, r, err)
		return
	}
	input := schoolsrepo.CreateSessionInput{CourseID: req.CourseID, Title: req.Title, StartsAt: startsAt, EndsAt: endsAt, Timezone: req.Timezone, LocationMode: req.LocationMode, LocationLabel: req.LocationLabel, LocationNote: req.LocationNote, FormattedAddress: req.FormattedAddress, RegionCode: req.RegionCode, RegionName: req.RegionName, ProvinceCode: req.ProvinceCode, ProvinceName: req.ProvinceName, CityCode: req.CityCode, CityName: req.CityName, BarangayCode: req.BarangayCode, BarangayName: req.BarangayName, LocationSource: req.LocationSource, DiveSiteID: req.DiveSiteID, InstructorUserID: req.InstructorUserID, Capacity: req.Capacity, Status: req.Status, NotesMarkdown: req.NotesMarkdown}
	item, err := h.service.DuplicateSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "sessionIdOrSlug"), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"session": mapSession(item)})
}
func (h *Handlers) GetSession(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListSessions(r.Context(), chi.URLParam(r, "slug"), actorID(r), schoolsrepo.ListSessionsInput{})
	if err != nil {
		handleError(w, r, err)
		return
	}
	for _, item := range items {
		if item.ID == chi.URLParam(r, "sessionIdOrSlug") || item.Slug == chi.URLParam(r, "sessionIdOrSlug") {
			httpx.JSON(w, http.StatusOK, map[string]any{"session": mapSession(item)})
			return
		}
	}
	handleError(w, r, apperrors.New(http.StatusNotFound, "session_not_found", "session not found", nil))
}
func (h *Handlers) DeleteSession(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "sessionIdOrSlug")); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h *Handlers) CompleteSession(w http.ResponseWriter, r *http.Request) {
	h.setSessionStatus(w, r, "completed")
}
func (h *Handlers) CancelSession(w http.ResponseWriter, r *http.Request) {
	h.setSessionStatus(w, r, "cancelled")
}
func (h *Handlers) setSessionStatus(w http.ResponseWriter, r *http.Request, status string) {
	item, err := h.service.SetSessionStatus(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "sessionIdOrSlug"), status)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"session": mapSession(item)})
}

func (h *Handlers) ListBookings(w http.ResponseWriter, r *http.Request) {
	input := schoolsrepo.ListBookingsInput{CourseID: q(r, "course"), SessionID: firstNonEmpty(q(r, "session"), q(r, "sessionId")), BookingMode: q(r, "bookingMode"), Status: q(r, "status"), PaymentStatus: q(r, "paymentStatus"), Search: q(r, "search"), PreferredDateFrom: parseDatePtr(q(r, "preferredDateFrom")), PreferredDateTo: parseDatePtr(q(r, "preferredDateTo"))}
	items, err := h.service.ListBookings(r.Context(), chi.URLParam(r, "slug"), actorID(r), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"bookings": mapBookings(items)})
}
func (h *Handlers) ListSessionBookings(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListSessionBookings(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "sessionIdOrSlug"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"bookings": mapBookings(items)})
}
func (h *Handlers) CreateBooking(w http.ResponseWriter, r *http.Request) { h.writeBooking(w, r, true) }
func (h *Handlers) UpdateBooking(w http.ResponseWriter, r *http.Request) { h.writeBooking(w, r, false) }
func (h *Handlers) writeBooking(w http.ResponseWriter, r *http.Request, create bool) {
	req, issues, ok := httpx.DecodeAndValidate[BookingRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	preferred := parseDate(req.PreferredDate)
	alternate := parseDatePtr(req.AlternateDate)
	input := schoolsrepo.CreateBookingInput{CourseID: req.CourseID, SessionID: req.SessionID, StudentUserID: req.StudentUserID, StudentName: req.StudentName, StudentEmail: req.StudentEmail, StudentPhone: req.StudentPhone, BookingMode: req.BookingMode, PreferredDate: preferred, AlternateDate: alternate, Status: req.Status, StudentNote: req.StudentNote, ExperienceLevel: req.ExperienceLevel, CertificationLevel: req.CertificationLevel, EquipmentNeeds: req.EquipmentNeeds, AdminNotes: req.AdminNotes}
	var item schoolsrepo.Booking
	var err error
	if create {
		item, err = h.service.CreateBooking(r.Context(), chi.URLParam(r, "slug"), actorID(r), input)
	} else {
		item, err = h.service.UpdateBooking(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"), input)
	}
	if err != nil {
		handleError(w, r, err)
		return
	}
	status := http.StatusOK
	if create {
		status = http.StatusCreated
	}
	httpx.JSON(w, status, map[string]any{"booking": mapBooking(item)})
}
func (h *Handlers) GetBooking(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListBookings(r.Context(), chi.URLParam(r, "slug"), actorID(r), schoolsrepo.ListBookingsInput{})
	if err != nil {
		handleError(w, r, err)
		return
	}
	for _, item := range items {
		if item.ID == chi.URLParam(r, "bookingId") {
			httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapBooking(item)})
			return
		}
	}
	handleError(w, r, apperrors.New(http.StatusNotFound, "booking_not_found", "booking not found", nil))
}
func (h *Handlers) ApproveBooking(w http.ResponseWriter, r *http.Request) {
	h.setBookingStatus(w, r, "approved")
}
func (h *Handlers) RejectBooking(w http.ResponseWriter, r *http.Request) {
	h.setBookingStatus(w, r, "rejected")
}
func (h *Handlers) ScheduleBooking(w http.ResponseWriter, r *http.Request) {
	h.setBookingStatus(w, r, "scheduled")
}
func (h *Handlers) CompleteBooking(w http.ResponseWriter, r *http.Request) {
	h.setBookingStatus(w, r, "completed")
}
func (h *Handlers) CancelBooking(w http.ResponseWriter, r *http.Request) {
	h.setBookingStatus(w, r, "cancelled")
}
func (h *Handlers) setBookingStatus(w http.ResponseWriter, r *http.Request, status string) {
	item, err := h.service.SetBookingStatus(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"), status)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapBooking(item)})
}
func (h *Handlers) AssignBookingSession(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[AssignSessionRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	item, err := h.service.AssignBookingSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"), req.SessionID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapBooking(item)})
}
func (h *Handlers) UnassignBookingSession(w http.ResponseWriter, r *http.Request) {
	item, err := h.service.UnassignBookingSession(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"booking": mapBooking(item)})
}
func (h *Handlers) VerifyBookingPayment(w http.ResponseWriter, r *http.Request) {
	h.reviewPayment(w, r, "verified")
}
func (h *Handlers) RejectBookingPayment(w http.ResponseWriter, r *http.Request) {
	h.reviewPayment(w, r, "rejected")
}
func (h *Handlers) reviewPayment(w http.ResponseWriter, r *http.Request, status string) {
	req, _, _ := httpx.DecodeAndValidate[ReviewPaymentRequest](r, h.validator)
	item, err := h.service.ReviewBookingPayment(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"), status, req.ReviewNotes)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payment": mapBookingPayment(item)})
}

func (h *Handlers) GetBookingPaymentProofURL(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.GetBookingPaymentProofURL(r.Context(), chi.URLParam(r, "slug"), actorID(r), chi.URLParam(r, "bookingId"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"url":              result.URL,
		"expiresAt":        result.ExpiresAt,
		"paymentId":        result.PaymentID,
		"bookingId":        result.BookingID,
		"proofMediaId":     result.ProofMediaID,
		"proofFileName":    result.ProofFileName,
		"proofContentType": result.ProofContentType,
	})
}

func actorID(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return ""
	}
	return identity.UserID
}
func q(r *http.Request, key string) string { return strings.TrimSpace(r.URL.Query().Get(key)) }
func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
func parseTime(value, field string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, schoolsservice.ValidationFailure{Issues: []validatex.Issue{{Path: []any{field}, Code: "invalid_datetime", Message: "Must be a valid RFC3339 datetime"}}}
	}
	return parsed.UTC(), nil
}
func parseDate(value string) time.Time {
	parsed, _ := time.Parse("2006-01-02", strings.TrimSpace(value))
	return parsed
}
func parseDatePtr(value string) *time.Time {
	parsed := parseDate(value)
	if parsed.IsZero() {
		return nil
	}
	return &parsed
}
func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr schoolsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}
