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

	sharedslug "fphgo/internal/shared/slug"
)

var (
	ErrCapacityFull           = errors.New("event capacity full")
	ErrDuplicateParticipation = errors.New("event participation already exists")
	ErrNotJoinable            = errors.New("event is not joinable")
	ErrForbidden              = errors.New("forbidden")
	ErrSlugCollision          = errors.New("event slug collision")
)

type Repo struct {
	pool *pgxpool.Pool
}

type DiveSiteSummary struct {
	ID        string
	Slug      string
	Name      string
	Area      string
	Latitude  *float64
	Longitude *float64
}

type Event struct {
	ID                          string
	Slug                        string
	Title                       string
	Description                 string
	ShortDescription            string
	DescriptionMarkdown         string
	Location                    string
	LocationName                string
	FormattedAddress            string
	Latitude                    *float64
	Longitude                   *float64
	GooglePlaceID               string
	RegionCode                  string
	ProvinceCode                string
	CityCode                    string
	BarangayCode                string
	LocationSource              string
	StartsAt                    *time.Time
	EndsAt                      *time.Time
	Timezone                    string
	Status                      string
	Visibility                  string
	EventType                   string
	Difficulty                  string
	MaxAttendees                *int
	Capacity                    *int
	CurrentAttendees            int
	AvailableSlots              *int
	InterestedCount             int
	GoingCount                  int
	OrganizerUserID             string
	GroupID                     string
	DiveSiteID                  string
	DiveSite                    *DiveSiteSummary
	RequiresApproval            bool
	IsPaid                      bool
	PriceAmount                 *float64
	Currency                    string
	PaymentInstructions         string
	MeetingPoint                string
	BeginnerFriendly            bool
	MaxDepthM                   *int
	EntryType                   string
	EquipmentNotes              string
	SafetyNotes                 string
	CancellationPolicy          string
	PostsEnabled                bool
	PostCreatePolicy            string
	PublishedAt                 *time.Time
	CancelledAt                 *time.Time
	CancelReason                string
	CreatedAt                   time.Time
	UpdatedAt                   time.Time
	ViewerJoined                bool
	ViewerInterested            bool
	ViewerParticipationStatus   string
	ViewerEventState            string
	ViewerCanManage             bool
	ViewerCanViewPrivateDetails bool
	ViewerParticipation         *EventParticipant
	ViewerPayment               *EventParticipantPayment
	PaymentMethods              []EventPaymentMethod
}

type EventParticipant struct {
	ID                    string
	EventID               string
	UserID                string
	Role                  string
	Status                string
	ParticipantNote       string
	EmergencyContactName  string
	EmergencyContactPhone string
	CreatedAt             time.Time
	UpdatedAt             time.Time
	ApprovedAt            *time.Time
	ApprovedBy            string
	RejectedAt            *time.Time
	RejectedBy            string
	CancelledAt           *time.Time
	LeftAt                *time.Time
	DisplayName           string
	Username              string
	AvatarURL             string
	Payment               *EventParticipantPayment
}

type EventAttendee = EventParticipant

