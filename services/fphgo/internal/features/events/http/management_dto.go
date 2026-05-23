package http

import "time"

type EventCompetitionResponse struct {
	ID                  string    `json:"id"`
	EventID             string    `json:"eventId"`
	Name                string    `json:"name"`
	DescriptionMarkdown string    `json:"descriptionMarkdown,omitempty"`
	RulesMarkdown       string    `json:"rulesMarkdown,omitempty"`
	CoverPhotoURL       string    `json:"coverPhotoUrl,omitempty"`
	SortOrder           int       `json:"sortOrder"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type EventPrizeResponse struct {
	ID                  string    `json:"id"`
	EventID             string    `json:"eventId"`
	CompetitionID       string    `json:"competitionId,omitempty"`
	Title               string    `json:"title"`
	DescriptionMarkdown string    `json:"descriptionMarkdown,omitempty"`
	PhotoURL            string    `json:"photoUrl,omitempty"`
	Placement           string    `json:"placement"`
	PlacementLabel      string    `json:"placementLabel,omitempty"`
	PrizeType           string    `json:"prizeType,omitempty"`
	Amount              *float64  `json:"amount,omitempty"`
	Currency            string    `json:"currency"`
	SponsorID           string    `json:"sponsorId,omitempty"`
	SortOrder           int       `json:"sortOrder"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type EventSponsorResponse struct {
	ID           string    `json:"id"`
	EventID      string    `json:"eventId"`
	Name         string    `json:"name"`
	Tier         string    `json:"tier,omitempty"`
	Description  string    `json:"description,omitempty"`
	LogoMediaID  string    `json:"logoMediaId,omitempty"`
	LogoURL      string    `json:"logoUrl,omitempty"`
	WebsiteURL   string    `json:"websiteUrl,omitempty"`
	SocialURL    string    `json:"socialUrl,omitempty"`
	ContactName  string    `json:"contactName,omitempty"`
	ContactEmail string    `json:"contactEmail,omitempty"`
	SortOrder    int       `json:"sortOrder"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type EventPostResponse struct {
	ID                string    `json:"id"`
	EventID           string    `json:"eventId"`
	AuthorUserID      string    `json:"authorUserId"`
	PostType          string    `json:"postType"`
	Title             string    `json:"title,omitempty"`
	BodyMarkdown      string    `json:"bodyMarkdown"`
	Status            string    `json:"status"`
	IsPinned          bool      `json:"isPinned"`
	FishReactionCount int       `json:"fishReactionCount"`
	ViewerFishReacted bool      `json:"viewerHasFishReacted"`
	AuthorDisplayName string    `json:"authorDisplayName,omitempty"`
	AuthorUsername    string    `json:"authorUsername,omitempty"`
	AuthorAvatarURL   string    `json:"authorAvatarUrl,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type ListCompetitionsResponse struct {
	Competitions []EventCompetitionResponse `json:"competitions"`
}

type CompetitionResponse struct {
	Competition EventCompetitionResponse `json:"competition"`
}

type ListPrizesResponse struct {
	Prizes []EventPrizeResponse `json:"prizes"`
}

type PrizeResponse struct {
	Prize EventPrizeResponse `json:"prize"`
}

type ListSponsorsResponse struct {
	Sponsors []EventSponsorResponse `json:"sponsors"`
}

type SponsorResponse struct {
	Sponsor EventSponsorResponse `json:"sponsor"`
}

type ListPostsResponse struct {
	Posts []EventPostResponse `json:"posts"`
}

type PostResponse struct {
	Post EventPostResponse `json:"post"`
}

type PostReactionResponse struct {
	PostID            string `json:"postId"`
	FishReactionCount int    `json:"fishReactionCount"`
	ViewerFishReacted bool   `json:"viewerHasFishReacted"`
}

type CreateCompetitionRequest struct {
	Name                string `json:"name" validate:"required,min=1,max=160"`
	DescriptionMarkdown string `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	RulesMarkdown       string `json:"rulesMarkdown,omitempty" validate:"omitempty,max=10000"`
	CoverPhotoURL       string `json:"coverPhotoUrl,omitempty" validate:"omitempty,max=1000"`
	SortOrder           int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
}

type UpdateCompetitionRequest struct {
	Name                *string `json:"name,omitempty" validate:"omitempty,min=1,max=160"`
	DescriptionMarkdown *string `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	RulesMarkdown       *string `json:"rulesMarkdown,omitempty" validate:"omitempty,max=10000"`
	CoverPhotoURL       *string `json:"coverPhotoUrl,omitempty" validate:"omitempty,max=1000"`
	SortOrder           *int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
}

type CreatePrizeRequest struct {
	CompetitionID       string   `json:"competitionId,omitempty" validate:"omitempty,uuid"`
	Title               string   `json:"title" validate:"required,min=1,max=160"`
	DescriptionMarkdown string   `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	PhotoURL            string   `json:"photoUrl,omitempty" validate:"omitempty,max=1000"`
	Placement           string   `json:"placement,omitempty" validate:"omitempty,oneof=winner champion first_place second_place third_place special_award sponsor_award custom"`
	PlacementLabel      string   `json:"placementLabel,omitempty" validate:"omitempty,max=120"`
	PrizeType           string   `json:"prizeType,omitempty" validate:"omitempty,oneof=cash item certificate sponsor_gift other"`
	Amount              *float64 `json:"amount,omitempty" validate:"omitempty,min=0"`
	Currency            string   `json:"currency,omitempty" validate:"omitempty,len=3"`
	SponsorID           string   `json:"sponsorId,omitempty" validate:"omitempty,uuid"`
	SortOrder           int      `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
}

type UpdatePrizeRequest struct {
	CompetitionID       *string  `json:"competitionId,omitempty" validate:"omitempty"`
	Title               *string  `json:"title,omitempty" validate:"omitempty,min=1,max=160"`
	DescriptionMarkdown *string  `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	PhotoURL            *string  `json:"photoUrl,omitempty" validate:"omitempty,max=1000"`
	Placement           *string  `json:"placement,omitempty" validate:"omitempty,oneof=winner champion first_place second_place third_place special_award sponsor_award custom"`
	PlacementLabel      *string  `json:"placementLabel,omitempty" validate:"omitempty,max=120"`
	PrizeType           *string  `json:"prizeType,omitempty" validate:"omitempty,oneof=cash item certificate sponsor_gift other"`
	Amount              *float64 `json:"amount,omitempty" validate:"omitempty,min=0"`
	Currency            *string  `json:"currency,omitempty" validate:"omitempty,len=3"`
	SponsorID           *string  `json:"sponsorId,omitempty" validate:"omitempty"`
	SortOrder           *int     `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
}

type CreateSponsorRequest struct {
	Name         string `json:"name" validate:"required,min=1,max=160"`
	Tier         string `json:"tier,omitempty" validate:"omitempty,oneof=presenting major minor partner community media other"`
	Description  string `json:"description,omitempty" validate:"omitempty,max=1000"`
	LogoMediaID  string `json:"logoMediaId,omitempty" validate:"omitempty,uuid"`
	WebsiteURL   string `json:"websiteUrl,omitempty" validate:"omitempty,max=1000"`
	SocialURL    string `json:"socialUrl,omitempty" validate:"omitempty,max=1000"`
	ContactName  string `json:"contactName,omitempty" validate:"omitempty,max=160"`
	ContactEmail string `json:"contactEmail,omitempty" validate:"omitempty,email,max=254"`
	SortOrder    int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	IsActive     *bool  `json:"isActive,omitempty"`
}

type UpdateSponsorRequest struct {
	Name         *string `json:"name,omitempty" validate:"omitempty,min=1,max=160"`
	Tier         *string `json:"tier,omitempty" validate:"omitempty,oneof=presenting major minor partner community media other"`
	Description  *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	LogoMediaID  *string `json:"logoMediaId,omitempty" validate:"omitempty"`
	WebsiteURL   *string `json:"websiteUrl,omitempty" validate:"omitempty,max=1000"`
	SocialURL    *string `json:"socialUrl,omitempty" validate:"omitempty,max=1000"`
	ContactName  *string `json:"contactName,omitempty" validate:"omitempty,max=160"`
	ContactEmail *string `json:"contactEmail,omitempty" validate:"omitempty,email,max=254"`
	SortOrder    *int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	IsActive     *bool   `json:"isActive,omitempty"`
}

type CreatePostRequest struct {
	PostType     string `json:"postType,omitempty" validate:"omitempty,oneof=announcement schedule logistics payment competition results general"`
	Title        string `json:"title,omitempty" validate:"omitempty,max=160"`
	BodyMarkdown string `json:"bodyMarkdown" validate:"required,min=1,max=20000"`
	IsPinned     bool   `json:"isPinned"`
}

type UpdatePostRequest struct {
	PostType     *string `json:"postType,omitempty" validate:"omitempty,oneof=announcement schedule logistics payment competition results general"`
	Title        *string `json:"title,omitempty" validate:"omitempty,max=160"`
	BodyMarkdown *string `json:"bodyMarkdown,omitempty" validate:"omitempty,min=1,max=20000"`
	Status       *string `json:"status,omitempty" validate:"omitempty,oneof=published hidden deleted"`
	IsPinned     *bool   `json:"isPinned,omitempty"`
}

type UpdatePostSettingsRequest struct {
	PostsEnabled     bool   `json:"postsEnabled"`
	PostCreatePolicy string `json:"postCreatePolicy" validate:"required,oneof=organizers_only participants"`
}

type EventProgramItemResponse struct {
	ID                  string    `json:"id"`
	EventID             string    `json:"eventId"`
	Title               string    `json:"title"`
	DescriptionMarkdown string    `json:"descriptionMarkdown,omitempty"`
	ProgramDate         string    `json:"programDate,omitempty"`
	StartTime           string    `json:"startTime,omitempty"`
	EndTime             string    `json:"endTime,omitempty"`
	Timezone            string    `json:"timezone,omitempty"`
	LocationLabel       string    `json:"locationLabel,omitempty"`
	CompetitionID       string    `json:"competitionId,omitempty"`
	CompetitionName     string    `json:"competitionName,omitempty"`
	SortOrder           int       `json:"sortOrder"`
	IsHighlighted       bool      `json:"isHighlighted"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

type ListProgramItemsResponse struct {
	ProgramItems []EventProgramItemResponse `json:"programItems"`
}

type ProgramItemResponse struct {
	ProgramItem EventProgramItemResponse `json:"programItem"`
}

type CreateProgramItemRequest struct {
	Title               string `json:"title" validate:"required,min=1,max=200"`
	DescriptionMarkdown string `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	ProgramDate         string `json:"programDate,omitempty" validate:"omitempty,datetime=2006-01-02"`
	StartTime           string `json:"startTime,omitempty" validate:"omitempty"`
	EndTime             string `json:"endTime,omitempty" validate:"omitempty"`
	Timezone            string `json:"timezone,omitempty" validate:"omitempty,max=80"`
	LocationLabel       string `json:"locationLabel,omitempty" validate:"omitempty,max=200"`
	CompetitionID       string `json:"competitionId,omitempty" validate:"omitempty,uuid"`
	SortOrder           int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	IsHighlighted       bool   `json:"isHighlighted"`
}

type UpdateProgramItemRequest struct {
	Title               *string `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	DescriptionMarkdown *string `json:"descriptionMarkdown,omitempty" validate:"omitempty,max=10000"`
	ProgramDate         *string `json:"programDate,omitempty" validate:"omitempty"`
	StartTime           *string `json:"startTime,omitempty" validate:"omitempty"`
	EndTime             *string `json:"endTime,omitempty" validate:"omitempty"`
	Timezone            *string `json:"timezone,omitempty" validate:"omitempty,max=80"`
	LocationLabel       *string `json:"locationLabel,omitempty" validate:"omitempty,max=200"`
	CompetitionID       *string `json:"competitionId,omitempty" validate:"omitempty"`
	SortOrder           *int    `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	IsHighlighted       *bool   `json:"isHighlighted,omitempty"`
}

type UpdateParticipantRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=participant organizer"`
}

type UpdateParticipantStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=attended no_show confirmed cancelled"`
}

type UpdateEventModulesRequest struct {
	Modules EventModulesRequest `json:"modules" validate:"required"`
}

type JoinFormFieldResponse struct {
	ID        string    `json:"id"`
	EventID   string    `json:"eventId"`
	FieldKey  string    `json:"fieldKey"`
	Label     string    `json:"label"`
	FieldType string    `json:"fieldType"`
	Required  bool      `json:"required"`
	Options   []string  `json:"options"`
	SortOrder int       `json:"sortOrder"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ListJoinFormFieldsResponse struct {
	Fields []JoinFormFieldResponse `json:"fields"`
}

type JoinFormFieldRequest struct {
	FieldKey  string   `json:"fieldKey" validate:"required,min=1,max=80"`
	Label     string   `json:"label" validate:"required,min=1,max=160"`
	FieldType string   `json:"fieldType" validate:"required,oneof=short_text long_text select checkbox phone email"`
	Required  bool     `json:"required"`
	Options   []string `json:"options,omitempty"`
	SortOrder int      `json:"sortOrder,omitempty" validate:"omitempty,min=0,max=100000"`
	Enabled   bool     `json:"enabled"`
}

type UpdateJoinFormFieldsRequest struct {
	Fields []JoinFormFieldRequest `json:"fields" validate:"required,dive"`
}

type DuplicateEventRequest struct {
	Title               string `json:"title,omitempty" validate:"omitempty,min=3,max=200"`
	StartsAt            string `json:"startsAt" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	EndsAt              string `json:"endsAt" validate:"required,datetime=2006-01-02T15:04:05Z07:00"`
	CopyPaymentSetup    bool   `json:"copyPaymentSetup"`
	CopyAwards          bool   `json:"copyAwards"`
	CopySponsors        bool   `json:"copySponsors"`
	CopyPosts           bool   `json:"copyPosts"`
	CopyProgram         bool   `json:"copyProgram"`
	CopySafetyLogistics bool   `json:"copySafetyLogistics"`
}
