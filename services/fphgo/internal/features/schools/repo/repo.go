package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	notificationsrepo "fphgo/internal/features/notifications/repo"
	platformdb "fphgo/internal/platform/db"
	sharedslug "fphgo/internal/shared/slug"
)

var ErrSlugCollision = errors.New("slug collision")

type Repo struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

type School struct {
	ID                    string
	Slug                  string
	Name                  string
	ShortDescription      string
	DescriptionMarkdown   string
	LogoMediaID           string
	LogoURL               string
	CoverMediaID          string
	CoverURL              string
	BaseLocation          string
	BaseLocationLabel     string
	FormattedAddress      string
	RegionCode            string
	RegionName            string
	ProvinceCode          string
	ProvinceName          string
	CityCode              string
	CityName              string
	BarangayCode          string
	BarangayName          string
	LocationSource        string
	DiveSiteID            string
	DiveSiteName          string
	DiveSiteSlug          string
	DiveSiteArea          string
	ContactEmail          string
	ContactPhone          string
	WebsiteURL            string
	FacebookURL           string
	InstagramURL          string
	Status                string
	OwnerUserID           string
	CurrentUserRole       string
	CreatedAt             time.Time
	UpdatedAt             time.Time
	CourseCount           int
	PublishedCourseCount  int
	PendingBookingCount   int
	UpcomingSessionCount  int
	PaymentsToReviewCount int
	PaymentMethods        []PaymentMethod
}

type Course struct {
	ID                         string
	SchoolID                   string
	Slug                       string
	Title                      string
	ShortDescription           string
	DescriptionMarkdown        string
	CourseType                 string
	Level                      string
	DurationLabel              string
	PriceAmount                *float64
	Currency                   string
	PaymentRequired            bool
	ApprovalRequired           bool
	AllowSessionBooking        bool
	AllowPreferredDateRequest  bool
	LocationMode               string
	LocationLabel              string
	LocationNote               string
	FormattedAddress           string
	RegionCode                 string
	RegionName                 string
	ProvinceCode               string
	ProvinceName               string
	CityCode                   string
	CityName                   string
	BarangayCode               string
	BarangayName               string
	LocationSource             string
	DiveSiteID                 string
	IncludedMarkdown           string
	PrerequisitesMarkdown      string
	EquipmentMarkdown          string
	CancellationPolicyMarkdown string
	AvailabilityNote           string
	Status                     string
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
	UpcomingSessionCount       int
	PendingBookingCount        int
}