type EventPaymentMethod struct {
	ID            string
	EventID       string
	Type          string
	Name          string
	Instructions  string
	QRImageURL    string
	AccountName   string
	AccountNumber string
	BankName      string
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type EventParticipantPayment struct {
	ID                   string
	EventID              string
	EventParticipationID string
	UserID               string
	PaymentMethodID      string
	Amount               *float64
	Currency             string
	ProofMediaID         string
	ProofAttachmentURL   string
	ProofFileName        string
	ProofContentType     string
	ReferenceNumber      string
	Status               string
	ReviewedBy           string
	ReviewedAt           *time.Time
	ReviewNotes          string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type EventPaymentProof struct {
	PaymentID    string
	EventID      string
	UserID       string
	ProofMediaID string
	ObjectKey    string
	FileName     string
	ContentType  string
}

type ListEventsInput struct {
	ViewerUserID     string
	Search           string
	Status           string
	Page             int
	Limit            int
	GroupID          string
	DiveSiteID       string
	EventType        string
	Difficulty       string
	BeginnerFriendly *bool
	Price            string
}

type CreateEventInput struct {
	Title               string
	Description         string
	ShortDescription    string
	DescriptionMarkdown string
	Location            string
	LocationName        string
	FormattedAddress    string
	Latitude            *float64
	Longitude           *float64
	GooglePlaceID       string
	RegionCode          string
	ProvinceCode        string
	CityCode            string
	BarangayCode        string
	LocationSource      string
	StartsAt            *time.Time
	EndsAt              *time.Time
	Timezone            string
	Status              string
	Visibility          string
	EventType           string
	Difficulty          string
	MaxAttendees        *int
	Capacity            *int
	OrganizerUserID     string
	GroupID             *string
	DiveSiteID          string
	RequiresApproval    bool
	IsPaid              bool
	PriceAmount         *float64
	Currency            string
	PaymentInstructions string
	MeetingPoint        string
	BeginnerFriendly    bool
	MaxDepthM           *int
	EntryType           string
	EquipmentNotes      string
	SafetyNotes         string
	CancellationPolicy  string
	PaymentMethods      []CreatePaymentMethodInput
}

type UpdateEventInput struct {
	EventID             string
	Title               *string
	Description         *string
	ShortDescription    *string
	DescriptionMarkdown *string
	StartsAt            *time.Time
	EndsAt              *time.Time
	Timezone            *string
	Status              *string
	Visibility          *string
	EventType           *string
	Difficulty          *string
	Capacity            *int
	DiveSiteID          *string
	RequiresApproval    *bool
	IsPaid              *bool
	PriceAmount         *float64
	Currency            *string
	PaymentInstructions *string
	MeetingPoint        *string
	BeginnerFriendly    *bool
	MaxDepthM           *int
	EntryType           *string
	EquipmentNotes      *string
	SafetyNotes         *string
	CancellationPolicy  *string
	PostsEnabled        *bool
	PostCreatePolicy    *string
	CancelReason        *string
}

type CreatePaymentMethodInput struct {
	Type          string
	Name          string
	Instructions  string
	QRImageURL    string
	AccountName   string
	AccountNumber string
	BankName      string
	IsActive      bool
}

type UpdatePaymentMethodInput struct {
	PaymentMethodID string
	Type            *string
	Name            *string
	Instructions    *string
	QRImageURL      *string
	AccountName     *string
	AccountNumber   *string
	BankName        *string
	IsActive        *bool
}

type JoinEventInput struct {
	EventID         string
	UserID          string
	Status          string
	ParticipantNote string
}

type SubmitPaymentInput struct {
	EventID            string
	UserID             string
	PaymentMethodID    string
	ProofMediaID       string
	ProofAttachmentURL string
	ReferenceNumber    string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

func (r *Repo) ListEvents(ctx context.Context, input ListEventsInput) ([]Event, int, error) {
	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []any{strings.TrimSpace(input.ViewerUserID)}
	where := []string{}
	idx := 2

	if value := strings.TrimSpace(input.Search); value != "" {
		args = append(args, "%"+strings.ToLower(value)+"%")
		where = append(where, fmt.Sprintf(`(
			lower(e.title) LIKE $%d OR
			lower(coalesce(e.short_description, '')) LIKE $%d OR
			lower(coalesce(e.description_markdown, e.description, '')) LIKE $%d OR
			lower(coalesce(ds.name, '')) LIKE $%d OR
			lower(coalesce(ds.area, '')) LIKE $%d
		)`, idx, idx, idx, idx, idx))
		idx++
	}
	if value := strings.TrimSpace(input.Status); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.status = $%d", idx))
		idx++
	} else {
		where = append(where, "e.status = 'published'")
	}
	if value := strings.TrimSpace(input.GroupID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.group_id = $%d::uuid", idx))
		idx++
	}
	if value := strings.TrimSpace(input.DiveSiteID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.dive_site_id = $%d::uuid", idx))
		idx++
	}
	if value := strings.TrimSpace(input.EventType); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.event_type = $%d", idx))
		idx++
	}
	if value := strings.TrimSpace(input.Difficulty); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("e.difficulty = $%d", idx))
		idx++
	}
	if input.BeginnerFriendly != nil {
		args = append(args, *input.BeginnerFriendly)
		where = append(where, fmt.Sprintf("e.beginner_friendly = $%d", idx))
		idx++
	}
	switch strings.TrimSpace(input.Price) {
	case "free":
		where = append(where, "e.is_paid = FALSE")
	case "paid":
		where = append(where, "e.is_paid = TRUE")
	}
	args = append(args, limit, offset)
	limitArg := idx
	offsetArg := idx + 1

	q := fmt.Sprintf(`
		SELECT %s,
			COUNT(*) OVER()::int AS total_count
		FROM events e
		LEFT JOIN dive_sites ds ON ds.id = e.dive_site_id
		LEFT JOIN event_participations vp
			ON vp.event_id = e.id AND vp.user_id = NULLIF($1, '')::uuid
		LEFT JOIN event_interests vei
			ON vei.event_id = e.id AND vei.user_id = NULLIF($1, '')::uuid AND vei.deleted_at IS NULL
		LEFT JOIN event_participant_payments vpay
			ON vpay.event_participation_id = vp.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, eventSelectColumns(), strings.Join(where, " AND "), eventListOrderByClause(), limitArg, offsetArg)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]Event, 0)
	total := 0
	for rows.Next() {
		var item Event
		if err := scanEvent(rows, &item, &total); err != nil {
			return nil, 0, err
		}
		item.PaymentMethods = nil
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func eventListOrderByClause() string {
	return "e.created_at DESC, e.id DESC"
}

func (r *Repo) GetEventByID(ctx context.Context, eventID, viewerUserID string) (Event, error) {
	q := fmt.Sprintf(`
			SELECT %s
			FROM events e
			LEFT JOIN dive_sites ds ON ds.id = e.dive_site_id
			LEFT JOIN event_participations vp
				ON vp.event_id = e.id AND vp.user_id = NULLIF($1, '')::uuid
			LEFT JOIN event_interests vei
				ON vei.event_id = e.id AND vei.user_id = NULLIF($1, '')::uuid AND vei.deleted_at IS NULL
			LEFT JOIN event_participant_payments vpay
				ON vpay.event_participation_id = vp.id
			WHERE e.id = $2::uuid
		`, eventSelectColumns())
	var item Event
	if err := scanEvent(r.pool.QueryRow(ctx, q, strings.TrimSpace(viewerUserID), eventID), &item, nil); err != nil {
		return Event{}, err
	}
	methods, err := r.ListPaymentMethods(ctx, item.ID, false)
	if err != nil {
		return Event{}, err
	}
	item.PaymentMethods = methods
	return item, nil
}

func (r *Repo) GetEventBySlug(ctx context.Context, slugValue, viewerUserID string) (Event, error) {
	q := fmt.Sprintf(`
			SELECT %s
			FROM events e
			LEFT JOIN dive_sites ds ON ds.id = e.dive_site_id
			LEFT JOIN event_participations vp
				ON vp.event_id = e.id AND vp.user_id = NULLIF($1, '')::uuid
			LEFT JOIN event_interests vei
				ON vei.event_id = e.id AND vei.user_id = NULLIF($1, '')::uuid AND vei.deleted_at IS NULL
			LEFT JOIN event_participant_payments vpay
				ON vpay.event_participation_id = vp.id
			WHERE e.slug = $2
		`, eventSelectColumns())
	var item Event
	if err := scanEvent(r.pool.QueryRow(ctx, q, strings.TrimSpace(viewerUserID), strings.TrimSpace(slugValue)), &item, nil); err != nil {
		return Event{}, err
	}
	methods, err := r.ListPaymentMethods(ctx, item.ID, false)
	if err != nil {
		return Event{}, err
	}
	item.PaymentMethods = methods
	return item, nil
}

func (r *Repo) CreateEvent(ctx context.Context, input CreateEventInput) (Event, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Event{}, err
	}
	defer rollbackTx(ctx, tx)

	site, err := getDiveSiteForEvent(ctx, tx, input.DiveSiteID)
	if err != nil {
		return Event{}, err
	}

	baseSlug := sharedslug.Make(input.Title, "event")
	slug := uniqueSlug(ctx, tx, baseSlug)

	var groupID any
	if input.GroupID != nil && strings.TrimSpace(*input.GroupID) != "" {
		groupID = strings.TrimSpace(*input.GroupID)
	}
	capacity := input.Capacity
	if capacity == nil {
		capacity = input.MaxAttendees
	}

	const q = `
		INSERT INTO events (
			slug, title, description, short_description, description_markdown,
			location, location_name, formatted_address, latitude, longitude, google_place_id,
			region_code, province_code, city_municipality_code, barangay_code, location_source,
			starts_at, ends_at, timezone, status, visibility, event_type, difficulty,
			max_attendees, capacity, organizer_user_id, group_id, dive_site_id,
			requires_approval, is_paid, price_amount, currency, payment_instructions,
			meeting_point, beginner_friendly, max_depth_m, entry_type, equipment_notes,
			safety_notes, cancellation_policy, published_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, nullif($11, ''),
			nullif($12, ''), nullif($13, ''), nullif($14, ''), nullif($15, ''), $16,
			$17, $18, $19, $20, $21, $22, $23,
			$24, $25, $26::uuid, $27::uuid, $28::uuid,
			$29, $30, $31, $32, nullif($33, ''),
			nullif($34, ''), $35, $36, nullif($37, ''), nullif($38, ''),
			nullif($39, ''), nullif($40, ''), CASE WHEN $20 = 'published' THEN NOW() ELSE NULL END
		)
		RETURNING id::text
	`
	var eventID string
	for attempt := 0; attempt < 8; attempt++ {
		savepoint := fmt.Sprintf("event_slug_attempt_%d", attempt)
		if _, err := tx.Exec(ctx, "SAVEPOINT "+savepoint); err != nil {
			return Event{}, err
		}
		err := tx.QueryRow(ctx, q,
			slug,
			input.Title,
			input.Description,
			input.ShortDescription,
			input.DescriptionMarkdown,
			site.Area,
			site.Name,
			site.Area,
			site.Latitude,
			site.Longitude,
			input.GooglePlaceID,
			input.RegionCode,
			input.ProvinceCode,
			input.CityCode,
			input.BarangayCode,
			input.LocationSource,
			input.StartsAt,
			input.EndsAt,
			input.Timezone,
			input.Status,
			input.Visibility,
			input.EventType,
			input.Difficulty,
			capacity,
			capacity,
			input.OrganizerUserID,
			groupID,
			input.DiveSiteID,
			input.RequiresApproval,
			input.IsPaid,
			input.PriceAmount,
			input.Currency,
			input.PaymentInstructions,
			input.MeetingPoint,
			input.BeginnerFriendly,
			input.MaxDepthM,
			input.EntryType,
			input.EquipmentNotes,
			input.SafetyNotes,
			input.CancellationPolicy,
		).Scan(&eventID)
		if err == nil {
			if _, err := tx.Exec(ctx, "RELEASE SAVEPOINT "+savepoint); err != nil {
				return Event{}, err
			}
			break
		}
		if !isUniqueViolation(err) {
			return Event{}, err
		}
		if _, rollbackErr := tx.Exec(ctx, "ROLLBACK TO SAVEPOINT "+savepoint); rollbackErr != nil {
			return Event{}, rollbackErr
		}
		slug = uniqueSlug(ctx, tx, fmt.Sprintf("%s-%d", baseSlug, attempt+2))
	}
	if eventID == "" {
		return Event{}, ErrSlugCollision
	}

	if err := addOrganizerRecords(ctx, tx, eventID, input.OrganizerUserID); err != nil {
		return Event{}, err
	}
	for _, method := range input.PaymentMethods {
		if _, err := insertPaymentMethod(ctx, tx, eventID, method); err != nil {
			return Event{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Event{}, err
	}
	return r.GetEventByID(ctx, eventID, input.OrganizerUserID)
}

func (r *Repo) AddOrganizerMembership(ctx context.Context, eventID, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)
	if err := addOrganizerRecords(ctx, tx, eventID, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) UpdateEvent(ctx context.Context, input UpdateEventInput) (Event, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addString := func(column string, value *string, nullEmpty bool) {
		if value == nil {
			return
		}
		args = append(args, strings.TrimSpace(*value))
		if nullEmpty {
			set = append(set, fmt.Sprintf("%s = nullif($%d, '')", column, idx))
		} else {
			set = append(set, fmt.Sprintf("%s = $%d", column, idx))
		}
		idx++
	}
	addTime := func(column string, value *time.Time) {
		if value == nil {
			return
		}
		args = append(args, *value)
		set = append(set, fmt.Sprintf("%s = $%d", column, idx))
		idx++
	}
	addInt := func(column string, value *int) {
		if value == nil {
			return
		}
		args = append(args, *value)
		set = append(set, fmt.Sprintf("%s = $%d", column, idx))
		idx++
	}
	addBool := func(column string, value *bool) {
		if value == nil {
			return
		}
		args = append(args, *value)
		set = append(set, fmt.Sprintf("%s = $%d", column, idx))
		idx++
	}
	addFloat := func(column string, value *float64) {
		if value == nil {
			return
		}
		args = append(args, *value)
		set = append(set, fmt.Sprintf("%s = $%d", column, idx))
		idx++
	}

	addString("title", input.Title, false)
	addString("description", input.Description, false)
	addString("short_description", input.ShortDescription, false)
	addString("description_markdown", input.DescriptionMarkdown, false)
	addTime("starts_at", input.StartsAt)
	addTime("ends_at", input.EndsAt)
	addString("timezone", input.Timezone, false)
	if input.Status != nil {
		args = append(args, strings.TrimSpace(*input.Status))
		set = append(set, fmt.Sprintf("status = $%d", idx))
		if strings.TrimSpace(*input.Status) == "published" {
			set = append(set, "published_at = COALESCE(published_at, NOW())")
		}
		if strings.TrimSpace(*input.Status) == "cancelled" {
			set = append(set, "cancelled_at = COALESCE(cancelled_at, NOW())")
		}
		idx++
	}
	addString("visibility", input.Visibility, false)
	addString("event_type", input.EventType, false)
	addString("difficulty", input.Difficulty, false)
	addInt("capacity", input.Capacity)
	if input.Capacity != nil {
		set = append(set, fmt.Sprintf("max_attendees = $%d", idx-1))
	}
	if input.DiveSiteID != nil {
		args = append(args, strings.TrimSpace(*input.DiveSiteID))
		set = append(set, fmt.Sprintf("dive_site_id = $%d::uuid", idx))
		idx++
	}
	addBool("requires_approval", input.RequiresApproval)
	addBool("is_paid", input.IsPaid)
	isSwitchingToFree := input.IsPaid != nil && !*input.IsPaid
	if isSwitchingToFree {
		set = append(set, "price_amount = NULL", "payment_instructions = NULL")
	}
	addFloat("price_amount", input.PriceAmount)
	addString("currency", input.Currency, false)
	if !isSwitchingToFree {
		addString("payment_instructions", input.PaymentInstructions, true)
	}
	addString("meeting_point", input.MeetingPoint, true)
	addBool("beginner_friendly", input.BeginnerFriendly)
	addInt("max_depth_m", input.MaxDepthM)
	addString("entry_type", input.EntryType, true)
	addString("equipment_notes", input.EquipmentNotes, true)
	addString("safety_notes", input.SafetyNotes, true)
	addString("cancellation_policy", input.CancellationPolicy, true)
	addBool("posts_enabled", input.PostsEnabled)
	addString("post_create_policy", input.PostCreatePolicy, false)
	addString("cancel_reason", input.CancelReason, true)

	args = append(args, input.EventID)
	q := fmt.Sprintf("UPDATE events SET %s WHERE id = $%d::uuid RETURNING id::text", strings.Join(set, ", "), idx)
	var eventID string
	if err := r.pool.QueryRow(ctx, q, args...).Scan(&eventID); err != nil {
		return Event{}, err
	}
	return r.GetEventByID(ctx, eventID, "")
}

func (r *Repo) GetGroupRole(ctx context.Context, groupID, userID string) (string, error) {
	const q = `
		SELECT role
		FROM group_memberships
		WHERE group_id = $1::uuid AND user_id = $2::uuid AND status = 'active'
	`
	var role string
	if err := r.pool.QueryRow(ctx, q, groupID, userID).Scan(&role); err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return role, nil
}

func (r *Repo) CanManageEvent(ctx context.Context, eventID, userID string) (bool, error) {
	const q = `
		SELECT EXISTS(
			SELECT 1
			FROM events e
			LEFT JOIN event_participations ep
				ON ep.event_id = e.id
				AND ep.user_id = $2::uuid
				AND ep.role IN ('organizer', 'staff')
				AND ep.status IN ('confirmed', 'pending_approval')
			WHERE e.id = $1::uuid
				AND (
					ep.id IS NOT NULL
					OR (
						e.organizer_user_id = $2::uuid
						AND NOT EXISTS (
							SELECT 1
							FROM event_participations owner_ep
							WHERE owner_ep.event_id = e.id
								AND owner_ep.user_id = $2::uuid
						)
					)
				)
		)
	`
	var ok bool
	if err := r.pool.QueryRow(ctx, q, eventID, userID).Scan(&ok); err != nil {
		return false, err
	}
	return ok, nil
}

func (r *Repo) UpsertAttendee(ctx context.Context, eventID, userID, role, status, notes string) (EventAttendee, error) {
	participantStatus := "pending_approval"
	if status == "active" {
		participantStatus = "confirmed"
	}
	return r.JoinEvent(ctx, JoinEventInput{
		EventID:         eventID,
		UserID:          userID,
		Status:          participantStatus,
		ParticipantNote: notes,
	})
}

func (r *Repo) MarkEventInterested(ctx context.Context, eventID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO event_interests (
			event_id, user_id, created_at, updated_at, deleted_at
		) VALUES (
			$1::uuid, $2::uuid, NOW(), NOW(), NULL
		)
		ON CONFLICT (event_id, user_id)
		DO UPDATE SET deleted_at = NULL, updated_at = NOW()
	`, eventID, userID)
	return err
}

