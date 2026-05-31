package http

import (
	"time"

	"fphgo/internal/shared/httpx"
)

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

type EventDiveSiteResponse struct {
	ID        string   `json:"id"`
	Slug      string   `json:"slug"`
	Name      string   `json:"name"`
	Area      string   `json:"area"`
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`
}

type EventPaymentMethodResponse struct {
	ID            string    `json:"id"`
	EventID       string    `json:"eventId"`
	Type          string    `json:"type"`
	Name          string    `json:"name"`
	Instructions  string    `json:"instructions,omitempty"`
	QRMediaID     string    `json:"qrMediaId,omitempty"`
	QRImageURL    string    `json:"qrImageUrl,omitempty"`
	AccountName   string    `json:"accountName,omitempty"`
	AccountNumber string    `json:"accountNumber,omitempty"`
	BankName      string    `json:"bankName,omitempty"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type EventParticipantPaymentResponse struct {
	ID                   string     `json:"id"`
	EventID              string     `json:"eventId"`
	EventParticipationID string     `json:"eventParticipationId"`
	UserID               string     `json:"userId"`
	PaymentMethodID      string     `json:"paymentMethodId,omitempty"`
	Amount               *float64   `json:"amount,omitempty"`
	Currency             string     `json:"currency"`
	ProofMediaID         string     `json:"proofMediaId,omitempty"`
	ProofAttachmentURL   string     `json:"proofAttachmentUrl,omitempty"`
	ProofFileName        string     `json:"proofFileName,omitempty"`
	ProofContentType     string     `json:"proofContentType,omitempty"`
	ProofStatus          string     `json:"proofStatus,omitempty"`
	ReferenceNumber      string     `json:"referenceNumber,omitempty"`
	Status               string     `json:"status"`
	ReviewedBy           string     `json:"reviewedBy,omitempty"`
	ReviewedAt           *time.Time `json:"reviewedAt,omitempty"`
	ReviewNotes          string     `json:"reviewNotes,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}

type EventParticipantResponse struct {
	ID                    string                           `json:"id"`
	EventID               string                           `json:"eventId"`
	UserID                string                           `json:"userId"`
	Role                  string                           `json:"role"`
	Status                string                           `json:"status"`
	ParticipantNote       string                           `json:"participantNote,omitempty"`
	EmergencyContactName  string                           `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone string                           `json:"emergencyContactPhone,omitempty"`
	JoinAnswers           map[string]any                   `json:"joinAnswers,omitempty"`
	CreatedAt             time.Time                        `json:"createdAt"`
	UpdatedAt             time.Time                        `json:"updatedAt"`
	ApprovedAt            *time.Time                       `json:"approvedAt,omitempty"`
	ApprovedBy            string                           `json:"approvedBy,omitempty"`
	RejectedAt            *time.Time                       `json:"rejectedAt,omitempty"`
	RejectedBy            string                           `json:"rejectedBy,omitempty"`
	CancelledAt           *time.Time                       `json:"cancelledAt,omitempty"`
	LeftAt                *time.Time                       `json:"leftAt,omitempty"`
	QRToken               string                           `json:"qrToken,omitempty"`
	QRIssuedAt            *time.Time                       `json:"qrIssuedAt,omitempty"`
	QRRevokedAt           *time.Time                       `json:"qrRevokedAt,omitempty"`
	CheckedInAt           *time.Time                       `json:"checkedInAt,omitempty"`
	CheckedInBy           string                           `json:"checkedInBy,omitempty"`
	DisplayName           string                           `json:"displayName,omitempty"`
	Username              string                           `json:"username,omitempty"`
	AvatarURL             string                           `json:"avatarUrl,omitempty"`
	Payment               *EventParticipantPaymentResponse `json:"payment,omitempty"`
}

type EventAttendeeResponse = EventParticipantResponse

type EventResponse struct {
	ID                          string                           `json:"id"`
	Slug                        string                           `json:"slug,omitempty"`
	Title                       string                           `json:"title"`
	ShortDescription            string                           `json:"shortDescription,omitempty"`
	Description                 string                           `json:"description,omitempty"`
	DescriptionMarkdown         string                           `json:"descriptionMarkdown,omitempty"`
	LogoMediaID                 string                           `json:"logoMediaId,omitempty"`
	LogoURL                     string                           `json:"logoUrl,omitempty"`
	CoverMediaID                string                           `json:"coverMediaId,omitempty"`
	CoverURL                    string                           `json:"coverUrl,omitempty"`
	CoverPhotoURL               string                           `json:"coverPhotoUrl,omitempty"`
	Location                    string                           `json:"location,omitempty"`
	LocationName                string                           `json:"locationName,omitempty"`
	FormattedAddress            string                           `json:"formattedAddress,omitempty"`
	Latitude                    *float64                         `json:"latitude,omitempty"`
	Longitude                   *float64                         `json:"longitude,omitempty"`
	GooglePlaceID               string                           `json:"googlePlaceId,omitempty"`
	RegionCode                  string                           `json:"regionCode,omitempty"`
	ProvinceCode                string                           `json:"provinceCode,omitempty"`
	CityCode                    string                           `json:"cityCode,omitempty"`
	BarangayCode                string                           `json:"barangayCode,omitempty"`
	LocationSource              string                           `json:"locationSource,omitempty"`
	DiveSiteID                  string                           `json:"diveSiteId,omitempty"`
	DiveSite                    *EventDiveSiteResponse           `json:"diveSite,omitempty"`
	StartsAt                    *time.Time                       `json:"startsAt,omitempty"`
	EndsAt                      *time.Time                       `json:"endsAt,omitempty"`
	Timezone                    string                           `json:"timezone"`
	Status                      string                           `json:"status"`
	Visibility                  string                           `json:"visibility"`
	Type                        string                           `json:"type"`
	Difficulty                  string                           `json:"difficulty"`
	MaxAttendees                *int                             `json:"maxAttendees,omitempty"`
	Capacity                    *int                             `json:"capacity,omitempty"`
	CurrentAttendees            int                              `json:"currentAttendees"`
	AvailableSlots              *int                             `json:"availableSlots,omitempty"`
	InterestedCount             int                              `json:"interestedCount"`
	GoingCount                  int                              `json:"goingCount"`
	OrganizerUserID             string                           `json:"organizerUserId,omitempty"`
	GroupID                     string                           `json:"groupId,omitempty"`
	RequiresApproval            bool                             `json:"requiresApproval"`
	IsPaid                      bool                             `json:"isPaid"`
	PaymentMode                 string                           `json:"paymentMode"`
	PriceAmount                 *float64                         `json:"priceAmount,omitempty"`
	Currency                    string                           `json:"currency"`
	PaymentInstructions         string                           `json:"paymentInstructions,omitempty"`
	MeetingPoint                string                           `json:"meetingPoint,omitempty"`
	BeginnerFriendly            bool                             `json:"beginnerFriendly"`
	MaxDepthM                   *int                             `json:"maxDepthM,omitempty"`
	EntryType                   string                           `json:"entryType,omitempty"`
	EquipmentNotes              string                           `json:"equipmentNotes,omitempty"`
	SafetyNotes                 string                           `json:"safetyNotes,omitempty"`
	CancellationPolicy          string                           `json:"cancellationPolicy,omitempty"`
	PaymentEnabled              bool                             `json:"paymentEnabled"`
	PostsEnabled                bool                             `json:"postsEnabled"`
	AwardsEnabled               bool                             `json:"awardsEnabled"`
	SponsorsEnabled             bool                             `json:"sponsorsEnabled"`
	InterestedEnabled           bool                             `json:"interestedEnabled"`
	ProgramEnabled              bool                             `json:"programEnabled"`
	Modules                     EventModulesRequest              `json:"modules"`
	PostCreatePolicy            string                           `json:"postCreatePolicy"`
	PublishedAt                 *time.Time                       `json:"publishedAt,omitempty"`
	CancelledAt                 *time.Time                       `json:"cancelledAt,omitempty"`
	CancelReason                string                           `json:"cancelReason,omitempty"`
	ViewerJoined                bool                             `json:"viewerJoined"`
	ViewerInterested            bool                             `json:"viewerInterested"`
	ViewerParticipationStatus   string                           `json:"viewerParticipationStatus,omitempty"`
	ViewerEventState            string                           `json:"viewerEventState"`
	ViewerCanManage             bool                             `json:"viewerCanManage"`
	ViewerCanViewPrivateDetails bool                             `json:"viewerCanViewPrivateDetails"`
	ViewerParticipation         *EventParticipantResponse        `json:"viewerParticipation,omitempty"`
	ViewerPayment               *EventParticipantPaymentResponse `json:"viewerPayment,omitempty"`
	PaymentMethods              []EventPaymentMethodResponse     `json:"paymentMethods,omitempty"`
	CreatedAt                   time.Time                        `json:"createdAt"`
	UpdatedAt                   time.Time                        `json:"updatedAt"`
}

type ListEventsResponse struct {
	Events     []EventResponse `json:"events"`
	Pagination Pagination      `json:"pagination"`
}

type EventDetailResponse struct {
	Event EventResponse `json:"event"`
}

type ListEventParticipantsResponse struct {
	Participants []EventParticipantResponse `json:"participants"`
	Attendees    []EventParticipantResponse `json:"attendees"`
	Pagination   Pagination                 `json:"pagination"`
}

type CreatePaymentMethodRequest struct {
	Type          string `json:"type" validate:"required,oneof=manual_qr bank_transfer MANUAL_QR MANUAL_BANK_TRANSFER"`
	Name          string `json:"name" validate:"omitempty,min=1,max=120"`
	Instructions  string `json:"instructions,omitempty" validate:"omitempty,max=2000"`
	QRMediaID     string `json:"qrMediaId,omitempty" validate:"omitempty,uuid"`
	QRImageURL    string `json:"qrImageUrl,omitempty" validate:"omitempty,max=1000"`
	AccountName   string `json:"accountName,omitempty" validate:"omitempty,max=160"`
	AccountNumber string `json:"accountNumber,omitempty" validate:"omitempty,max=160"`
	BankName      string `json:"bankName,omitempty" validate:"omitempty,max=160"`
	IsActive      *bool  `json:"isActive,omitempty"`
}

type UpdatePaymentMethodRequest struct {
	Type          *string `json:"type,omitempty" validate:"omitempty,oneof=manual_qr bank_transfer MANUAL_QR MANUAL_BANK_TRANSFER"`
	Name          *string `json:"name,omitempty" validate:"omitempty,min=1,max=120"`
	Instructions  *string `json:"instructions,omitempty" validate:"omitempty,max=2000"`
	QRMediaID     *string `json:"qrMediaId,omitempty" validate:"omitempty,uuid"`
	QRImageURL    *string `json:"qrImageUrl,omitempty" validate:"omitempty,max=1000"`
	AccountName   *string `json:"accountName,omitempty" validate:"omitempty,max=160"`
	AccountNumber *string `json:"accountNumber,omitempty" validate:"omitempty,max=160"`
	BankName      *string `json:"bankName,omitempty" validate:"omitempty,max=160"`
	IsActive      *bool   `json:"isActive,omitempty"`
}

type CreateEventRequest struct {
	Title               string                       `json:"title" validate:"required,min=3,max=200"`
	ShortDescription    string                       `json:"shortDescription" validate:"required,min=3,max=500"`
	DescriptionMarkdown string                       `json:"descriptionMarkdown,omitempty" validate:"omitempty,min=3,max=20000"`
	Type                string                       `json:"type" validate:"required,oneof=intro_session pool_training line_training fun_dive depth_training certification_course workshop competition cleanup_dive trip_retreat"`
	DiveSiteID          string                       `json:"diveSiteId" validate:"required,uuid"`
	StartsAt            string                       `json:"startsAt" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	EndsAt              string                       `json:"endsAt" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	Timezone            string                       `json:"timezone,omitempty" validate:"omitempty,max=80"`
	Capacity            *int                         `json:"capacity,omitempty" validate:"omitempty,min=1,max=100000"`
	Status              string                       `json:"status,omitempty" validate:"omitempty,oneof=draft published full cancelled completed archived"`
	Visibility          string                       `json:"visibility" validate:"required,oneof=public private"`
	Difficulty          string                       `json:"difficulty,omitempty" validate:"omitempty,oneof=beginner intermediate advanced expert"`
	RequiresApproval    bool                         `json:"requiresApproval"`
	IsPaid              bool                         `json:"isPaid"`
	PaymentMode         string                       `json:"paymentMode,omitempty" validate:"omitempty,oneof=free required optional"`
	PriceAmount         *float64                     `json:"priceAmount,omitempty" validate:"omitempty,min=0"`
	Currency            string                       `json:"currency,omitempty" validate:"omitempty,len=3"`
	PaymentInstructions string                       `json:"paymentInstructions,omitempty" validate:"omitempty,max=4000"`
	MeetingPoint        string                       `json:"meetingPoint,omitempty" validate:"omitempty,max=1000"`
	BeginnerFriendly    bool                         `json:"beginnerFriendly"`
	MaxDepthM           *int                         `json:"maxDepthM,omitempty" validate:"omitempty,min=0,max=300"`
	EntryType           string                       `json:"entryType,omitempty" validate:"omitempty,oneof=shore boat pool classroom_online"`
	EquipmentNotes      string                       `json:"equipmentNotes,omitempty" validate:"omitempty,max=4000"`
	SafetyNotes         string                       `json:"safetyNotes,omitempty" validate:"omitempty,max=4000"`
	CancellationPolicy  string                       `json:"cancellationPolicy,omitempty" validate:"omitempty,max=4000"`
	PaymentMethods      []CreatePaymentMethodRequest `json:"paymentMethods,omitempty" validate:"omitempty,dive"`
	Modules             EventModulesRequest          `json:"modules,omitempty"`
	GroupID             string                       `json:"groupId,omitempty" validate:"omitempty,uuid"`
}

type UpdateEventRequest struct {
	Title               *string              `json:"title,omitempty" validate:"omitempty,min=3,max=200"`
	ShortDescription    *string              `json:"shortDescription,omitempty" validate:"omitempty,min=3,max=500"`
	DescriptionMarkdown *string              `json:"descriptionMarkdown,omitempty" validate:"omitempty,min=3,max=20000"`
	LogoMediaID         httpx.NullableString `json:"logoMediaId,omitempty"`
	CoverMediaID        httpx.NullableString `json:"coverMediaId,omitempty"`
	Type                *string              `json:"type,omitempty" validate:"omitempty,oneof=intro_session pool_training line_training fun_dive depth_training certification_course workshop competition cleanup_dive trip_retreat"`
	DiveSiteID          *string              `json:"diveSiteId,omitempty" validate:"omitempty,uuid"`
	StartsAt            *string              `json:"startsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	EndsAt              *string              `json:"endsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Timezone            *string              `json:"timezone,omitempty" validate:"omitempty,max=80"`
	Capacity            *int                 `json:"capacity,omitempty" validate:"omitempty,min=1,max=100000"`
	Status              *string              `json:"status,omitempty" validate:"omitempty,oneof=draft published full cancelled completed archived"`
	Visibility          *string              `json:"visibility,omitempty" validate:"omitempty,oneof=public private"`
	Difficulty          *string              `json:"difficulty,omitempty" validate:"omitempty,oneof=beginner intermediate advanced expert"`
	RequiresApproval    *bool                `json:"requiresApproval,omitempty"`
	IsPaid              *bool                `json:"isPaid,omitempty"`
	PaymentMode         *string              `json:"paymentMode,omitempty" validate:"omitempty,oneof=free required optional"`
	PriceAmount         *float64             `json:"priceAmount,omitempty" validate:"omitempty,min=0"`
	Currency            *string              `json:"currency,omitempty" validate:"omitempty,len=3"`
	PaymentInstructions *string              `json:"paymentInstructions,omitempty" validate:"omitempty,max=4000"`
	MeetingPoint        *string              `json:"meetingPoint,omitempty" validate:"omitempty,max=1000"`
	BeginnerFriendly    *bool                `json:"beginnerFriendly,omitempty"`
	MaxDepthM           *int                 `json:"maxDepthM,omitempty" validate:"omitempty,min=0,max=300"`
	EntryType           *string              `json:"entryType,omitempty" validate:"omitempty,oneof=shore boat pool classroom_online"`
	EquipmentNotes      *string              `json:"equipmentNotes,omitempty" validate:"omitempty,max=4000"`
	SafetyNotes         *string              `json:"safetyNotes,omitempty" validate:"omitempty,max=4000"`
	CancellationPolicy  *string              `json:"cancellationPolicy,omitempty" validate:"omitempty,max=4000"`
	PostsEnabled        *bool                `json:"postsEnabled,omitempty"`
	PaymentEnabled      *bool                `json:"paymentEnabled,omitempty"`
	AwardsEnabled       *bool                `json:"awardsEnabled,omitempty"`
	SponsorsEnabled     *bool                `json:"sponsorsEnabled,omitempty"`
	InterestedEnabled   *bool                `json:"interestedEnabled,omitempty"`
	ProgramEnabled      *bool                `json:"programEnabled,omitempty"`
	PostCreatePolicy    *string              `json:"postCreatePolicy,omitempty" validate:"omitempty,oneof=organizers_only participants"`
	CancelReason        *string              `json:"cancelReason,omitempty" validate:"omitempty,max=1000"`
	CoverPhotoURL       *string              `json:"coverPhotoUrl,omitempty" validate:"omitempty,max=1000"`
}

type JoinEventRequest struct {
	ParticipantNote string         `json:"participantNote,omitempty" validate:"omitempty,max=1000"`
	Notes           string         `json:"notes,omitempty" validate:"omitempty,max=1000"`
	JoinAnswers     map[string]any `json:"joinAnswers,omitempty"`
}

type EventModulesRequest struct {
	Payment    bool  `json:"payment"`
	Posts      bool  `json:"posts"`
	Awards     bool  `json:"awards"`
	Sponsors   bool  `json:"sponsors"`
	Program    bool  `json:"program"`
	Interested *bool `json:"interested,omitempty"`
}

type SubmitEventPaymentRequest struct {
	PaymentMethodID    string `json:"paymentMethodId" validate:"required,uuid4"`
	ProofMediaID       string `json:"proofMediaId,omitempty" validate:"omitempty,uuid4"`
	ProofAttachmentURL string `json:"proofAttachmentUrl,omitempty" validate:"omitempty,max=1000"`
	ReferenceNumber    string `json:"referenceNumber,omitempty" validate:"omitempty,max=160"`
}

type ReviewEventPaymentRequest struct {
	ReviewNotes string `json:"reviewNotes,omitempty" validate:"omitempty,max=1000"`
}

type CreateEventResponse struct {
	Event EventResponse `json:"event"`
}

type JoinEventResponse struct {
	Participant EventParticipantResponse `json:"participant"`
	Attendee    EventParticipantResponse `json:"attendee"`
}

type ListPaymentMethodsResponse struct {
	PaymentMethods []EventPaymentMethodResponse `json:"paymentMethods"`
}

type PaymentMethodResponse struct {
	PaymentMethod EventPaymentMethodResponse `json:"paymentMethod"`
}

type EventPaymentResponse struct {
	Payment EventParticipantPaymentResponse `json:"payment"`
}

type PaymentProofURLResponse struct {
	URL              string `json:"url"`
	ExpiresAt        int64  `json:"expiresAt"`
	PaymentID        string `json:"paymentId"`
	ProofMediaID     string `json:"proofMediaId"`
	ProofFileName    string `json:"proofFileName,omitempty"`
	ProofContentType string `json:"proofContentType,omitempty"`
}

type EventPassResponse struct {
	Valid            bool                             `json:"valid"`
	Revoked          bool                             `json:"revoked"`
	AlreadyCheckedIn bool                             `json:"alreadyCheckedIn,omitempty"`
	Event            EventResponse                    `json:"event"`
	Participant      EventParticipantResponse         `json:"participant"`
	Role             string                           `json:"role"`
	Status           string                           `json:"status"`
	Payment          *EventParticipantPaymentResponse `json:"payment,omitempty"`
	CanManage        bool                             `json:"canManage"`
	IsOwner          bool                             `json:"isOwner"`
}
