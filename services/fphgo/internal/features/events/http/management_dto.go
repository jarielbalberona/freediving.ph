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

type UpdateParticipantRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=participant organizer"`
}