func (r *Repo) MarkEventUninterested(ctx context.Context, eventID, userID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE event_interests
		SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid
	`, eventID, userID)
	return err
}

func (r *Repo) JoinEvent(ctx context.Context, input JoinEventInput) (EventParticipant, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return EventParticipant{}, err
	}
	defer rollbackTx(ctx, tx)

	var status string
	var capacity *int
	var isPaid bool
	if err := tx.QueryRow(ctx, `
		SELECT status, capacity, is_paid
		FROM events
		WHERE id = $1::uuid
		FOR UPDATE
	`, input.EventID).Scan(&status, &capacity, &isPaid); err != nil {
		return EventParticipant{}, err
	}
	if status != "published" {
		return EventParticipant{}, ErrNotJoinable
	}
	if input.Status == "confirmed" {
		if err := assertCapacity(ctx, tx, input.EventID, capacity); err != nil {
			return EventParticipant{}, err
		}
	}

	const insertParticipation = `
		INSERT INTO event_participations (
			event_id, user_id, role, status, participant_note, approved_at, approved_by
		) VALUES (
			$1::uuid, $2::uuid, 'participant', $3, nullif($4, ''),
			CASE WHEN $3 = 'confirmed' THEN NOW() ELSE NULL END,
			CASE WHEN $3 = 'confirmed' THEN $2::uuid ELSE NULL END
		)
		RETURNING id::text, event_id::text, user_id::text, role, status, coalesce(participant_note, ''),
			coalesce(emergency_contact_name, ''), coalesce(emergency_contact_phone, ''),
			created_at, updated_at, approved_at, coalesce(approved_by::text, ''),
			rejected_at, coalesce(rejected_by::text, ''), cancelled_at, left_at
	`
	var participant EventParticipant
	if err := tx.QueryRow(ctx, insertParticipation, input.EventID, input.UserID, input.Status, input.ParticipantNote).Scan(
		&participant.ID,
		&participant.EventID,
		&participant.UserID,
		&participant.Role,
		&participant.Status,
		&participant.ParticipantNote,
		&participant.EmergencyContactName,
		&participant.EmergencyContactPhone,
		&participant.CreatedAt,
		&participant.UpdatedAt,
		&participant.ApprovedAt,
		&participant.ApprovedBy,
		&participant.RejectedAt,
		&participant.RejectedBy,
		&participant.CancelledAt,
		&participant.LeftAt,
	); err != nil {
		if isUniqueViolation(err) {
			return EventParticipant{}, ErrDuplicateParticipation
		}
		return EventParticipant{}, err
	}

	membershipStatus := "invited"
	if input.Status == "confirmed" {
		membershipStatus = "active"
	}
	if err := upsertMembership(ctx, tx, input.EventID, input.UserID, "attendee", membershipStatus, input.ParticipantNote); err != nil {
		return EventParticipant{}, err
	}
	if err := clearEventInterest(ctx, tx, input.EventID, input.UserID); err != nil {
		return EventParticipant{}, err
	}

	paymentStatus := "not_required"
	if isPaid {
		paymentStatus = "pending_upload"
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_participant_payments (
			event_id, event_participation_id, user_id, status
		) VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
	`, input.EventID, participant.ID, input.UserID, paymentStatus); err != nil {
		return EventParticipant{}, err
	}
	if err := refreshCurrentAttendees(ctx, tx, input.EventID); err != nil {
		return EventParticipant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return EventParticipant{}, err
	}
	return r.GetParticipant(ctx, participant.EventID, participant.UserID)
}

