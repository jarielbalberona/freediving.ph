package http

type ProfileResponse struct {
	Profile Profile `json:"profile"`
}

type SearchUsersResponse struct {
	Items []Profile `json:"items"`
}

type Profile struct {
	UserID      string            `json:"userId"`
	Username    string            `json:"username"`
	DisplayName string            `json:"displayName"`
	Bio         string            `json:"bio"`
	AvatarURL   string            `json:"avatarUrl"`
	Location    string            `json:"location"`
	Socials     map[string]string `json:"socials"`
}

type UpdateMyProfileRequest struct {
	DisplayName *string            `json:"displayName" validate:"omitempty,min=1,max=80"`
	Bio         *string            `json:"bio"         validate:"omitempty,max=500"`
	AvatarURL   *string            `json:"avatarUrl"   validate:"omitempty,url,max=500"`
	Location    *string            `json:"location"    validate:"omitempty,max=120"`
	Socials     *SocialLinksUpdate `json:"socials"`
}

type SocialLinksUpdate struct {
	Website   *string `json:"website"   validate:"omitempty,url,max=255"`
	Instagram *string `json:"instagram" validate:"omitempty,url,max=255"`
	X         *string `json:"x"         validate:"omitempty,url,max=255"`
	Facebook  *string `json:"facebook"  validate:"omitempty,url,max=255"`
	Tiktok    *string `json:"tiktok"    validate:"omitempty,url,max=255"`
	YouTube   *string `json:"youtube"   validate:"omitempty,url,max=255"`
}
