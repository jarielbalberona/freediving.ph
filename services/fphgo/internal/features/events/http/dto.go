package http

import "time"

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

type EventResponse struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Description      string     `json:"description,omitempty"`
	Location         string     `json:"location,omitempty"`
	LocationName     string     `json:"locationName,omitempty"`
	FormattedAddress string     `json:"formattedAddress,omitempty"`
	Latitude         *float64   `json:"latitude,omitempty"`
	Longitude        *float64   `json:"longitude,omitempty"`
	GooglePlaceID    string     `json:"googlePlaceId,omitempty"`
	RegionCode       string     `json:"regionCode,omitempty"`
	ProvinceCode     string     `json:"provinceCode,omitempty"`
	CityCode         string     `json:"cityCode,omitempty"`
	BarangayCode     string     `json:"barangayCode,omitempty"`
	LocationSource   string     `json:"locationSource,omitempty"`
	StartsAt         *time.Time `json:"startsAt,omitempty"`
	EndsAt           *time.Time `json:"endsAt,omitempty"`
	Status           string     `json:"status"`
	Visibility       string     `json:"visibility"`
	Type             string     `json:"type"`
	Difficulty       string     `json:"difficulty"`
	MaxAttendees     *int       `json:"maxAttendees,omitempty"`
	CurrentAttendees int        `json:"currentAttendees"`
	OrganizerUserID  string     `json:"organizerUserId,omitempty"`
	GroupID          string     `json:"groupId,omitempty"`
	ViewerJoined     bool       `json:"viewerJoined"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type EventAttendeeResponse struct {
	EventID     string     `json:"eventId"`
	UserID      string     `json:"userId"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	JoinedAt    *time.Time `json:"joinedAt,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
	Username    string     `json:"username,omitempty"`
	AvatarURL   string     `json:"avatarUrl,omitempty"`
}

type ListEventsResponse struct {
	Events     []EventResponse `json:"events"`
	Pagination Pagination      `json:"pagination"`
}

type EventDetailResponse struct {
	Event EventResponse `json:"event"`
}

type ListEventAttendeesResponse struct {
	Attendees  []EventAttendeeResponse `json:"attendees"`
	Pagination Pagination              `json:"pagination"`
}

type CreateEventRequest struct {
	Title            string   `json:"title" validate:"required,min=3,max=200"`
	Description      string   `json:"description,omitempty" validate:"omitempty,max=4000"`
	Location         string   `json:"location,omitempty" validate:"omitempty,max=255"`
	LocationName     string   `json:"locationName,omitempty" validate:"omitempty,max=255"`
	FormattedAddress string   `json:"formattedAddress,omitempty" validate:"omitempty,max=500"`
	Latitude         *float64 `json:"latitude,omitempty" validate:"omitempty,gte=-90,lte=90"`
	Longitude        *float64 `json:"longitude,omitempty" validate:"omitempty,gte=-180,lte=180"`
	GooglePlaceID    string   `json:"googlePlaceId,omitempty" validate:"omitempty,max=255"`
	RegionCode       string   `json:"regionCode,omitempty" validate:"omitempty,max=16"`
	ProvinceCode     string   `json:"provinceCode,omitempty" validate:"omitempty,max=16"`
	CityCode         string   `json:"cityCode,omitempty" validate:"omitempty,max=16"`
	BarangayCode     string   `json:"barangayCode,omitempty" validate:"omitempty,max=16"`
	LocationSource   string   `json:"locationSource,omitempty" validate:"omitempty,oneof=manual google_places psgc_mapped unmapped"`
	StartsAt         string   `json:"startsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	EndsAt           string   `json:"endsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Status           string   `json:"status,omitempty" validate:"omitempty,oneof=draft published cancelled completed"`
	Visibility       string   `json:"visibility,omitempty" validate:"omitempty,oneof=public group_members invite_only"`
	Type             string   `json:"type,omitempty" validate:"omitempty,max=32"`
	Difficulty       string   `json:"difficulty,omitempty" validate:"omitempty,oneof=beginner intermediate advanced expert"`
	MaxAttendees     *int     `json:"maxAttendees,omitempty" validate:"omitempty,min=1,max=100000"`
	GroupID          string   `json:"groupId,omitempty" validate:"omitempty,uuid4"`
}

type UpdateEventRequest struct {
	Title            *string  `json:"title,omitempty" validate:"omitempty,min=3,max=200"`
	Description      *string  `json:"description,omitempty" validate:"omitempty,max=4000"`
	Location         *string  `json:"location,omitempty" validate:"omitempty,max=255"`
	LocationName     *string  `json:"locationName,omitempty" validate:"omitempty,max=255"`
	FormattedAddress *string  `json:"formattedAddress,omitempty" validate:"omitempty,max=500"`
	Latitude         *float64 `json:"latitude,omitempty" validate:"omitempty,gte=-90,lte=90"`
	Longitude        *float64 `json:"longitude,omitempty" validate:"omitempty,gte=-180,lte=180"`
	GooglePlaceID    *string  `json:"googlePlaceId,omitempty" validate:"omitempty,max=255"`
	RegionCode       *string  `json:"regionCode,omitempty" validate:"omitempty,max=16"`
	ProvinceCode     *string  `json:"provinceCode,omitempty" validate:"omitempty,max=16"`
	CityCode         *string  `json:"cityCode,omitempty" validate:"omitempty,max=16"`
	BarangayCode     *string  `json:"barangayCode,omitempty" validate:"omitempty,max=16"`
	LocationSource   *string  `json:"locationSource,omitempty" validate:"omitempty,oneof=manual google_places psgc_mapped unmapped"`
	StartsAt         *string  `json:"startsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	EndsAt           *string  `json:"endsAt,omitempty" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
	Status           *string  `json:"status,omitempty" validate:"omitempty,oneof=draft published cancelled completed"`
	Visibility       *string  `json:"visibility,omitempty" validate:"omitempty,oneof=public group_members invite_only"`
	Type             *string  `json:"type,omitempty" validate:"omitempty,max=32"`
	Difficulty       *string  `json:"difficulty,omitempty" validate:"omitempty,oneof=beginner intermediate advanced expert"`
	MaxAttendees     *int     `json:"maxAttendees,omitempty" validate:"omitempty,min=1,max=100000"`
}

type JoinEventRequest struct {
	Notes string `json:"notes,omitempty" validate:"omitempty,max=1000"`
}

type CreateEventResponse struct {
	Event EventResponse `json:"event"`
}

type JoinEventResponse struct {
	Attendee EventAttendeeResponse `json:"attendee"`
}