func (r *Repo) LeaveEvent(ctx context.Context, eventID, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)
	res, err := tx.Exec(ctx, `
		UPDATE event_participations
		SET status = 'left', left_at = NOW(), updated_at = NOW()
		WHERE event_id = $1::uuid
			AND user_id = $2::uuid
			AND status IN ('pending_approval', 'confirmed')
			AND role <> 'organizer'
	`, eventID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	if _, err := tx.Exec(ctx, `
		UPDATE event_memberships
		SET status = 'left', left_at = NOW(), updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid
	`, eventID, userID); err != nil {
		return err
	}
	if err := refreshCurrentAttendees(ctx, tx, eventID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repo) GetAttendee(ctx context.Context, eventID, userID string) (EventAttendee, error) {
	return r.GetParticipant(ctx, eventID, userID)
}

func (r *Repo) GetParticipant(ctx context.Context, eventID, userID string) (EventParticipant, error) {
	rows, total, err := r.ListParticipants(ctx, eventID, ListParticipantsInput{
		ViewerUserID:   userID,
		Limit:          1,
		UserID:         userID,
		IncludeAll:     true,
		IncludePayment: true,
	})
	if err != nil {
		return EventParticipant{}, err
	}
	if total == 0 || len(rows) == 0 {
		return EventParticipant{}, pgx.ErrNoRows
	}
	return rows[0], nil
}

type ListParticipantsInput struct {
	ViewerUserID   string
	Page           int
	Limit          int
	UserID         string
	IncludeAll     bool
	IncludePayment bool
}

func (r *Repo) ListAttendees(ctx context.Context, eventID string, page, limit int) ([]EventAttendee, int, error) {
	return r.ListParticipants(ctx, eventID, ListParticipantsInput{Page: page, Limit: limit})
}

func (r *Repo) ListParticipants(ctx context.Context, eventID string, input ListParticipantsInput) ([]EventParticipant, int, error) {
	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit
	args := []any{eventID}
	where := []string{"ep.event_id = $1::uuid"}
	idx := 2
	if !input.IncludeAll {
		where = append(where, "ep.status = 'confirmed'")
	}
	if value := strings.TrimSpace(input.UserID); value != "" {
		args = append(args, value)
		where = append(where, fmt.Sprintf("ep.user_id = $%d::uuid", idx))
		idx++
	}
	args = append(args, limit, offset)
	limitArg := idx
	offsetArg := idx + 1

	q := fmt.Sprintf(`
		SELECT %s,
			COUNT(*) OVER()::int AS total_count
		FROM event_participations ep
		LEFT JOIN users u ON u.id = ep.user_id
		LEFT JOIN profiles p ON p.user_id = ep.user_id
		LEFT JOIN event_participant_payments pay ON pay.event_participation_id = ep.id
		WHERE %s
		ORDER BY ep.created_at DESC, ep.id DESC
		LIMIT $%d OFFSET $%d
	`, participantSelectColumns(), strings.Join(where, " AND "), limitArg, offsetArg)

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]EventParticipant, 0)
	total := 0
	for rows.Next() {
		var item EventParticipant
		if err := scanParticipant(rows, &item, &total); err != nil {
			return nil, 0, err
		}
		if !input.IncludePayment {
			item.Payment = nil
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) ApproveParticipant(ctx context.Context, eventID, participantID, actorID string) (EventParticipant, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return EventParticipant{}, err
	}
	defer rollbackTx(ctx, tx)
	var capacity *int
	if err := tx.QueryRow(ctx, `SELECT capacity FROM events WHERE id = $1::uuid FOR UPDATE`, eventID).Scan(&capacity); err != nil {
		return EventParticipant{}, err
	}
	if err := assertCapacity(ctx, tx, eventID, capacity); err != nil {
		return EventParticipant{}, err
	}
	var userID string
	if err := tx.QueryRow(ctx, `
		UPDATE event_participations
		SET status = 'confirmed', approved_at = NOW(), approved_by = $3::uuid,
			rejected_at = NULL, rejected_by = NULL, updated_at = NOW()
		WHERE id = $1::uuid AND event_id = $2::uuid AND status = 'pending_approval'
		RETURNING user_id::text
	`, participantID, eventID, actorID).Scan(&userID); err != nil {
		return EventParticipant{}, err
	}
	if err := upsertMembership(ctx, tx, eventID, userID, "attendee", "active", ""); err != nil {
		return EventParticipant{}, err
	}
	if err := clearEventInterest(ctx, tx, eventID, userID); err != nil {
		return EventParticipant{}, err
	}
	if err := refreshCurrentAttendees(ctx, tx, eventID); err != nil {
		return EventParticipant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return EventParticipant{}, err
	}
	return r.GetParticipant(ctx, eventID, userID)
}

