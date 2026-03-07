package http

type CreateUserRequest struct {
	Username    string `json:"username"    validate:"required,min=3,max=30"`
	DisplayName string `json:"displayName" validate:"required,min=2,max=80"`
	Bio         string `json:"bio"         validate:"max=500"`
}

type UserResponse struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Bio         string `json:"bio"`
}

type SaveUserResponse struct {
	Saved bool `json:"saved"`
}

// ProfileDetails matches the web's ProfileDetails shape for GET /profiles/:username.
type ProfileDetails struct {
	ID              string  `json:"id"`
	Username        string  `json:"username"`
	Alias           *string `json:"alias"`
	Name            string  `json:"name"`
	Image           *string `json:"image"`
	Bio             string  `json:"bio"`
	Location        *string `json:"location"`
	HomeDiveArea    *string `json:"homeDiveArea"`
	ExperienceLevel *string `json:"experienceLevel"`
	Visibility      string  `json:"visibility"`
}

// ProfileResponse is the envelope payload for GET /profiles/:username (data field).
type ProfileResponse struct {
	Profile       ProfileDetails `json:"profile"`
	PersonalBests []interface{}  `json:"personalBests"`
}