type PaymentMethod struct {
	ID            string
	SchoolID      string
	Type          string
	Name          string
	Instructions  string
	QRMediaID     string
	QRImageURL    string
	BankName      string
	AccountName   string
	AccountNumber string
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Session struct {
	ID                    string
	SchoolID              string
	CourseID              string
	CourseTitle           string
	Slug                  string
	Title                 string
	StartsAt              time.Time
	EndsAt                time.Time
	Timezone              string
	LocationMode          string
	LocationLabel         string
	LocationNote          string
	FormattedAddress      string
	RegionCode            string
	RegionName            string
	ProvinceCode          string
	ProvinceName          string
	CityCode              string
	CityName              string
	BarangayCode          string
	BarangayName          string
	LocationSource        string
	DiveSiteID            string
	InstructorUserID      string
	InstructorDisplayName string
	Capacity              *int
	Status                string
	NotesMarkdown         string
	CreatedAt             time.Time
	UpdatedAt             time.Time
	CancelledAt           *time.Time
	CompletedAt           *time.Time
	AssignedBookingCount  int
}

type Booking struct {
	ID                 string
	CourseID           string
	CourseTitle        string
	SchoolID           string
	SessionID          string
	SessionTitle       string
	StudentUserID      string
	StudentName        string
	StudentEmail       string
	StudentPhone       string
	BookingMode        string
	PreferredDate      time.Time
	AlternateDate      *time.Time
	Status             string
	StudentNote        string
	ExperienceLevel    string
	CertificationLevel string
	EquipmentNeeds     string
	AdminNotes         string
	CreatedAt          time.Time
	UpdatedAt          time.Time
	ReviewedAt         *time.Time
	ReviewedBy         string
	ScheduledAt        *time.Time
	CancelledAt        *time.Time
	CompletedAt        *time.Time
	Payment            *BookingPayment
}

type BookingPayment struct {
	ID              string
	BookingID       string
	CourseID        string
	SchoolID        string
	StudentUserID   string
	PaymentMethodID string
	Amount          *float64
	Currency        string
	ProofMediaID    string
	ReferenceNumber string
	Status          string
	ReviewedBy      string
	ReviewedAt      *time.Time
	ReviewNotes     string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type BookingPaymentProof struct {
	PaymentID     string
	BookingID     string
	SchoolID      string
	StudentUserID string
	ProofMediaID  string
	ObjectKey     string
	FileName      string
	ContentType   string
}

type SubmitBookingPaymentInput struct {
	PaymentMethodID string
	ProofMediaID    string
	ReferenceNumber string
}

type CreateSchoolInput struct {
	Name, ShortDescription, DescriptionMarkdown, BaseLocation, BaseLocationLabel, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName, CityCode, CityName, BarangayCode, BarangayName, LocationSource, DiveSiteID, ContactEmail, ContactPhone, WebsiteURL, FacebookURL, InstagramURL, OwnerUserID string
	Status                                                                                                                                                                                                                                                                                                         string
}

type UpdateSchoolInput struct {
	Name, ShortDescription, DescriptionMarkdown, BaseLocation, BaseLocationLabel, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName, CityCode, CityName, BarangayCode, BarangayName, LocationSource, DiveSiteID, ContactEmail, ContactPhone, WebsiteURL, FacebookURL, InstagramURL, Status *string
}

type CreateCourseInput struct {
	Title, ShortDescription, DescriptionMarkdown, CourseType, Level, DurationLabel, Currency, LocationMode, LocationLabel, LocationNote, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName, CityCode, CityName, BarangayCode, BarangayName, LocationSource, DiveSiteID, IncludedMarkdown, PrerequisitesMarkdown, EquipmentMarkdown, CancellationPolicyMarkdown, AvailabilityNote, Status string
	PriceAmount                                                                                                                                                                                                                                                                                                                                                                                             *float64
	PaymentRequired                                                                                                                                                                                                                                                                                                                                                                                         bool
	ApprovalRequired                                                                                                                                                                                                                                                                                                                                                                                        bool
	AllowSessionBooking                                                                                                                                                                                                                                                                                                                                                                                     bool
	AllowPreferredDateRequest                                                                                                                                                                                                                                                                                                                                                                               bool
}

type UpdateCourseInput = CreateCourseInput

type CreatePaymentMethodInput struct {
	Type, Name, Instructions, QRMediaID, BankName, AccountName, AccountNumber string
	IsActive                                                                  bool
}

type CreateSessionInput struct {
	CourseID, Title, Timezone, LocationMode, LocationLabel, LocationNote, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName, CityCode, CityName, BarangayCode, BarangayName, LocationSource, DiveSiteID, InstructorUserID, NotesMarkdown, Status string
	StartsAt, EndsAt                                                                                                                                                                                                                                                time.Time
	Capacity                                                                                                                                                                                                                                                        *int
}

type UpdateSessionInput = CreateSessionInput

type CreateBookingInput struct {
	CourseID, SessionID, StudentUserID, StudentName, StudentEmail, StudentPhone, BookingMode, Status, StudentNote, ExperienceLevel, CertificationLevel, EquipmentNeeds, AdminNotes string
	PreferredDate                                                                                                                                                                  time.Time
	AlternateDate                                                                                                                                                                  *time.Time
}

type UpdateBookingInput = CreateBookingInput

type ListSessionsInput struct {
	CourseID, Status, InstructorUserID, Search string
	DateFrom, DateTo                           *time.Time
}

type ListBookingsInput struct {
	CourseID, SessionID, BookingMode, Status, PaymentStatus, Search string
	PreferredDateFrom, PreferredDateTo                              *time.Time
}

type BookingNotificationEvent struct {
	EventType         string
	ActorUserID       string
	PreviousSessionID string
	IdempotencySuffix string
}

type SessionNotificationEvent struct {
	EventType         string
	ActorUserID       string
	ChangeTypes       []string
	PreviousStatus    string
	PreviousStartsAt  time.Time
	PreviousEndsAt    time.Time
	IdempotencySuffix string
}

type queryExecutor interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type PublicSchoolFilters struct {
	Search, Location, CourseType string
}

type PublicCourseFilters struct {
	Search, CourseType, Level, Payment string
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (r *Repo) ListSchools(ctx context.Context, actorID string) ([]School, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+schoolFields("s")+`,
		       COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL)::int,
		       COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status = 'published')::int,
		       COUNT(DISTINCT b.id) FILTER (WHERE b.deleted_at IS NULL AND b.status = 'pending_review')::int,
		       COUNT(DISTINCT cs.id) FILTER (WHERE cs.deleted_at IS NULL AND cs.starts_at >= NOW() AND cs.status IN ('draft', 'scheduled'))::int,
		       COUNT(DISTINCT bp.id) FILTER (WHERE bp.deleted_at IS NULL AND bp.status = 'submitted')::int
		FROM schools s
		JOIN school_members sm ON sm.school_id = s.id AND sm.user_id = $1 AND sm.status = 'active' AND sm.deleted_at IS NULL
		LEFT JOIN courses c ON c.school_id = s.id
		LEFT JOIN course_booking_requests b ON b.school_id = s.id
		LEFT JOIN course_sessions cs ON cs.school_id = s.id
		LEFT JOIN course_booking_payments bp ON bp.school_id = s.id
		LEFT JOIN dive_sites ds ON ds.id = s.dive_site_id
		WHERE s.deleted_at IS NULL
		GROUP BY s.id, ds.id
		ORDER BY s.updated_at DESC`, actorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []School
	for rows.Next() {
		item, err := scanSchool(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) HasInstructorProfile(ctx context.Context, userID string) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
	SELECT EXISTS (
		SELECT 1
		FROM instructor_profiles ip
		WHERE ip.user_id=$1
			AND EXISTS (SELECT 1 FROM instructor_certifications ic WHERE ic.instructor_profile_id = ip.id)
	)`, userID).Scan(&ok)
	return ok, err
}

func (r *Repo) IsPlatformAdmin(ctx context.Context, userID string) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE id=$1 AND global_role IN ('admin', 'super_admin') AND account_status='active')`, userID).Scan(&ok)
	return ok, err
}

func (r *Repo) CreateSchool(ctx context.Context, input CreateSchoolInput) (School, error) {
	base := sharedslug.Make(input.Name, "school")
	if base == "" {
		base = "school"
	}
	var created School
	err := platformdb.WithTx(ctx, r.pool, func(tx pgx.Tx) error {
		for attempt := 0; attempt < 20; attempt++ {
			slug := base
			if attempt > 0 {
				slug = fmt.Sprintf("%s-%d", base, attempt+1)
			}
			row := tx.QueryRow(ctx, `
				INSERT INTO schools (slug, name, short_description, description_markdown, base_location, base_location_label, formatted_address, region_code, region_name, province_code, province_name, city_code, city_name, barangay_code, barangay_name, location_source, dive_site_id, contact_email, contact_phone, website_url, facebook_url, instagram_url, status, owner_user_id)
				VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),NULLIF($9,''),NULLIF($10,''),NULLIF($11,''),NULLIF($12,''),NULLIF($13,''),NULLIF($14,''),NULLIF($15,''),$16,NULLIF($17,'')::uuid,NULLIF($18,''),NULLIF($19,''),NULLIF($20,''),NULLIF($21,''),NULLIF($22,''),$23,$24)
				RETURNING `+schoolFields("schools")+`, 0, 0, 0, 0, 0`,
				slug, input.Name, input.ShortDescription, input.DescriptionMarkdown, input.BaseLocation, input.BaseLocationLabel, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, defaultString(input.LocationSource, "manual"), input.DiveSiteID, input.ContactEmail, input.ContactPhone, input.WebsiteURL, input.FacebookURL, input.InstagramURL, input.Status, input.OwnerUserID)
			var item School
			if err := scanSchoolInto(row, &item); err != nil {
				if IsUniqueViolation(err) {
					continue
				}
				return err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO school_members (school_id, user_id, role, status) VALUES ($1,$2,'owner','active')`, item.ID, input.OwnerUserID); err != nil {
				return err
			}
			created = item
			return nil
		}
		return ErrSlugCollision
	})
	return created, err
}

func (r *Repo) GetSchoolBySlug(ctx context.Context, slug, actorID string) (School, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+schoolFields("s")+`,
		       COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL)::int,
		       COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status = 'published')::int,
		       COUNT(DISTINCT b.id) FILTER (WHERE b.deleted_at IS NULL AND b.status = 'pending_review')::int,
		       COUNT(DISTINCT cs.id) FILTER (WHERE cs.deleted_at IS NULL AND cs.starts_at >= NOW() AND cs.status IN ('draft', 'scheduled'))::int,
		       COUNT(DISTINCT bp.id) FILTER (WHERE bp.deleted_at IS NULL AND bp.status = 'submitted')::int
		FROM schools s
		JOIN school_members sm ON sm.school_id = s.id AND sm.user_id = $2 AND sm.status = 'active' AND sm.deleted_at IS NULL
		LEFT JOIN courses c ON c.school_id = s.id
		LEFT JOIN course_booking_requests b ON b.school_id = s.id
		LEFT JOIN course_sessions cs ON cs.school_id = s.id
		LEFT JOIN course_booking_payments bp ON bp.school_id = s.id
		LEFT JOIN dive_sites ds ON ds.id = s.dive_site_id
		WHERE s.slug = $1 AND s.deleted_at IS NULL
		GROUP BY s.id, ds.id`, slug, actorID)
	return scanSchool(row)
}

func (r *Repo) GetMemberRole(ctx context.Context, schoolID, actorID string) (string, error) {
	var role string
	err := r.pool.QueryRow(ctx, `SELECT role FROM school_members WHERE school_id = $1 AND user_id = $2 AND status = 'active' AND deleted_at IS NULL`, schoolID, actorID).Scan(&role)
	return role, err
}

func (r *Repo) UpdateSchool(ctx context.Context, schoolID string, input UpdateSchoolInput) (School, error) {
	current, err := r.schoolByID(ctx, schoolID)
	if err != nil {
		return School{}, err
	}
	name := coalesceString(input.Name, current.Name)
	shortDescription := coalesceString(input.ShortDescription, current.ShortDescription)
	descriptionMarkdown := coalesceString(input.DescriptionMarkdown, current.DescriptionMarkdown)
	baseLocation := coalesceString(input.BaseLocation, current.BaseLocation)
	baseLocationLabel := coalesceString(input.BaseLocationLabel, current.BaseLocationLabel)
	formattedAddress := coalesceString(input.FormattedAddress, current.FormattedAddress)
	regionCode := coalesceString(input.RegionCode, current.RegionCode)
	regionName := coalesceString(input.RegionName, current.RegionName)
	provinceCode := coalesceString(input.ProvinceCode, current.ProvinceCode)
	provinceName := coalesceString(input.ProvinceName, current.ProvinceName)
	cityCode := coalesceString(input.CityCode, current.CityCode)
	cityName := coalesceString(input.CityName, current.CityName)
	barangayCode := coalesceString(input.BarangayCode, current.BarangayCode)
	barangayName := coalesceString(input.BarangayName, current.BarangayName)
	locationSource := coalesceString(input.LocationSource, current.LocationSource)
	diveSiteID := coalesceString(input.DiveSiteID, current.DiveSiteID)
	contactEmail := coalesceString(input.ContactEmail, current.ContactEmail)
	contactPhone := coalesceString(input.ContactPhone, current.ContactPhone)
	websiteURL := coalesceString(input.WebsiteURL, current.WebsiteURL)
	facebookURL := coalesceString(input.FacebookURL, current.FacebookURL)
	instagramURL := coalesceString(input.InstagramURL, current.InstagramURL)
	status := coalesceString(input.Status, current.Status)
	row := r.pool.QueryRow(ctx, `
		UPDATE schools SET name=$2, short_description=$3, description_markdown=$4, base_location=NULLIF($5,''), base_location_label=NULLIF($6,''), formatted_address=NULLIF($7,''), region_code=NULLIF($8,''), region_name=NULLIF($9,''), province_code=NULLIF($10,''), province_name=NULLIF($11,''), city_code=NULLIF($12,''), city_name=NULLIF($13,''), barangay_code=NULLIF($14,''), barangay_name=NULLIF($15,''), location_source=$16, dive_site_id=NULLIF($17,'')::uuid, contact_email=NULLIF($18,''), contact_phone=NULLIF($19,''), website_url=NULLIF($20,''), facebook_url=NULLIF($21,''), instagram_url=NULLIF($22,''), status=$23, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
		RETURNING `+schoolFields("schools")+`, 0, 0, 0, 0, 0`,
		schoolID, name, shortDescription, descriptionMarkdown, baseLocation, baseLocationLabel, formattedAddress, regionCode, regionName, provinceCode, provinceName, cityCode, cityName, barangayCode, barangayName, defaultString(locationSource, "manual"), diveSiteID, contactEmail, contactPhone, websiteURL, facebookURL, instagramURL, status)
	return scanSchool(row)
}

func (r *Repo) DeleteSchool(ctx context.Context, schoolID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE schools SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, schoolID)
	return err
}

func (r *Repo) ListCourses(ctx context.Context, schoolID string) ([]Course, error) {
	rows, err := r.pool.Query(ctx, courseSelect()+`
		WHERE c.school_id=$1 AND c.deleted_at IS NULL
		GROUP BY c.id
		ORDER BY c.updated_at DESC`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Course
	for rows.Next() {
		item, err := scanCourse(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateCourse(ctx context.Context, schoolID string, input CreateCourseInput) (Course, error) {
	base := sharedslug.Make(input.Title, "course")
	if base == "" {
		base = "course"
	}
	for attempt := 0; attempt < 20; attempt++ {
		slug := base
		if attempt > 0 {
			slug = fmt.Sprintf("%s-%d", base, attempt+1)
		}
		row := r.pool.QueryRow(ctx, `
			INSERT INTO courses (school_id,slug,title,short_description,description_markdown,course_type,level,duration_label,price_amount,currency,payment_required,approval_required,allow_session_booking,allow_preferred_date_request,location_mode,location_label,location_note,formatted_address,region_code,region_name,province_code,province_name,city_code,city_name,barangay_code,barangay_name,location_source,dive_site_id,included_markdown,prerequisites_markdown,equipment_markdown,cancellation_policy_markdown,availability_note,status)
			VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11,$12,$13,$14,$15,NULLIF($16,''),NULLIF($17,''),NULLIF($18,''),NULLIF($19,''),NULLIF($20,''),NULLIF($21,''),NULLIF($22,''),NULLIF($23,''),NULLIF($24,''),NULLIF($25,''),NULLIF($26,''),$27,NULLIF($28,'')::uuid,NULLIF($29,''),NULLIF($30,''),NULLIF($31,''),NULLIF($32,''),NULLIF($33,''),$34)
			RETURNING id,school_id,slug,title,short_description,description_markdown,course_type,COALESCE(level,''),COALESCE(duration_label,''),price_amount::float8,currency,payment_required,approval_required,allow_session_booking,allow_preferred_date_request,location_mode,COALESCE(location_label,''),COALESCE(location_note,''),COALESCE(formatted_address,''),COALESCE(region_code,''),COALESCE(region_name,''),COALESCE(province_code,''),COALESCE(province_name,''),COALESCE(city_code,''),COALESCE(city_name,''),COALESCE(barangay_code,''),COALESCE(barangay_name,''),COALESCE(location_source,'manual'),COALESCE(dive_site_id::text,''),COALESCE(included_markdown,''),COALESCE(prerequisites_markdown,''),COALESCE(equipment_markdown,''),COALESCE(cancellation_policy_markdown,''),COALESCE(availability_note,''),status,created_at,updated_at,0,0`,
			schoolID, slug, input.Title, input.ShortDescription, input.DescriptionMarkdown, input.CourseType, input.Level, input.DurationLabel, input.PriceAmount, input.Currency, input.PaymentRequired, input.ApprovalRequired, input.AllowSessionBooking, input.AllowPreferredDateRequest, input.LocationMode, input.LocationLabel, input.LocationNote, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, input.LocationSource, input.DiveSiteID, input.IncludedMarkdown, input.PrerequisitesMarkdown, input.EquipmentMarkdown, input.CancellationPolicyMarkdown, input.AvailabilityNote, input.Status)
		item, err := scanCourse(row)
		if err == nil {
			return item, nil
		}
		if IsUniqueViolation(err) {
			continue
		}
		return Course{}, err
	}
	return Course{}, ErrSlugCollision
}

func (r *Repo) GetCourse(ctx context.Context, schoolID, idOrSlug string) (Course, error) {
	row := r.pool.QueryRow(ctx, courseSelect()+` WHERE c.school_id=$1 AND c.deleted_at IS NULL AND (c.id::text=$2 OR c.slug=$2) GROUP BY c.id`, schoolID, idOrSlug)
	return scanCourse(row)
}

func (r *Repo) UpdateCourse(ctx context.Context, schoolID, idOrSlug string, input UpdateCourseInput) (Course, error) {
	course, err := r.GetCourse(ctx, schoolID, idOrSlug)
	if err != nil {
		return Course{}, err
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE courses SET title=$3, short_description=$4, description_markdown=$5, course_type=$6, level=NULLIF($7,''), duration_label=NULLIF($8,''), price_amount=$9, currency=$10, payment_required=$11, approval_required=$12, allow_session_booking=$13, allow_preferred_date_request=$14, location_mode=$15, location_label=NULLIF($16,''), location_note=NULLIF($17,''), formatted_address=NULLIF($18,''), region_code=NULLIF($19,''), region_name=NULLIF($20,''), province_code=NULLIF($21,''), province_name=NULLIF($22,''), city_code=NULLIF($23,''), city_name=NULLIF($24,''), barangay_code=NULLIF($25,''), barangay_name=NULLIF($26,''), location_source=$27, dive_site_id=NULLIF($28,'')::uuid, included_markdown=NULLIF($29,''), prerequisites_markdown=NULLIF($30,''), equipment_markdown=NULLIF($31,''), cancellation_policy_markdown=NULLIF($32,''), availability_note=NULLIF($33,''), status=$34, updated_at=NOW()
		WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL
		RETURNING id,school_id,slug,title,short_description,description_markdown,course_type,COALESCE(level,''),COALESCE(duration_label,''),price_amount::float8,currency,payment_required,approval_required,allow_session_booking,allow_preferred_date_request,location_mode,COALESCE(location_label,''),COALESCE(location_note,''),COALESCE(formatted_address,''),COALESCE(region_code,''),COALESCE(region_name,''),COALESCE(province_code,''),COALESCE(province_name,''),COALESCE(city_code,''),COALESCE(city_name,''),COALESCE(barangay_code,''),COALESCE(barangay_name,''),COALESCE(location_source,'manual'),COALESCE(dive_site_id::text,''),COALESCE(included_markdown,''),COALESCE(prerequisites_markdown,''),COALESCE(equipment_markdown,''),COALESCE(cancellation_policy_markdown,''),COALESCE(availability_note,''),status,created_at,updated_at,0,0`,
		course.ID, schoolID, input.Title, input.ShortDescription, input.DescriptionMarkdown, input.CourseType, input.Level, input.DurationLabel, input.PriceAmount, input.Currency, input.PaymentRequired, input.ApprovalRequired, input.AllowSessionBooking, input.AllowPreferredDateRequest, input.LocationMode, input.LocationLabel, input.LocationNote, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, input.LocationSource, input.DiveSiteID, input.IncludedMarkdown, input.PrerequisitesMarkdown, input.EquipmentMarkdown, input.CancellationPolicyMarkdown, input.AvailabilityNote, input.Status)
	return scanCourse(row)
}

func (r *Repo) DeleteCourse(ctx context.Context, schoolID, idOrSlug string) error {
	_, err := r.pool.Exec(ctx, `UPDATE courses SET deleted_at=NOW(), updated_at=NOW() WHERE school_id=$1 AND (id::text=$2 OR slug=$2) AND deleted_at IS NULL`, schoolID, idOrSlug)
	return err
}

func (r *Repo) ListPaymentMethods(ctx context.Context, schoolID string) ([]PaymentMethod, error) {
	rows, err := r.pool.Query(ctx, `SELECT spm.id,spm.school_id,spm.type,spm.name,COALESCE(spm.instructions,''),COALESCE(spm.qr_media_id::text,''),COALESCE(mo.object_key,''),COALESCE(spm.bank_name,''),COALESCE(spm.account_name,''),COALESCE(spm.account_number,''),spm.is_active,spm.created_at,spm.updated_at FROM school_payment_methods spm LEFT JOIN media_objects mo ON mo.id=spm.qr_media_id WHERE spm.school_id=$1 AND spm.deleted_at IS NULL ORDER BY spm.created_at DESC`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []PaymentMethod
	for rows.Next() {
		item, err := scanPaymentMethod(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreatePaymentMethod(ctx context.Context, schoolID string, input CreatePaymentMethodInput) (PaymentMethod, error) {
	row := r.pool.QueryRow(ctx, `INSERT INTO school_payment_methods (school_id,type,name,instructions,qr_media_id,bank_name,account_name,account_number,is_active) VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,'')::uuid,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),$9) RETURNING id,school_id,type,name,COALESCE(instructions,''),COALESCE(qr_media_id::text,''),'',COALESCE(bank_name,''),COALESCE(account_name,''),COALESCE(account_number,''),is_active,created_at,updated_at`, schoolID, input.Type, input.Name, input.Instructions, input.QRMediaID, input.BankName, input.AccountName, input.AccountNumber, input.IsActive)
	return scanPaymentMethod(row)
}

func (r *Repo) UpdatePaymentMethod(ctx context.Context, schoolID, methodID string, input CreatePaymentMethodInput) (PaymentMethod, error) {
	row := r.pool.QueryRow(ctx, `UPDATE school_payment_methods SET type=$3,name=$4,instructions=NULLIF($5,''),qr_media_id=NULLIF($6,'')::uuid,bank_name=NULLIF($7,''),account_name=NULLIF($8,''),account_number=NULLIF($9,''),is_active=$10,updated_at=NOW() WHERE school_id=$1 AND id=$2 AND deleted_at IS NULL RETURNING id,school_id,type,name,COALESCE(instructions,''),COALESCE(qr_media_id::text,''),'',COALESCE(bank_name,''),COALESCE(account_name,''),COALESCE(account_number,''),is_active,created_at,updated_at`, schoolID, methodID, input.Type, input.Name, input.Instructions, input.QRMediaID, input.BankName, input.AccountName, input.AccountNumber, input.IsActive)
	return scanPaymentMethod(row)
}

func (r *Repo) DeletePaymentMethod(ctx context.Context, schoolID, methodID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE school_payment_methods SET deleted_at=NOW(), updated_at=NOW() WHERE school_id=$1 AND id=$2 AND deleted_at IS NULL`, schoolID, methodID)
	return err
}

func (r *Repo) ListSessions(ctx context.Context, schoolID string, input ListSessionsInput) ([]Session, error) {
	args := []any{schoolID}
	where := []string{"s.school_id=$1", "s.deleted_at IS NULL"}
	if input.CourseID != "" {
		args = append(args, input.CourseID)
		where = append(where, fmt.Sprintf("s.course_id::text=$%d", len(args)))
	}
	if input.Status != "" {
		args = append(args, input.Status)
		where = append(where, fmt.Sprintf("s.status=$%d", len(args)))
	}
	if input.InstructorUserID != "" {
		args = append(args, input.InstructorUserID)
		where = append(where, fmt.Sprintf("s.instructor_user_id::text=$%d", len(args)))
	}
	if input.DateFrom != nil {
		args = append(args, *input.DateFrom)
		where = append(where, fmt.Sprintf("s.starts_at >= $%d", len(args)))
	}
	if input.DateTo != nil {
		args = append(args, *input.DateTo)
		where = append(where, fmt.Sprintf("s.starts_at <= $%d", len(args)))
	}
	if input.Search != "" {
		args = append(args, "%"+strings.ToLower(input.Search)+"%")
		where = append(where, fmt.Sprintf("(lower(s.title) LIKE $%d OR lower(c.title) LIKE $%d)", len(args), len(args)))
	}
	rows, err := r.pool.Query(ctx, sessionSelect()+" WHERE "+strings.Join(where, " AND ")+" GROUP BY s.id,c.title,u.display_name ORDER BY s.starts_at DESC", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Session
	for rows.Next() {
		item, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateSession(ctx context.Context, schoolID string, input CreateSessionInput) (Session, error) {
	base := sharedslug.Make(input.Title, "session")
	if base == "" {
		base = "session"
	}
	for attempt := 0; attempt < 20; attempt++ {
		slug := base
		if attempt > 0 {
			slug = fmt.Sprintf("%s-%d", base, attempt+1)
		}
		row := r.pool.QueryRow(ctx, `INSERT INTO course_sessions (school_id,course_id,slug,title,starts_at,ends_at,timezone,location_mode,location_label,location_note,formatted_address,region_code,region_name,province_code,province_name,city_code,city_name,barangay_code,barangay_name,location_source,dive_site_id,instructor_user_id,capacity,status,notes_markdown) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),NULLIF($10,''),NULLIF($11,''),NULLIF($12,''),NULLIF($13,''),NULLIF($14,''),NULLIF($15,''),NULLIF($16,''),NULLIF($17,''),NULLIF($18,''),NULLIF($19,''),$20,NULLIF($21,'')::uuid,NULLIF($22,'')::uuid,$23,$24,NULLIF($25,'')) RETURNING id`, schoolID, input.CourseID, slug, input.Title, input.StartsAt, input.EndsAt, input.Timezone, input.LocationMode, input.LocationLabel, input.LocationNote, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, input.LocationSource, input.DiveSiteID, input.InstructorUserID, input.Capacity, input.Status, input.NotesMarkdown)
		var id string
		err := row.Scan(&id)
		if err == nil {
			return r.GetSession(ctx, schoolID, id)
		}
		if IsUniqueViolation(err) {
			continue
		}
		return Session{}, err
	}
	return Session{}, ErrSlugCollision
}

func (r *Repo) GetSession(ctx context.Context, schoolID, idOrSlug string) (Session, error) {
	return getSessionWithExecutor(ctx, r.pool, schoolID, idOrSlug)
}

func (r *Repo) UpdateSession(ctx context.Context, schoolID, idOrSlug string, input UpdateSessionInput, event *SessionNotificationEvent) (Session, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Session{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	s, err := getSessionWithExecutor(ctx, tx, schoolID, idOrSlug)
	if err != nil {
		return Session{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE course_sessions SET course_id=$3,title=$4,starts_at=$5,ends_at=$6,timezone=$7,location_mode=$8,location_label=NULLIF($9,''),location_note=NULLIF($10,''),formatted_address=NULLIF($11,''),region_code=NULLIF($12,''),region_name=NULLIF($13,''),province_code=NULLIF($14,''),province_name=NULLIF($15,''),city_code=NULLIF($16,''),city_name=NULLIF($17,''),barangay_code=NULLIF($18,''),barangay_name=NULLIF($19,''),location_source=$20,dive_site_id=NULLIF($21,'')::uuid,instructor_user_id=NULLIF($22,'')::uuid,capacity=$23,status=$24,notes_markdown=NULLIF($25,''),updated_at=NOW() WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL`, s.ID, schoolID, input.CourseID, input.Title, input.StartsAt, input.EndsAt, input.Timezone, input.LocationMode, input.LocationLabel, input.LocationNote, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, input.LocationSource, input.DiveSiteID, input.InstructorUserID, input.Capacity, input.Status, input.NotesMarkdown)
	if err != nil {
		return Session{}, err
	}
	item, err := getSessionWithExecutor(ctx, tx, schoolID, s.ID)
	if err != nil {
		return Session{}, err
	}
	if event != nil {
		if err := enqueueSessionOutbox(ctx, tx, item, *event); err != nil {
			return Session{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, err
	}
	return item, nil
}

func (r *Repo) SetSessionStatus(ctx context.Context, schoolID, idOrSlug, status string, event *SessionNotificationEvent) (Session, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Session{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	s, err := getSessionWithExecutor(ctx, tx, schoolID, idOrSlug)
	if err != nil {
		return Session{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE course_sessions SET status=$3, updated_at=NOW(), cancelled_at=CASE WHEN $3='cancelled' THEN NOW() ELSE cancelled_at END, completed_at=CASE WHEN $3='completed' THEN NOW() ELSE completed_at END WHERE id=$1 AND school_id=$2`, s.ID, schoolID, status)
	if err != nil {
		return Session{}, err
	}
	item, err := getSessionWithExecutor(ctx, tx, schoolID, s.ID)
	if err != nil {
		return Session{}, err
	}
	if event != nil {
		if err := enqueueSessionOutbox(ctx, tx, item, *event); err != nil {
			return Session{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, err
	}
	return item, nil
}

func (r *Repo) DeleteSession(ctx context.Context, schoolID, idOrSlug string) error {
	_, err := r.pool.Exec(ctx, `UPDATE course_sessions SET deleted_at=NOW(), updated_at=NOW() WHERE school_id=$1 AND (id::text=$2 OR slug=$2) AND deleted_at IS NULL`, schoolID, idOrSlug)
	return err
}

func (r *Repo) ListBookings(ctx context.Context, schoolID string, input ListBookingsInput) ([]Booking, error) {
	args := []any{schoolID}
	where := []string{"b.school_id=$1", "b.deleted_at IS NULL"}
	if input.CourseID != "" {
		args = append(args, input.CourseID)
		where = append(where, fmt.Sprintf("b.course_id::text=$%d", len(args)))
	}
	if input.SessionID != "" {
		args = append(args, input.SessionID)
		where = append(where, fmt.Sprintf("b.session_id::text=$%d", len(args)))
	}
	if input.BookingMode != "" {
		args = append(args, input.BookingMode)
		where = append(where, fmt.Sprintf("b.booking_mode=$%d", len(args)))
	}
	if input.Status != "" {
		args = append(args, input.Status)
		where = append(where, fmt.Sprintf("b.status=$%d", len(args)))
	}
	if input.PaymentStatus != "" {
		args = append(args, input.PaymentStatus)
		where = append(where, fmt.Sprintf("bp.status=$%d", len(args)))
	}
	if input.PreferredDateFrom != nil {
		args = append(args, *input.PreferredDateFrom)
		where = append(where, fmt.Sprintf("b.preferred_date >= $%d", len(args)))
	}
	if input.PreferredDateTo != nil {
		args = append(args, *input.PreferredDateTo)
		where = append(where, fmt.Sprintf("b.preferred_date <= $%d", len(args)))
	}
	if input.Search != "" {
		args = append(args, "%"+strings.ToLower(input.Search)+"%")
		where = append(where, fmt.Sprintf("(lower(COALESCE(b.student_name,'')) LIKE $%d OR lower(COALESCE(b.student_email,'')) LIKE $%d OR lower(c.title) LIKE $%d)", len(args), len(args), len(args)))
	}
	rows, err := r.pool.Query(ctx, bookingSelect()+" WHERE "+strings.Join(where, " AND ")+" ORDER BY b.created_at DESC", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Booking
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateBooking(ctx context.Context, schoolID string, input CreateBookingInput, event *BookingNotificationEvent) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	row := tx.QueryRow(ctx, `INSERT INTO course_booking_requests (school_id,course_id,session_id,student_user_id,student_name,student_email,student_phone,booking_mode,preferred_date,alternate_date,status,student_note,experience_level,certification_level,equipment_needs,admin_notes,scheduled_at) VALUES ($1,$2,NULLIF($3,'')::uuid,NULLIF($4,'')::uuid,NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),$8,NULLIF($9::date, DATE '0001-01-01'),$10,$11,NULLIF($12,''),NULLIF($13,''),NULLIF($14,''),NULLIF($15,''),NULLIF($16,''),CASE WHEN $11='scheduled' THEN NOW() ELSE NULL END) RETURNING id`, schoolID, input.CourseID, input.SessionID, input.StudentUserID, input.StudentName, input.StudentEmail, input.StudentPhone, input.BookingMode, input.PreferredDate, input.AlternateDate, input.Status, input.StudentNote, input.ExperienceLevel, input.CertificationLevel, input.EquipmentNeeds, input.AdminNotes)
	var id string
	if err := row.Scan(&id); err != nil {
		return Booking{}, err
	}
	if err := ensureBookingPaymentWithExecutor(ctx, tx, id); err != nil {
		return Booking{}, err
	}
	item, err := getBookingWithExecutor(ctx, tx, schoolID, id)
	if err != nil {
		return Booking{}, err
	}
	if event != nil {
		if err := enqueueBookingOutbox(ctx, tx, item, *event); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) GetBooking(ctx context.Context, schoolID, bookingID string) (Booking, error) {
	return getBookingWithExecutor(ctx, r.pool, schoolID, bookingID)
}

func (r *Repo) UpdateBooking(ctx context.Context, schoolID, bookingID string, input UpdateBookingInput, event *BookingNotificationEvent) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `UPDATE course_booking_requests SET course_id=$3,session_id=NULLIF($4,'')::uuid,student_user_id=NULLIF($5,'')::uuid,student_name=NULLIF($6,''),student_email=NULLIF($7,''),student_phone=NULLIF($8,''),booking_mode=$9,preferred_date=NULLIF($10::date, DATE '0001-01-01'),alternate_date=$11,status=$12,student_note=NULLIF($13,''),experience_level=NULLIF($14,''),certification_level=NULLIF($15,''),equipment_needs=NULLIF($16,''),admin_notes=NULLIF($17,''),updated_at=NOW(),scheduled_at=CASE WHEN $12='scheduled' AND scheduled_at IS NULL THEN NOW() ELSE scheduled_at END WHERE school_id=$1 AND id=$2 AND deleted_at IS NULL`, schoolID, bookingID, input.CourseID, input.SessionID, input.StudentUserID, input.StudentName, input.StudentEmail, input.StudentPhone, input.BookingMode, input.PreferredDate, input.AlternateDate, input.Status, input.StudentNote, input.ExperienceLevel, input.CertificationLevel, input.EquipmentNeeds, input.AdminNotes)
	if err != nil {
		return Booking{}, err
	}
	item, err := getBookingWithExecutor(ctx, tx, schoolID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	if event != nil {
		if err := enqueueBookingOutbox(ctx, tx, item, *event); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) SetBookingStatus(ctx context.Context, schoolID, bookingID, actorID, status string, event *BookingNotificationEvent) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `UPDATE course_booking_requests SET status=$4, updated_at=NOW(), reviewed_by=CASE WHEN $4 IN ('approved','rejected') THEN $3 ELSE reviewed_by END, reviewed_at=CASE WHEN $4 IN ('approved','rejected') THEN NOW() ELSE reviewed_at END, scheduled_at=CASE WHEN $4='scheduled' THEN NOW() ELSE scheduled_at END, completed_at=CASE WHEN $4='completed' THEN NOW() ELSE completed_at END, cancelled_at=CASE WHEN $4='cancelled' THEN NOW() ELSE cancelled_at END WHERE school_id=$1 AND id=$2 AND deleted_at IS NULL`, schoolID, bookingID, actorID, status)
	if err != nil {
		return Booking{}, err
	}
	item, err := getBookingWithExecutor(ctx, tx, schoolID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	if event != nil {
		if err := enqueueBookingOutbox(ctx, tx, item, *event); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) AssignBookingSession(ctx context.Context, schoolID, bookingID, sessionID string, event *BookingNotificationEvent) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `UPDATE course_booking_requests b SET session_id=s.id,status='scheduled',scheduled_at=NOW(),updated_at=NOW() FROM course_sessions s WHERE b.school_id=$1 AND b.id=$2 AND s.id=$3 AND s.school_id=b.school_id AND s.course_id=b.course_id AND b.deleted_at IS NULL AND s.deleted_at IS NULL`, schoolID, bookingID, sessionID)
	if err != nil {
		return Booking{}, err
	}
	item, err := getBookingWithExecutor(ctx, tx, schoolID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	if event != nil {
		if err := enqueueBookingOutbox(ctx, tx, item, *event); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) UnassignBookingSession(ctx context.Context, schoolID, bookingID string, event *BookingNotificationEvent) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `UPDATE course_booking_requests SET session_id=NULL,status=CASE WHEN status='scheduled' THEN 'approved' ELSE status END,scheduled_at=NULL,updated_at=NOW() WHERE school_id=$1 AND id=$2 AND deleted_at IS NULL`, schoolID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	item, err := getBookingWithExecutor(ctx, tx, schoolID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	if event != nil {
		if err := enqueueBookingOutbox(ctx, tx, item, *event); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) ReviewBookingPayment(ctx context.Context, schoolID, bookingID, actorID, status, notes string) (BookingPayment, error) {
	if err := r.ensureBookingPaymentForSchool(ctx, schoolID, bookingID); err != nil {
		return BookingPayment{}, err
	}
	row := r.pool.QueryRow(ctx, `UPDATE course_booking_payments SET status=$4,reviewed_by=$3,reviewed_at=NOW(),review_notes=NULLIF($5,''),updated_at=NOW() WHERE school_id=$1 AND booking_id=$2 AND deleted_at IS NULL RETURNING id,booking_id,course_id,school_id,COALESCE(student_user_id::text,''),COALESCE(payment_method_id::text,''),amount::float8,currency,COALESCE(proof_media_id::text,''),COALESCE(reference_number,''),status,COALESCE(reviewed_by::text,''),reviewed_at,COALESCE(review_notes,''),created_at,updated_at`, schoolID, bookingID, actorID, status, notes)
	return scanBookingPayment(row)
}

func (r *Repo) GetBookingPaymentProof(ctx context.Context, schoolID, bookingID string) (BookingPaymentProof, error) {
	const q = `
		SELECT pay.id::text, pay.booking_id::text, pay.school_id::text,
			COALESCE(pay.student_user_id::text, ''), COALESCE(pay.proof_media_id::text, ''),
			mo.object_key, regexp_replace(mo.object_key, '^.*/', ''), mo.mime_type
		FROM course_booking_payments pay
		JOIN media_objects mo ON mo.id = pay.proof_media_id
		WHERE pay.school_id = $1::uuid
			AND pay.booking_id = $2::uuid
			AND pay.deleted_at IS NULL
			AND mo.context_type = 'course_booking_receipt'
			AND mo.context_id = pay.booking_id
			AND mo.owner_app_user_id = pay.student_user_id
			AND mo.state = 'active'
	`
	var item BookingPaymentProof
	if err := r.pool.QueryRow(ctx, q, schoolID, bookingID).Scan(
		&item.PaymentID,
		&item.BookingID,
		&item.SchoolID,
		&item.StudentUserID,
		&item.ProofMediaID,
		&item.ObjectKey,
		&item.FileName,
		&item.ContentType,
	); err != nil {
		return BookingPaymentProof{}, err
	}
	return item, nil
}

func (r *Repo) SubmitMyBookingPayment(ctx context.Context, userID, bookingID string, input SubmitBookingPaymentInput) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := ensureBookingPaymentWithExecutor(ctx, tx, bookingID); err != nil {
		return Booking{}, err
	}
	var updatedBookingID string
	err = tx.QueryRow(ctx, `
		WITH proof AS (
			SELECT id
			FROM media_objects
			WHERE id = $3::uuid
				AND owner_app_user_id = $1::uuid
				AND context_type = 'course_booking_receipt'
				AND context_id = $2::uuid
				AND state = 'active'
		)
		UPDATE course_booking_payments pay
		SET payment_method_id = CASE
				WHEN NULLIF($4, '') IS NULL THEN pay.payment_method_id
				ELSE $4::uuid
			END,
			proof_media_id = $3::uuid,
			reference_number = NULLIF($5, ''),
			status = 'submitted',
			reviewed_by = NULL,
			reviewed_at = NULL,
			review_notes = NULL,
			updated_at = NOW()
		FROM course_booking_requests b
		WHERE pay.booking_id = b.id
			AND b.student_user_id = $1::uuid
			AND b.id = $2::uuid
			AND b.deleted_at IS NULL
			AND pay.deleted_at IS NULL
			AND pay.status IN ('pending_upload', 'submitted', 'rejected')
			AND EXISTS (SELECT 1 FROM proof)
			AND (
				NULLIF($4, '') IS NULL
				OR EXISTS (
					SELECT 1
					FROM school_payment_methods spm
					WHERE spm.id = $4::uuid
						AND spm.school_id = b.school_id
						AND spm.is_active = TRUE
						AND spm.deleted_at IS NULL
				)
			)
		RETURNING b.id::text
	`, userID, bookingID, input.ProofMediaID, input.PaymentMethodID, input.ReferenceNumber).Scan(&updatedBookingID)
	if err != nil {
		return Booking{}, err
	}
	row := tx.QueryRow(ctx, bookingSelect()+" WHERE b.student_user_id=$1 AND b.id::text=$2 AND b.deleted_at IS NULL", userID, updatedBookingID)
	item, err := scanBooking(row)
	if err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repo) ListSessionBookings(ctx context.Context, schoolID, sessionID string) ([]Booking, error) {
	return r.ListBookings(ctx, schoolID, ListBookingsInput{SessionID: sessionID})
}

func (r *Repo) ensureBookingPayment(ctx context.Context, bookingID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO course_booking_payments (booking_id,course_id,school_id,student_user_id,amount,currency,status) SELECT b.id,b.course_id,b.school_id,b.student_user_id,c.price_amount,c.currency,CASE WHEN c.payment_required THEN 'pending_upload' ELSE 'not_required' END FROM course_booking_requests b JOIN courses c ON c.id=b.course_id WHERE b.id=$1 ON CONFLICT (booking_id) DO NOTHING`, bookingID)
	return err
}

func (r *Repo) ensureBookingPaymentForSchool(ctx context.Context, schoolID, bookingID string) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO course_booking_payments (booking_id,course_id,school_id,student_user_id,amount,currency,status) SELECT b.id,b.course_id,b.school_id,b.student_user_id,c.price_amount,c.currency,CASE WHEN c.payment_required THEN 'pending_upload' ELSE 'not_required' END FROM course_booking_requests b JOIN courses c ON c.id=b.course_id WHERE b.school_id=$1 AND b.id=$2 ON CONFLICT (booking_id) DO NOTHING`, schoolID, bookingID)
	return err
}

func (r *Repo) schoolByID(ctx context.Context, schoolID string) (School, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+schoolFields("s")+`,0,0,0,0,0 FROM schools s LEFT JOIN dive_sites ds ON ds.id=s.dive_site_id WHERE s.id=$1 AND s.deleted_at IS NULL`, schoolID)
	return scanSchool(row)
}

func (r *Repo) ListPublicSchools(ctx context.Context, input PublicSchoolFilters) ([]School, error) {
	args := []any{}
	where := []string{"s.deleted_at IS NULL", "s.status = 'published'"}
	if input.Search != "" {
		args = append(args, "%"+strings.ToLower(input.Search)+"%")
		where = append(where, fmt.Sprintf("(lower(s.name) LIKE $%d OR lower(s.short_description) LIKE $%d)", len(args), len(args)))
	}
	if input.Location != "" {
		args = append(args, "%"+strings.ToLower(input.Location)+"%")
		where = append(where, fmt.Sprintf("(lower(COALESCE(s.base_location_label,s.base_location,'')) LIKE $%d OR lower(COALESCE(s.formatted_address,'')) LIKE $%d OR lower(COALESCE(ds.name,'')) LIKE $%d)", len(args), len(args), len(args)))
	}
	if input.CourseType != "" {
		args = append(args, input.CourseType)
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM courses pc WHERE pc.school_id=s.id AND pc.deleted_at IS NULL AND pc.status='published' AND pc.course_type=$%d)", len(args)))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT `+schoolFields("s")+`,COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL)::int,COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status='published')::int,0,0,0
		FROM schools s
		LEFT JOIN courses c ON c.school_id=s.id
		LEFT JOIN dive_sites ds ON ds.id=s.dive_site_id
		WHERE `+strings.Join(where, " AND ")+`
		GROUP BY s.id, ds.id
		ORDER BY s.name ASC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []School
	for rows.Next() {
		item, err := scanSchool(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetPublicSchoolBySlug(ctx context.Context, slug string) (School, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+schoolFields("s")+`,COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL)::int,COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status='published')::int,0,0,0
		FROM schools s
		LEFT JOIN courses c ON c.school_id=s.id
		LEFT JOIN dive_sites ds ON ds.id=s.dive_site_id
		WHERE s.slug=$1 AND s.deleted_at IS NULL AND s.status='published'
		GROUP BY s.id, ds.id`, slug)
	return scanSchool(row)
}

func (r *Repo) ListPublicCourses(ctx context.Context, schoolID string, input PublicCourseFilters) ([]Course, error) {
	args := []any{schoolID}
	where := []string{"c.school_id=$1", "c.deleted_at IS NULL", "c.status='published'"}
	if input.Search != "" {
		args = append(args, "%"+strings.ToLower(input.Search)+"%")
		where = append(where, fmt.Sprintf("(lower(c.title) LIKE $%d OR lower(c.short_description) LIKE $%d)", len(args), len(args)))
	}
	if input.CourseType != "" {
		args = append(args, input.CourseType)
		where = append(where, fmt.Sprintf("c.course_type=$%d", len(args)))
	}
	if input.Level != "" {
		args = append(args, input.Level)
		where = append(where, fmt.Sprintf("c.level=$%d", len(args)))
	}
	if input.Payment == "free" {
		where = append(where, "c.payment_required = FALSE")
	}
	if input.Payment == "paid" {
		where = append(where, "c.payment_required = TRUE")
	}
	rows, err := r.pool.Query(ctx, courseSelect()+" WHERE "+strings.Join(where, " AND ")+" GROUP BY c.id ORDER BY c.title ASC", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Course
	for rows.Next() {
		item, err := scanCourse(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetPublicCourse(ctx context.Context, schoolID, slug string) (Course, error) {
	row := r.pool.QueryRow(ctx, courseSelect()+" WHERE c.school_id=$1 AND c.deleted_at IS NULL AND c.status='published' AND c.slug=$2 GROUP BY c.id", schoolID, slug)
	return scanCourse(row)
}

func (r *Repo) ListPublicCourseSessions(ctx context.Context, schoolID, courseID string) ([]Session, error) {
	rows, err := r.pool.Query(ctx, sessionSelect()+`
		WHERE s.school_id=$1
		  AND s.course_id=$2
		  AND s.deleted_at IS NULL
		  AND s.status='scheduled'
		  AND s.starts_at >= NOW()
		GROUP BY s.id,c.title,u.display_name
		ORDER BY s.starts_at ASC`, schoolID, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Session
	for rows.Next() {
		item, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) ListMyBookings(ctx context.Context, userID string) ([]Booking, error) {
	rows, err := r.pool.Query(ctx, bookingSelect()+" WHERE b.student_user_id=$1 AND b.deleted_at IS NULL ORDER BY b.created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Booking
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetMyBooking(ctx context.Context, userID, bookingID string) (Booking, error) {
	row := r.pool.QueryRow(ctx, bookingSelect()+" WHERE b.student_user_id=$1 AND b.id::text=$2 AND b.deleted_at IS NULL", userID, bookingID)
	return scanBooking(row)
}

func (r *Repo) CancelMyBooking(ctx context.Context, userID, bookingID string) (Booking, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Booking{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `UPDATE course_booking_requests SET status='cancelled',cancelled_at=NOW(),updated_at=NOW() WHERE student_user_id=$1 AND id::text=$2 AND deleted_at IS NULL AND status IN ('pending_review','approved','scheduled')`, userID, bookingID)
	if err != nil {
		return Booking{}, err
	}
	row := tx.QueryRow(ctx, bookingSelect()+" WHERE b.student_user_id=$1 AND b.id::text=$2 AND b.deleted_at IS NULL", userID, bookingID)
	item, err := scanBooking(row)
	if err != nil {
		return Booking{}, err
	}
	if err := enqueueBookingOutbox(ctx, tx, item, BookingNotificationEvent{
		EventType:   notificationsrepo.OutboxEventBookingCancelledByStudent,
		ActorUserID: userID,
	}); err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func courseSelect() string {
	return `SELECT c.id,c.school_id,c.slug,c.title,c.short_description,c.description_markdown,c.course_type,COALESCE(c.level,''),COALESCE(c.duration_label,''),c.price_amount::float8,c.currency,c.payment_required,c.approval_required,c.allow_session_booking,c.allow_preferred_date_request,c.location_mode,COALESCE(c.location_label,''),COALESCE(c.location_note,''),COALESCE(c.formatted_address,''),COALESCE(c.region_code,''),COALESCE(c.region_name,''),COALESCE(c.province_code,''),COALESCE(c.province_name,''),COALESCE(c.city_code,''),COALESCE(c.city_name,''),COALESCE(c.barangay_code,''),COALESCE(c.barangay_name,''),COALESCE(c.location_source,'manual'),COALESCE(c.dive_site_id::text,''),COALESCE(c.included_markdown,''),COALESCE(c.prerequisites_markdown,''),COALESCE(c.equipment_markdown,''),COALESCE(c.cancellation_policy_markdown,''),COALESCE(c.availability_note,''),c.status,c.created_at,c.updated_at,COUNT(DISTINCT s.id) FILTER (WHERE s.deleted_at IS NULL AND s.starts_at >= NOW() AND s.status IN ('draft','scheduled'))::int,COUNT(DISTINCT b.id) FILTER (WHERE b.deleted_at IS NULL AND b.status = 'pending_review')::int FROM courses c LEFT JOIN course_sessions s ON s.course_id=c.id LEFT JOIN course_booking_requests b ON b.course_id=c.id`
}

func sessionSelect() string {
	return `SELECT s.id,s.school_id,s.course_id,c.title,s.slug,s.title,s.starts_at,s.ends_at,s.timezone,s.location_mode,COALESCE(s.location_label,''),COALESCE(s.location_note,''),COALESCE(s.formatted_address,''),COALESCE(s.region_code,''),COALESCE(s.region_name,''),COALESCE(s.province_code,''),COALESCE(s.province_name,''),COALESCE(s.city_code,''),COALESCE(s.city_name,''),COALESCE(s.barangay_code,''),COALESCE(s.barangay_name,''),COALESCE(s.location_source,'manual'),COALESCE(s.dive_site_id::text,''),COALESCE(s.instructor_user_id::text,''),COALESCE(u.display_name,''),s.capacity,s.status,COALESCE(s.notes_markdown,''),s.created_at,s.updated_at,s.cancelled_at,s.completed_at,COUNT(b.id) FILTER (WHERE b.deleted_at IS NULL AND b.status IN ('pending_review','approved','scheduled'))::int FROM course_sessions s JOIN courses c ON c.id=s.course_id LEFT JOIN users u ON u.id=s.instructor_user_id LEFT JOIN course_booking_requests b ON b.session_id=s.id`
}

func bookingSelect() string {
	return `SELECT b.id,b.course_id,c.title,b.school_id,COALESCE(b.session_id::text,''),COALESCE(s.title,''),COALESCE(b.student_user_id::text,''),COALESCE(b.student_name,''),COALESCE(b.student_email,''),COALESCE(b.student_phone,''),b.booking_mode,COALESCE(b.preferred_date, DATE '0001-01-01'),b.alternate_date,b.status,COALESCE(b.student_note,''),COALESCE(b.experience_level,''),COALESCE(b.certification_level,''),COALESCE(b.equipment_needs,''),COALESCE(b.admin_notes,''),b.created_at,b.updated_at,b.reviewed_at,COALESCE(b.reviewed_by::text,''),b.scheduled_at,b.cancelled_at,b.completed_at,bp.id,COALESCE(bp.booking_id::text,''),COALESCE(bp.course_id::text,''),COALESCE(bp.school_id::text,''),COALESCE(bp.student_user_id::text,''),COALESCE(bp.payment_method_id::text,''),bp.amount::float8,COALESCE(bp.currency,''),COALESCE(bp.proof_media_id::text,''),COALESCE(bp.reference_number,''),COALESCE(bp.status,''),COALESCE(bp.reviewed_by::text,''),bp.reviewed_at,COALESCE(bp.review_notes,''),COALESCE(bp.created_at, TIMESTAMPTZ '0001-01-01 00:00:00+00'),COALESCE(bp.updated_at, TIMESTAMPTZ '0001-01-01 00:00:00+00') FROM course_booking_requests b JOIN courses c ON c.id=b.course_id LEFT JOIN course_sessions s ON s.id=b.session_id LEFT JOIN course_booking_payments bp ON bp.booking_id=b.id AND bp.deleted_at IS NULL`
}

func getSessionWithExecutor(ctx context.Context, exec queryExecutor, schoolID, idOrSlug string) (Session, error) {
	row := exec.QueryRow(ctx, sessionSelect()+" WHERE s.school_id=$1 AND s.deleted_at IS NULL AND (s.id::text=$2 OR s.slug=$2) GROUP BY s.id,c.title,u.display_name", schoolID, idOrSlug)
	return scanSession(row)
}

func getBookingWithExecutor(ctx context.Context, exec queryExecutor, schoolID, bookingID string) (Booking, error) {
	row := exec.QueryRow(ctx, bookingSelect()+" WHERE b.school_id=$1 AND b.deleted_at IS NULL AND b.id::text=$2", schoolID, bookingID)
	return scanBooking(row)
}

func ensureBookingPaymentWithExecutor(ctx context.Context, exec queryExecutor, bookingID string) error {
	_, err := exec.Exec(ctx, `INSERT INTO course_booking_payments (booking_id,course_id,school_id,student_user_id,amount,currency,status) SELECT b.id,b.course_id,b.school_id,b.student_user_id,c.price_amount,c.currency,CASE WHEN c.payment_required THEN 'pending_upload' ELSE 'not_required' END FROM course_booking_requests b JOIN courses c ON c.id=b.course_id WHERE b.id=$1 ON CONFLICT (booking_id) DO NOTHING`, bookingID)
	return err
}

func schoolSlugWithExecutor(ctx context.Context, exec queryExecutor, schoolID string) (string, error) {
	var slug string
	err := exec.QueryRow(ctx, `SELECT slug FROM schools WHERE id=$1 AND deleted_at IS NULL`, schoolID).Scan(&slug)
	return slug, err
}

func enqueueBookingOutbox(ctx context.Context, exec queryExecutor, item Booking, event BookingNotificationEvent) error {
	if event.EventType == "" {
		return nil
	}
	slug, err := schoolSlugWithExecutor(ctx, exec, item.SchoolID)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"bookingId":         item.ID,
		"schoolId":          item.SchoolID,
		"schoolSlug":        slug,
		"courseId":          item.CourseID,
		"courseTitle":       item.CourseTitle,
		"sessionId":         item.SessionID,
		"sessionTitle":      item.SessionTitle,
		"studentUserId":     item.StudentUserID,
		"studentName":       item.StudentName,
		"actorUserId":       event.ActorUserID,
		"status":            item.Status,
		"previousSessionId": event.PreviousSessionID,
	}
	keySuffix := event.IdempotencySuffix
	if keySuffix == "" {
		keySuffix = strings.ToLower(strings.ReplaceAll(event.EventType, "_", "-"))
	}
	_, err = notificationsrepo.EnqueueOutboxWithExecutor(ctx, exec, notificationsrepo.OutboxEnqueueInput{
		EventType:      event.EventType,
		AggregateType:  "course_booking",
		AggregateID:    item.ID,
		Payload:        payload,
		IdempotencyKey: "bookings:" + item.ID + ":" + keySuffix,
	})
	return err
}

func enqueueSessionOutbox(ctx context.Context, exec queryExecutor, item Session, event SessionNotificationEvent) error {
	if event.EventType == "" {
		return nil
	}
	slug, err := schoolSlugWithExecutor(ctx, exec, item.SchoolID)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"sessionId":        item.ID,
		"schoolId":         item.SchoolID,
		"schoolSlug":       slug,
		"courseId":         item.CourseID,
		"courseTitle":      item.CourseTitle,
		"title":            item.Title,
		"actorUserId":      event.ActorUserID,
		"status":           item.Status,
		"changeTypes":      event.ChangeTypes,
		"previousStatus":   event.PreviousStatus,
		"previousStartsAt": timeString(event.PreviousStartsAt),
		"previousEndsAt":   timeString(event.PreviousEndsAt),
	}
	keySuffix := event.IdempotencySuffix
	if keySuffix == "" {
		keySuffix = strings.ToLower(strings.ReplaceAll(event.EventType, "_", "-")) + ":" + item.UpdatedAt.UTC().Format("20060102150405.000000000")
	}
	_, err = notificationsrepo.EnqueueOutboxWithExecutor(ctx, exec, notificationsrepo.OutboxEnqueueInput{
		EventType:      event.EventType,
		AggregateType:  "course_session",
		AggregateID:    item.ID,
		Payload:        payload,
		IdempotencyKey: "sessions:" + item.ID + ":" + keySuffix,
	})
	return err
}

func timeString(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

type scanner interface{ Scan(dest ...any) error }

func schoolFields(alias string) string {
	diveName := "COALESCE(ds.name,'')"
	diveSlug := "COALESCE(ds.slug,'')"
	diveArea := "COALESCE(ds.area,'')"
	if alias == "schools" {
		diveName = "''"
		diveSlug = "''"
		diveArea = "''"
	}
	return fmt.Sprintf(`%s.id,%s.slug,%s.name,%s.short_description,%s.description_markdown,COALESCE(%s.logo_media_id::text,''),COALESCE((SELECT mo.object_key FROM media_objects mo WHERE mo.id = %s.logo_media_id),''),COALESCE(%s.cover_media_id::text,''),COALESCE((SELECT mo.object_key FROM media_objects mo WHERE mo.id = %s.cover_media_id),''),COALESCE(%s.base_location,''),COALESCE(%s.base_location_label,COALESCE(%s.base_location,'')),COALESCE(%s.formatted_address,''),COALESCE(%s.region_code,''),COALESCE(%s.region_name,''),COALESCE(%s.province_code,''),COALESCE(%s.province_name,''),COALESCE(%s.city_code,''),COALESCE(%s.city_name,''),COALESCE(%s.barangay_code,''),COALESCE(%s.barangay_name,''),COALESCE(%s.location_source,'manual'),COALESCE(%s.dive_site_id::text,''),%s,%s,%s,COALESCE(%s.contact_email,''),COALESCE(%s.contact_phone,''),COALESCE(%s.website_url,''),COALESCE(%s.facebook_url,''),COALESCE(%s.instagram_url,''),%s.status,%s.owner_user_id,%s.created_at,%s.updated_at`,
		alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, alias, diveName, diveSlug, diveArea, alias, alias, alias, alias, alias, alias, alias, alias, alias)
}

func scanSchool(s scanner) (School, error) {
	var item School
	err := scanSchoolInto(s, &item)
	return item, err
}

func scanSchoolInto(s scanner, item *School) error {
	return s.Scan(&item.ID, &item.Slug, &item.Name, &item.ShortDescription, &item.DescriptionMarkdown, &item.LogoMediaID, &item.LogoURL, &item.CoverMediaID, &item.CoverURL, &item.BaseLocation, &item.BaseLocationLabel, &item.FormattedAddress, &item.RegionCode, &item.RegionName, &item.ProvinceCode, &item.ProvinceName, &item.CityCode, &item.CityName, &item.BarangayCode, &item.BarangayName, &item.LocationSource, &item.DiveSiteID, &item.DiveSiteName, &item.DiveSiteSlug, &item.DiveSiteArea, &item.ContactEmail, &item.ContactPhone, &item.WebsiteURL, &item.FacebookURL, &item.InstagramURL, &item.Status, &item.OwnerUserID, &item.CreatedAt, &item.UpdatedAt, &item.CourseCount, &item.PublishedCourseCount, &item.PendingBookingCount, &item.UpcomingSessionCount, &item.PaymentsToReviewCount)
}
func scanCourse(s scanner) (Course, error) {
	var item Course
	err := s.Scan(&item.ID, &item.SchoolID, &item.Slug, &item.Title, &item.ShortDescription, &item.DescriptionMarkdown, &item.CourseType, &item.Level, &item.DurationLabel, &item.PriceAmount, &item.Currency, &item.PaymentRequired, &item.ApprovalRequired, &item.AllowSessionBooking, &item.AllowPreferredDateRequest, &item.LocationMode, &item.LocationLabel, &item.LocationNote, &item.FormattedAddress, &item.RegionCode, &item.RegionName, &item.ProvinceCode, &item.ProvinceName, &item.CityCode, &item.CityName, &item.BarangayCode, &item.BarangayName, &item.LocationSource, &item.DiveSiteID, &item.IncludedMarkdown, &item.PrerequisitesMarkdown, &item.EquipmentMarkdown, &item.CancellationPolicyMarkdown, &item.AvailabilityNote, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.UpcomingSessionCount, &item.PendingBookingCount)
	return item, err
}
func scanPaymentMethod(s scanner) (PaymentMethod, error) {
	var item PaymentMethod
	err := s.Scan(&item.ID, &item.SchoolID, &item.Type, &item.Name, &item.Instructions, &item.QRMediaID, &item.QRImageURL, &item.BankName, &item.AccountName, &item.AccountNumber, &item.IsActive, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}
func scanSession(s scanner) (Session, error) {
	var item Session
	err := s.Scan(&item.ID, &item.SchoolID, &item.CourseID, &item.CourseTitle, &item.Slug, &item.Title, &item.StartsAt, &item.EndsAt, &item.Timezone, &item.LocationMode, &item.LocationLabel, &item.LocationNote, &item.FormattedAddress, &item.RegionCode, &item.RegionName, &item.ProvinceCode, &item.ProvinceName, &item.CityCode, &item.CityName, &item.BarangayCode, &item.BarangayName, &item.LocationSource, &item.DiveSiteID, &item.InstructorUserID, &item.InstructorDisplayName, &item.Capacity, &item.Status, &item.NotesMarkdown, &item.CreatedAt, &item.UpdatedAt, &item.CancelledAt, &item.CompletedAt, &item.AssignedBookingCount)
	return item, err
}
func scanBooking(s scanner) (Booking, error) {
	var item Booking
	var payment BookingPayment
	var paymentID *string
	err := s.Scan(&item.ID, &item.CourseID, &item.CourseTitle, &item.SchoolID, &item.SessionID, &item.SessionTitle, &item.StudentUserID, &item.StudentName, &item.StudentEmail, &item.StudentPhone, &item.BookingMode, &item.PreferredDate, &item.AlternateDate, &item.Status, &item.StudentNote, &item.ExperienceLevel, &item.CertificationLevel, &item.EquipmentNeeds, &item.AdminNotes, &item.CreatedAt, &item.UpdatedAt, &item.ReviewedAt, &item.ReviewedBy, &item.ScheduledAt, &item.CancelledAt, &item.CompletedAt, &paymentID, &payment.BookingID, &payment.CourseID, &payment.SchoolID, &payment.StudentUserID, &payment.PaymentMethodID, &payment.Amount, &payment.Currency, &payment.ProofMediaID, &payment.ReferenceNumber, &payment.Status, &payment.ReviewedBy, &payment.ReviewedAt, &payment.ReviewNotes, &payment.CreatedAt, &payment.UpdatedAt)
	if err != nil {
		return item, err
	}
	if paymentID != nil {
		payment.ID = *paymentID
		item.Payment = &payment
	}
	return item, nil
}
func scanBookingPayment(s scanner) (BookingPayment, error) {
	var item BookingPayment
	err := s.Scan(&item.ID, &item.BookingID, &item.CourseID, &item.SchoolID, &item.StudentUserID, &item.PaymentMethodID, &item.Amount, &item.Currency, &item.ProofMediaID, &item.ReferenceNumber, &item.Status, &item.ReviewedBy, &item.ReviewedAt, &item.ReviewNotes, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}
func coalesceString(value *string, fallback string) string {
	if value == nil {
		return fallback
	}
	return *value
}

func defaultString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}