func (r *Repo) RejectParticipant(ctx context.Context, eventID, participantID, actorID string) (EventParticipant, error) {
	var userID string
	if err := r.pool.QueryRow(ctx, `
		UPDATE event_participations
		SET status = 'rejected', rejected_at = NOW(), rejected_by = $3::uuid,
			approved_at = NULL, approved_by = NULL, updated_at = NOW()
		WHERE id = $1::uuid AND event_id = $2::uuid
			AND status IN ('pending_approval', 'confirmed')
			AND role <> 'organizer'
		RETURNING user_id::text
	`, participantID, eventID, actorID).Scan(&userID); err != nil {
		return EventParticipant{}, err
	}
	_, _ = r.pool.Exec(ctx, `
		UPDATE event_memberships
		SET status = 'cancelled', updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid
	`, eventID, userID)
	_, _ = r.pool.Exec(ctx, `
		UPDATE events
		SET current_attendees = (
			SELECT COUNT(*)::int
			FROM event_participations ep
			WHERE ep.event_id = $1::uuid AND ep.status = 'confirmed' AND ep.role = 'participant'
		), updated_at = NOW()
		WHERE id = $1::uuid
	`, eventID)
	return r.GetParticipant(ctx, eventID, userID)
}

func (r *Repo) ListPaymentMethods(ctx context.Context, eventID string, activeOnly bool) ([]EventPaymentMethod, error) {
	where := "event_id = $1::uuid"
	if activeOnly {
		where += " AND is_active = TRUE"
	}
	q := fmt.Sprintf(`
		SELECT id::text, event_id::text, type, name, coalesce(instructions, ''),
			coalesce(qr_image_url, ''), coalesce(account_name, ''), coalesce(account_number, ''),
			coalesce(bank_name, ''), is_active, created_at, updated_at
		FROM event_payment_methods
		WHERE %s
		ORDER BY created_at ASC, id ASC
	`, where)
	rows, err := r.pool.Query(ctx, q, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]EventPaymentMethod, 0)
	for rows.Next() {
		var item EventPaymentMethod
		if err := scanPaymentMethod(rows, &item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreatePaymentMethod(ctx context.Context, eventID string, input CreatePaymentMethodInput) (EventPaymentMethod, error) {
	return insertPaymentMethod(ctx, r.pool, eventID, input)
}

func (r *Repo) UpdatePaymentMethod(ctx context.Context, eventID string, input UpdatePaymentMethodInput) (EventPaymentMethod, error) {
	set := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1
	addString := func(column string, value *string) {
		if value == nil {
			return
		}
		args = append(args, strings.TrimSpace(*value))
		set = append(set, fmt.Sprintf("%s = nullif($%d, '')", column, idx))
		idx++
	}
	addString("type", input.Type)
	addString("name", input.Name)
	addString("instructions", input.Instructions)
	addString("qr_image_url", input.QRImageURL)
	addString("account_name", input.AccountName)
	addString("account_number", input.AccountNumber)
	addString("bank_name", input.BankName)
	if input.IsActive != nil {
		args = append(args, *input.IsActive)
		set = append(set, fmt.Sprintf("is_active = $%d", idx))
		idx++
	}
	args = append(args, input.PaymentMethodID, eventID)
	q := fmt.Sprintf(`
		UPDATE event_payment_methods
		SET %s
		WHERE id = $%d::uuid AND event_id = $%d::uuid
		RETURNING id::text, event_id::text, type, name, coalesce(instructions, ''),
			coalesce(qr_image_url, ''), coalesce(account_name, ''), coalesce(account_number, ''),
			coalesce(bank_name, ''), is_active, created_at, updated_at
	`, strings.Join(set, ", "), idx, idx+1)
	var item EventPaymentMethod
	if err := scanPaymentMethod(r.pool.QueryRow(ctx, q, args...), &item); err != nil {
		return EventPaymentMethod{}, err
	}
	return item, nil
}

func (r *Repo) SubmitPayment(ctx context.Context, input SubmitPaymentInput) (EventParticipantPayment, error) {
	const q = `
		WITH proof AS (
			SELECT object_key
			FROM media_objects
			WHERE id = $4::uuid
				AND owner_app_user_id = $2::uuid
				AND context_type = 'event_attachment'
				AND context_id = $1::uuid
				AND state = 'active'
		)
		UPDATE event_participant_payments pay
		SET payment_method_id = $3::uuid,
			proof_media_id = $4::uuid,
			proof_attachment_url = (SELECT object_key FROM proof),
			reference_number = NULLIF($5, ''),
			status = 'submitted',
			updated_at = NOW()
		FROM event_participations ep
		WHERE pay.event_participation_id = ep.id
			AND pay.event_id = $1::uuid
			AND pay.user_id = $2::uuid
			AND ep.status IN ('pending_approval', 'confirmed')
			AND EXISTS (
				SELECT 1 FROM event_payment_methods pm
				WHERE pm.id = $3::uuid AND pm.event_id = $1::uuid AND pm.is_active = TRUE
			)
			AND EXISTS (SELECT 1 FROM proof)
		RETURNING pay.id::text, pay.event_id::text, pay.event_participation_id::text, pay.user_id::text,
			coalesce(pay.payment_method_id::text, ''), pay.amount::float8, pay.currency,
			coalesce(pay.proof_media_id::text, ''), coalesce(pay.proof_attachment_url, ''),
			coalesce((SELECT regexp_replace(mo.object_key, '^.*/', '') FROM media_objects mo WHERE mo.id = pay.proof_media_id), ''),
			coalesce((SELECT mo.mime_type FROM media_objects mo WHERE mo.id = pay.proof_media_id), ''),
			coalesce(pay.reference_number, ''), pay.status, coalesce(pay.reviewed_by::text, ''),
			pay.reviewed_at, coalesce(pay.review_notes, ''), pay.created_at, pay.updated_at
	`
	var item EventParticipantPayment
	if err := scanPayment(r.pool.QueryRow(ctx, q,
		input.EventID,
		input.UserID,
		input.PaymentMethodID,
		input.ProofMediaID,
		input.ReferenceNumber,
	), &item); err != nil {
		return EventParticipantPayment{}, err
	}
	return item, nil
}

func (r *Repo) ReviewPayment(ctx context.Context, eventID, paymentID, actorID, status, notes string) (EventParticipantPayment, error) {
	const q = `
		UPDATE event_participant_payments
		SET status = $4,
			reviewed_by = $3::uuid,
			reviewed_at = NOW(),
			review_notes = NULLIF($5, ''),
			updated_at = NOW()
		WHERE id = $1::uuid AND event_id = $2::uuid AND status IN ('submitted', 'rejected', 'verified')
		RETURNING id::text, event_id::text, event_participation_id::text, user_id::text,
			coalesce(payment_method_id::text, ''), amount::float8, currency,
			coalesce(proof_media_id::text, ''), coalesce(proof_attachment_url, ''),
			coalesce((SELECT regexp_replace(mo.object_key, '^.*/', '') FROM media_objects mo WHERE mo.id = event_participant_payments.proof_media_id), ''),
			coalesce((SELECT mo.mime_type FROM media_objects mo WHERE mo.id = event_participant_payments.proof_media_id), ''),
			coalesce(reference_number, ''), status, coalesce(reviewed_by::text, ''),
			reviewed_at, coalesce(review_notes, ''), created_at, updated_at
	`
	var item EventParticipantPayment
	if err := scanPayment(r.pool.QueryRow(ctx, q, paymentID, eventID, actorID, status, notes), &item); err != nil {
		return EventParticipantPayment{}, err
	}
	return item, nil
}

func (r *Repo) GetPaymentProof(ctx context.Context, eventID, paymentID string) (EventPaymentProof, error) {
	const q = `
		SELECT pay.id::text, pay.event_id::text, pay.user_id::text,
			coalesce(pay.proof_media_id::text, ''), mo.object_key,
			regexp_replace(mo.object_key, '^.*/', ''), mo.mime_type
		FROM event_participant_payments pay
		JOIN media_objects mo ON mo.id = pay.proof_media_id
		WHERE pay.id = $2::uuid
			AND pay.event_id = $1::uuid
			AND mo.context_type = 'event_attachment'
			AND mo.context_id = pay.event_id
			AND mo.state = 'active'
	`
	var item EventPaymentProof
	if err := r.pool.QueryRow(ctx, q, eventID, paymentID).Scan(
		&item.PaymentID,
		&item.EventID,
		&item.UserID,
		&item.ProofMediaID,
		&item.ObjectKey,
		&item.FileName,
		&item.ContentType,
	); err != nil {
		return EventPaymentProof{}, err
	}
	return item, nil
}

func IsNoRows(err error) bool {
	return err == pgx.ErrNoRows
}

func IsCapacityFull(err error) bool {
	return errors.Is(err, ErrCapacityFull)
}

func IsDuplicateParticipation(err error) bool {
	return errors.Is(err, ErrDuplicateParticipation)
}

func IsNotJoinable(err error) bool {
	return errors.Is(err, ErrNotJoinable)
}

func IsForbidden(err error) bool {
	return errors.Is(err, ErrForbidden)
}

func IsSlugCollision(err error) bool {
	return errors.Is(err, ErrSlugCollision)
}

func eventSelectColumns() string {
	return `
		e.id::text,
		coalesce(e.slug, ''),
		e.title,
		coalesce(e.description, ''),
		coalesce(e.short_description, ''),
		coalesce(e.description_markdown, ''),
		coalesce(e.location, ''),
		coalesce(e.location_name, ''),
		coalesce(e.formatted_address, ''),
		e.latitude,
		e.longitude,
		coalesce(e.google_place_id, ''),
		coalesce(e.region_code, ''),
		coalesce(e.province_code, ''),
		coalesce(e.city_municipality_code, ''),
		coalesce(e.barangay_code, ''),
		coalesce(e.location_source, 'manual'),
		e.starts_at,
		e.ends_at,
		coalesce(e.timezone, 'Asia/Manila'),
		e.status,
		e.visibility,
		e.event_type,
		e.difficulty,
		e.max_attendees,
		e.capacity,
		coalesce((SELECT COUNT(*) FROM event_participations epc WHERE epc.event_id = e.id AND epc.status = 'confirmed' AND epc.role = 'participant'), 0)::int,
		CASE
			WHEN e.capacity IS NULL THEN NULL
			ELSE GREATEST(e.capacity - coalesce((SELECT COUNT(*) FROM event_participations epc WHERE epc.event_id = e.id AND epc.status = 'confirmed' AND epc.role = 'participant'), 0)::int, 0)
		END AS available_slots,
		coalesce((
			SELECT COUNT(*)::int
			FROM event_interests ei
			WHERE ei.event_id = e.id
				AND ei.deleted_at IS NULL
				AND NOT EXISTS (
					SELECT 1
					FROM event_participations eip
					WHERE eip.event_id = ei.event_id
						AND eip.user_id = ei.user_id
						AND eip.status IN ('pending_approval', 'confirmed', 'attended')
				)
		), 0)::int AS interested_count,
		coalesce((SELECT COUNT(*) FROM event_participations epg WHERE epg.event_id = e.id AND epg.status = 'confirmed' AND epg.role = 'participant'), 0)::int AS going_count,
		coalesce(e.organizer_user_id::text, ''),
		coalesce(e.group_id::text, ''),
		coalesce(e.dive_site_id::text, ''),
		coalesce(ds.id::text, ''),
		coalesce(ds.slug, ''),
		coalesce(ds.name, ''),
		coalesce(ds.area, ''),
		ds.latitude,
		ds.longitude,
		e.requires_approval,
		e.is_paid,
		e.price_amount::float8,
		coalesce(e.currency, 'PHP'),
		coalesce(e.payment_instructions, ''),
		coalesce(e.meeting_point, ''),
		e.beginner_friendly,
		e.max_depth_m,
		coalesce(e.entry_type, ''),
		coalesce(e.equipment_notes, ''),
		coalesce(e.safety_notes, ''),
		coalesce(e.cancellation_policy, ''),
		e.posts_enabled,
		coalesce(e.post_create_policy, 'organizers_only'),
		e.published_at,
		e.cancelled_at,
		coalesce(e.cancel_reason, ''),
		e.created_at,
		e.updated_at,
		coalesce((vp.id IS NOT NULL AND vp.status IN ('pending_approval', 'confirmed', 'attended')), false) AS viewer_joined,
		coalesce((vei.id IS NOT NULL AND (vp.id IS NULL OR vp.status NOT IN ('pending_approval', 'confirmed', 'attended'))), false) AS viewer_interested,
		coalesce(vp.status, '') AS viewer_participation_status,
		CASE
			WHEN NULLIF($1, '') IS NULL THEN 'anonymous'
			WHEN vp.status = 'pending_approval' THEN 'pending_approval'
			WHEN vp.status IN ('confirmed', 'attended') THEN 'going'
			WHEN vp.status = 'rejected' THEN 'rejected'
			WHEN vp.status = 'left' THEN 'left'
			WHEN vp.status = 'cancelled' THEN 'cancelled'
			WHEN vei.id IS NOT NULL THEN 'interested'
			ELSE 'none'
		END AS viewer_event_state,
		(
			(
				coalesce(e.organizer_user_id = NULLIF($1, '')::uuid, false)
				AND vp.id IS NULL
			)
			OR coalesce(vp.role IN ('organizer', 'staff') AND vp.status IN ('confirmed', 'pending_approval'), false)
		) AS viewer_can_manage,
		(
			e.visibility = 'public'
			OR (
				coalesce(e.organizer_user_id = NULLIF($1, '')::uuid, false)
				AND vp.id IS NULL
			)
			OR coalesce(vp.role IN ('organizer', 'staff') AND vp.status IN ('confirmed', 'pending_approval'), false)
			OR coalesce(vp.role = 'participant' AND vp.status = 'confirmed', false)
		) AS viewer_can_view_private_details,
		coalesce(vp.id::text, ''),
		coalesce(vp.event_id::text, ''),
		coalesce(vp.user_id::text, ''),
		coalesce(vp.role, ''),
		coalesce(vp.status, ''),
		coalesce(vp.participant_note, ''),
		coalesce(vp.emergency_contact_name, ''),
		coalesce(vp.emergency_contact_phone, ''),
		vp.created_at,
		vp.updated_at,
		vp.approved_at,
		coalesce(vp.approved_by::text, ''),
		vp.rejected_at,
		coalesce(vp.rejected_by::text, ''),
		vp.cancelled_at,
		vp.left_at,
		coalesce(vpay.id::text, ''),
		coalesce(vpay.event_id::text, ''),
		coalesce(vpay.event_participation_id::text, ''),
		coalesce(vpay.user_id::text, ''),
		coalesce(vpay.payment_method_id::text, ''),
		vpay.amount::float8,
		coalesce(vpay.currency, ''),
		coalesce(vpay.proof_media_id::text, ''),
		coalesce(vpay.proof_attachment_url, ''),
		coalesce((SELECT regexp_replace(mo.object_key, '^.*/', '') FROM media_objects mo WHERE mo.id = vpay.proof_media_id), ''),
		coalesce((SELECT mo.mime_type FROM media_objects mo WHERE mo.id = vpay.proof_media_id), ''),
		coalesce(vpay.reference_number, ''),
		coalesce(vpay.status, ''),
		coalesce(vpay.reviewed_by::text, ''),
		vpay.reviewed_at,
		coalesce(vpay.review_notes, ''),
		vpay.created_at,
		vpay.updated_at
	`
}

type eventScanner interface {
	Scan(dest ...any) error
}

func scanEvent(row eventScanner, item *Event, total *int) error {
	var diveSiteID string
	var diveSiteSlug string
	var diveSiteName string
	var diveSiteArea string
	var diveSiteLat *float64
	var diveSiteLng *float64
	var participant EventParticipant
	var participantCreatedAt *time.Time
	var participantUpdatedAt *time.Time
	var payment EventParticipantPayment
	var paymentCreatedAt *time.Time
	var paymentUpdatedAt *time.Time

	dest := []any{
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.ShortDescription,
		&item.DescriptionMarkdown,
		&item.Location,
		&item.LocationName,
		&item.FormattedAddress,
		&item.Latitude,
		&item.Longitude,
		&item.GooglePlaceID,
		&item.RegionCode,
		&item.ProvinceCode,
		&item.CityCode,
		&item.BarangayCode,
		&item.LocationSource,
		&item.StartsAt,
		&item.EndsAt,
		&item.Timezone,
		&item.Status,
		&item.Visibility,
		&item.EventType,
		&item.Difficulty,
		&item.MaxAttendees,
		&item.Capacity,
		&item.CurrentAttendees,
		&item.AvailableSlots,
		&item.InterestedCount,
		&item.GoingCount,
		&item.OrganizerUserID,
		&item.GroupID,
		&item.DiveSiteID,
		&diveSiteID,
		&diveSiteSlug,
		&diveSiteName,
		&diveSiteArea,
		&diveSiteLat,
		&diveSiteLng,
		&item.RequiresApproval,
		&item.IsPaid,
		&item.PriceAmount,
		&item.Currency,
		&item.PaymentInstructions,
		&item.MeetingPoint,
		&item.BeginnerFriendly,
		&item.MaxDepthM,
		&item.EntryType,
		&item.EquipmentNotes,
		&item.SafetyNotes,
		&item.CancellationPolicy,
		&item.PostsEnabled,
		&item.PostCreatePolicy,
		&item.PublishedAt,
		&item.CancelledAt,
		&item.CancelReason,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ViewerJoined,
		&item.ViewerInterested,
		&item.ViewerParticipationStatus,
		&item.ViewerEventState,
		&item.ViewerCanManage,
		&item.ViewerCanViewPrivateDetails,
		&participant.ID,
		&participant.EventID,
		&participant.UserID,
		&participant.Role,
		&participant.Status,
		&participant.ParticipantNote,
		&participant.EmergencyContactName,
		&participant.EmergencyContactPhone,
		&participantCreatedAt,
		&participantUpdatedAt,
		&participant.ApprovedAt,
		&participant.ApprovedBy,
		&participant.RejectedAt,
		&participant.RejectedBy,
		&participant.CancelledAt,
		&participant.LeftAt,
		&payment.ID,
		&payment.EventID,
		&payment.EventParticipationID,
		&payment.UserID,
		&payment.PaymentMethodID,
		&payment.Amount,
		&payment.Currency,
		&payment.ProofMediaID,
		&payment.ProofAttachmentURL,
		&payment.ProofFileName,
		&payment.ProofContentType,
		&payment.ReferenceNumber,
		&payment.Status,
		&payment.ReviewedBy,
		&payment.ReviewedAt,
		&payment.ReviewNotes,
		&paymentCreatedAt,
		&paymentUpdatedAt,
	}
	if total != nil {
		dest = append(dest, total)
	}
	if err := row.Scan(dest...); err != nil {
		return err
	}
	normalizeEventTimes(item)
	if diveSiteID != "" {
		item.DiveSite = &DiveSiteSummary{
			ID:        diveSiteID,
			Slug:      diveSiteSlug,
			Name:      diveSiteName,
			Area:      diveSiteArea,
			Latitude:  diveSiteLat,
			Longitude: diveSiteLng,
		}
	}
	if participant.ID != "" {
		if participantCreatedAt != nil {
			participant.CreatedAt = participantCreatedAt.UTC()
		}
		if participantUpdatedAt != nil {
			participant.UpdatedAt = participantUpdatedAt.UTC()
		}
		normalizeParticipantTimes(&participant)
		item.ViewerParticipation = &participant
	}
	if payment.ID != "" {
		if paymentCreatedAt != nil {
			payment.CreatedAt = paymentCreatedAt.UTC()
		}
		if paymentUpdatedAt != nil {
			payment.UpdatedAt = paymentUpdatedAt.UTC()
		}
		normalizePaymentTimes(&payment)
		item.ViewerPayment = &payment
		if item.ViewerParticipation != nil {
			item.ViewerParticipation.Payment = &payment
		}
	}
	return nil
}

func participantSelectColumns() string {
	return `
		ep.id::text, ep.event_id::text, ep.user_id::text, ep.role, ep.status,
		coalesce(ep.participant_note, ''), coalesce(ep.emergency_contact_name, ''),
		coalesce(ep.emergency_contact_phone, ''), ep.created_at, ep.updated_at,
		ep.approved_at, coalesce(ep.approved_by::text, ''), ep.rejected_at,
		coalesce(ep.rejected_by::text, ''), ep.cancelled_at, ep.left_at,
		coalesce(u.display_name, ''), coalesce(u.username, ''), coalesce(p.avatar_url, ''),
		coalesce(pay.id::text, ''), coalesce(pay.event_id::text, ''),
		coalesce(pay.event_participation_id::text, ''), coalesce(pay.user_id::text, ''),
		coalesce(pay.payment_method_id::text, ''), pay.amount::float8, coalesce(pay.currency, ''),
		coalesce(pay.proof_media_id::text, ''), coalesce(pay.proof_attachment_url, ''),
		coalesce((SELECT regexp_replace(mo.object_key, '^.*/', '') FROM media_objects mo WHERE mo.id = pay.proof_media_id), ''),
		coalesce((SELECT mo.mime_type FROM media_objects mo WHERE mo.id = pay.proof_media_id), ''),
		coalesce(pay.reference_number, ''), coalesce(pay.status, ''), coalesce(pay.reviewed_by::text, ''),
		pay.reviewed_at, coalesce(pay.review_notes, ''), pay.created_at, pay.updated_at
	`
}

func scanParticipant(row eventScanner, item *EventParticipant, total *int) error {
	var payment EventParticipantPayment
	var paymentCreatedAt *time.Time
	var paymentUpdatedAt *time.Time
	dest := []any{
		&item.ID,
		&item.EventID,
		&item.UserID,
		&item.Role,
		&item.Status,
		&item.ParticipantNote,
		&item.EmergencyContactName,
		&item.EmergencyContactPhone,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.ApprovedAt,
		&item.ApprovedBy,
		&item.RejectedAt,
		&item.RejectedBy,
		&item.CancelledAt,
		&item.LeftAt,
		&item.DisplayName,
		&item.Username,
		&item.AvatarURL,
		&payment.ID,
		&payment.EventID,
		&payment.EventParticipationID,
		&payment.UserID,
		&payment.PaymentMethodID,
		&payment.Amount,
		&payment.Currency,
		&payment.ProofMediaID,
		&payment.ProofAttachmentURL,
		&payment.ProofFileName,
		&payment.ProofContentType,
		&payment.ReferenceNumber,
		&payment.Status,
		&payment.ReviewedBy,
		&payment.ReviewedAt,
		&payment.ReviewNotes,
		&paymentCreatedAt,
		&paymentUpdatedAt,
	}
	if total != nil {
		dest = append(dest, total)
	}
	if err := row.Scan(dest...); err != nil {
		return err
	}
	normalizeParticipantTimes(item)
	if payment.ID != "" {
		if paymentCreatedAt != nil {
			payment.CreatedAt = paymentCreatedAt.UTC()
		}
		if paymentUpdatedAt != nil {
			payment.UpdatedAt = paymentUpdatedAt.UTC()
		}
		normalizePaymentTimes(&payment)
		item.Payment = &payment
	}
	return nil
}

func scanPaymentMethod(row eventScanner, item *EventPaymentMethod) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.Type,
		&item.Name,
		&item.Instructions,
		&item.QRImageURL,
		&item.AccountName,
		&item.AccountNumber,
		&item.BankName,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return err
	}
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	return nil
}

func scanPayment(row eventScanner, item *EventParticipantPayment) error {
	if err := row.Scan(
		&item.ID,
		&item.EventID,
		&item.EventParticipationID,
		&item.UserID,
		&item.PaymentMethodID,
		&item.Amount,
		&item.Currency,
		&item.ProofMediaID,
		&item.ProofAttachmentURL,
		&item.ProofFileName,
		&item.ProofContentType,
		&item.ReferenceNumber,
		&item.Status,
		&item.ReviewedBy,
		&item.ReviewedAt,
		&item.ReviewNotes,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return err
	}
	normalizePaymentTimes(item)
	return nil
}

type sqlRunner interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func insertPaymentMethod(ctx context.Context, runner sqlRunner, eventID string, input CreatePaymentMethodInput) (EventPaymentMethod, error) {
	const q = `
		INSERT INTO event_payment_methods (
			event_id, type, name, instructions, qr_image_url, account_name,
			account_number, bank_name, is_active
		) VALUES (
			$1::uuid, $2, $3, nullif($4, ''), nullif($5, ''), nullif($6, ''),
			nullif($7, ''), nullif($8, ''), $9
		)
		RETURNING id::text, event_id::text, type, name, coalesce(instructions, ''),
			coalesce(qr_image_url, ''), coalesce(account_name, ''), coalesce(account_number, ''),
			coalesce(bank_name, ''), is_active, created_at, updated_at
	`
	isActive := input.IsActive
	var item EventPaymentMethod
	if err := scanPaymentMethod(runner.QueryRow(ctx, q,
		eventID,
		input.Type,
		input.Name,
		input.Instructions,
		input.QRImageURL,
		input.AccountName,
		input.AccountNumber,
		input.BankName,
		isActive,
	), &item); err != nil {
		return EventPaymentMethod{}, err
	}
	return item, nil
}

func addOrganizerRecords(ctx context.Context, tx pgx.Tx, eventID, userID string) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_participations (
			event_id, user_id, role, status, approved_at, approved_by
		) VALUES ($1::uuid, $2::uuid, 'organizer', 'confirmed', NOW(), $2::uuid)
		ON CONFLICT (event_id, user_id)
		DO UPDATE SET role = 'organizer', status = 'confirmed', approved_at = COALESCE(event_participations.approved_at, NOW()), approved_by = $2::uuid, updated_at = NOW()
	`, eventID, userID); err != nil {
		return err
	}
	return upsertMembership(ctx, tx, eventID, userID, "organizer", "active", "")
}

func upsertMembership(ctx context.Context, tx pgx.Tx, eventID, userID, role, status, notes string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO event_memberships (event_id, user_id, role, status, invited_by, joined_at, notes)
		VALUES ($1::uuid, $2::uuid, $3, $4, $2::uuid, CASE WHEN $4 = 'active' THEN NOW() ELSE NULL END, nullif($5, ''))
		ON CONFLICT (event_id, user_id)
		DO UPDATE SET
			role = EXCLUDED.role,
			status = EXCLUDED.status,
			notes = COALESCE(EXCLUDED.notes, event_memberships.notes),
			joined_at = CASE WHEN EXCLUDED.status = 'active' THEN COALESCE(event_memberships.joined_at, NOW()) ELSE event_memberships.joined_at END,
			left_at = CASE WHEN EXCLUDED.status = 'active' THEN NULL ELSE event_memberships.left_at END,
			updated_at = NOW()
	`, eventID, userID, role, status, notes)
	return err
}

func clearEventInterest(ctx context.Context, tx pgx.Tx, eventID, userID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE event_interests
		SET deleted_at = COALESCE(deleted_at, NOW()), updated_at = NOW()
		WHERE event_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
	`, eventID, userID)
	return err
}

func getDiveSiteForEvent(ctx context.Context, tx pgx.Tx, siteID string) (DiveSiteSummary, error) {
	const q = `
		SELECT id::text, slug, name, area, latitude, longitude
		FROM dive_sites
		WHERE id = $1::uuid AND moderation_state = 'approved'
	`
	var site DiveSiteSummary
	if err := tx.QueryRow(ctx, q, siteID).Scan(
		&site.ID,
		&site.Slug,
		&site.Name,
		&site.Area,
		&site.Latitude,
		&site.Longitude,
	); err != nil {
		return DiveSiteSummary{}, err
	}
	return site, nil
}

func assertCapacity(ctx context.Context, tx pgx.Tx, eventID string, capacity *int) error {
	if capacity == nil {
		return nil
	}
	var confirmed int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM event_participations
		WHERE event_id = $1::uuid AND status = 'confirmed' AND role = 'participant'
	`, eventID).Scan(&confirmed); err != nil {
		return err
	}
	if confirmed >= *capacity {
		return ErrCapacityFull
	}
	return nil
}

func refreshCurrentAttendees(ctx context.Context, tx pgx.Tx, eventID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE events
		SET current_attendees = (
			SELECT COUNT(*)::int
			FROM event_participations ep
			WHERE ep.event_id = events.id AND ep.status = 'confirmed' AND ep.role = 'participant'
		), updated_at = NOW()
		WHERE id = $1::uuid
	`, eventID)
	return err
}

func uniqueSlug(ctx context.Context, tx pgx.Tx, base string) string {
	base = sharedslug.Make(base, "event")
	slug := base
	for i := 0; i < 50; i++ {
		var exists bool
		_ = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM events WHERE slug = $1)`, slug).Scan(&exists)
		if !exists {
			return slug
		}
		slug = sharedslug.Append(base, fmt.Sprintf("%d", i+2), sharedslug.DefaultMaxLength)
	}
	return sharedslug.Append(base, fmt.Sprintf("%d", time.Now().Unix()), sharedslug.DefaultMaxLength)
}

func rollbackTx(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func normalizeEventTimes(item *Event) {
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.StartsAt != nil {
		t := item.StartsAt.UTC()
		item.StartsAt = &t
	}
	if item.EndsAt != nil {
		t := item.EndsAt.UTC()
		item.EndsAt = &t
	}
	if item.PublishedAt != nil {
		t := item.PublishedAt.UTC()
		item.PublishedAt = &t
	}
	if item.CancelledAt != nil {
		t := item.CancelledAt.UTC()
		item.CancelledAt = &t
	}
}

func normalizeParticipantTimes(item *EventParticipant) {
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.ApprovedAt != nil {
		t := item.ApprovedAt.UTC()
		item.ApprovedAt = &t
	}
	if item.RejectedAt != nil {
		t := item.RejectedAt.UTC()
		item.RejectedAt = &t
	}
	if item.CancelledAt != nil {
		t := item.CancelledAt.UTC()
		item.CancelledAt = &t
	}
	if item.LeftAt != nil {
		t := item.LeftAt.UTC()
		item.LeftAt = &t
	}
}

func normalizePaymentTimes(item *EventParticipantPayment) {
	item.CreatedAt = item.CreatedAt.UTC()
	item.UpdatedAt = item.UpdatedAt.UTC()
	if item.ReviewedAt != nil {
		t := item.ReviewedAt.UTC()
		item.ReviewedAt = &t
	}
}
