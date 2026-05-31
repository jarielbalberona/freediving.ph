package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	groupsqlc "fphgo/internal/features/groups/repo/sqlc"
)

type Repo struct {
	db      groupsqlc.DBTX
	queries *groupsqlc.Queries
}

type Group struct {
	ID                     string
	Name                   string
	Slug                   string
	Bio                    string
	Description            string
	LogoMediaID            string
	LogoURL                string
	CoverMediaID           string
	CoverURL               string
	Visibility             string
	Status                 string
	JoinPolicy             string
	Location               string
	LocationName           string
	FormattedAddress       string
	Latitude               *float64
	Longitude              *float64
	GooglePlaceID          string
	RegionCode             string
	ProvinceCode           string
	CityCode               string
	BarangayCode           string
	LocationSource         string
	MemberCount            int
	EventCount             int
	PostCount              int
	CreatedBy              string
	CreatedAt              time.Time
	UpdatedAt              time.Time
	ViewerRole             string
	ViewerMembershipStatus string
	ViewerJoinedAt         *time.Time
	ViewerInvitedAt        *time.Time
}

type GroupMember struct {
	GroupID     string
	UserID      string
	Role        string
	Status      string
	InvitedBy   string
	InvitedAt   *time.Time
	RespondedAt *time.Time
	JoinedAt    *time.Time
	LeftAt      *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Username    string
	DisplayName string
	AvatarURL   string
}

type GroupPost struct {
	ID              string
	GroupID         string
	AuthorUserID    string
	Title           string
	Content         string
	Status          string
	LikeCount       int64
	CommentCount    int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
	AuthorName      string
	AuthorUsername  string
	AuthorAvatarURL string
}

type ListGroupsInput struct {
	ViewerUserID string
	Search       string
	Visibility   string
	Mine         bool
	Page         int
	Limit        int
}

type ListGroupMembersInput struct {
	GroupID string
	Page    int
	Limit   int
}

type ListGroupPostsInput struct {
	GroupID string
	Page    int
	Limit   int
}

type CreateGroupInput struct {
	Name             string
	Slug             string
	Bio              string
	Description      string
	Visibility       string
	JoinPolicy       string
	Location         string
	LocationName     string
	FormattedAddress string
	Latitude         *float64
	Longitude        *float64
	GooglePlaceID    string
	RegionCode       string
	ProvinceCode     string
	CityCode         string
	BarangayCode     string
	LocationSource   string
	CreatedBy        string
}

type UpdateGroupInput struct {
	GroupID          string
	Name             *string
	Bio              *string
	Description      *string
	LogoMediaID      *string
	CoverMediaID     *string
	Visibility       *string
	Status           *string
	JoinPolicy       *string
	Location         *string
	LocationName     *string
	FormattedAddress *string
	Latitude         *float64
	Longitude        *float64
	GooglePlaceID    *string
	RegionCode       *string
	ProvinceCode     *string
	CityCode         *string
	BarangayCode     *string
	LocationSource   *string
}

type CreateGroupPostInput struct {
	GroupID      string
	AuthorUserID string
	Title        string
	Content      string
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{db: pool, queries: groupsqlc.New(pool)}
}

func (r *Repo) ListGroups(ctx context.Context, input ListGroupsInput) ([]Group, int, error) {
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 {
		input.Limit = 20
	}
	rows, err := r.queries.ListGroups(ctx, groupsqlc.ListGroupsParams{
		ViewerUserID: uuidParam(input.ViewerUserID),
		Mine:         input.Mine,
		Visibility:   optionalString(input.Visibility),
		Search:       optionalString(input.Search),
		OffsetRows:   int32((input.Page - 1) * input.Limit),
		LimitRows:    int32(input.Limit),
	})
	if err != nil {
		return nil, 0, err
	}

	items := make([]Group, 0, len(rows))
	total := 0
	for _, row := range rows {
		items = append(items, mapListGroup(row))
		total = int(row.TotalCount)
	}
	return items, total, nil
}

func (r *Repo) GetGroupByID(ctx context.Context, groupID, viewerUserID string) (Group, error) {
	row, err := r.queries.GetGroupByID(ctx, groupsqlc.GetGroupByIDParams{
		ViewerUserID: uuidParam(viewerUserID),
		GroupID:      uuidParam(groupID),
	})
	if err != nil {
		return Group{}, err
	}
	return mapGetGroup(row), nil
}

func (r *Repo) GetGroupBySlug(ctx context.Context, slug, viewerUserID string) (Group, error) {
	row, err := r.queries.GetGroupBySlug(ctx, groupsqlc.GetGroupBySlugParams{
		ViewerUserID: uuidParam(viewerUserID),
		Slug:         slug,
	})
	if err != nil {
		return Group{}, err
	}
	return mapGetGroupBySlug(row), nil
}

func (r *Repo) SlugExists(ctx context.Context, slug string) (bool, error) {
	return r.queries.SlugExists(ctx, slug)
}

func (r *Repo) CreateGroup(ctx context.Context, input CreateGroupInput) (Group, error) {
	row, err := r.queries.CreateGroup(ctx, groupsqlc.CreateGroupParams{
		Name:                 input.Name,
		Slug:                 input.Slug,
		Bio:                  optionalString(input.Bio),
		Description:          optionalString(input.Description),
		Visibility:           input.Visibility,
		JoinPolicy:           input.JoinPolicy,
		Location:             optionalString(input.Location),
		LocationName:         optionalString(input.LocationName),
		FormattedAddress:     optionalString(input.FormattedAddress),
		Lat:                  input.Latitude,
		Lng:                  input.Longitude,
		GooglePlaceID:        optionalString(input.GooglePlaceID),
		RegionCode:           optionalString(input.RegionCode),
		ProvinceCode:         optionalString(input.ProvinceCode),
		CityMunicipalityCode: optionalString(input.CityCode),
		BarangayCode:         optionalString(input.BarangayCode),
		LocationSource:       input.LocationSource,
		CreatedBy:            uuidParam(input.CreatedBy),
	})
	if err != nil {
		return Group{}, err
	}
	return mapCreateGroup(row), nil
}

func (r *Repo) AddOwnerMembership(ctx context.Context, groupID, userID string) error {
	return r.queries.AddOwnerMembership(ctx, groupsqlc.AddOwnerMembershipParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
	})
}

func (r *Repo) UpdateGroup(ctx context.Context, input UpdateGroupInput) (Group, error) {
	params := groupsqlc.UpdateGroupParams{
		GroupID: uuidParam(input.GroupID),
	}
	if input.Name != nil {
		params.SetName = true
		params.Name = *input.Name
	}
	if input.Bio != nil {
		params.SetBio = true
		params.Bio = optionalString(*input.Bio)
	}
	if input.Description != nil {
		params.SetDescription = true
		params.Description = optionalString(*input.Description)
	}
	if input.LogoMediaID != nil {
		params.SetLogoMediaID = true
		params.LogoMediaID = optionalString(*input.LogoMediaID)
	}
	if input.CoverMediaID != nil {
		params.SetCoverMediaID = true
		params.CoverMediaID = optionalString(*input.CoverMediaID)
	}
	if input.Visibility != nil {
		params.SetVisibility = true
		params.Visibility = *input.Visibility
	}
	if input.Status != nil {
		params.SetStatus = true
		params.Status = *input.Status
	}
	if input.JoinPolicy != nil {
		params.SetJoinPolicy = true
		params.JoinPolicy = *input.JoinPolicy
	}
	if input.Location != nil {
		params.SetLocation = true
		params.Location = optionalString(*input.Location)
	}
	if input.LocationName != nil {
		params.SetLocationName = true
		params.LocationName = optionalString(*input.LocationName)
	}
	if input.FormattedAddress != nil {
		params.SetFormattedAddress = true
		params.FormattedAddress = optionalString(*input.FormattedAddress)
	}
	if input.Latitude != nil {
		params.SetLat = true
		params.Lat = input.Latitude
	}
	if input.Longitude != nil {
		params.SetLng = true
		params.Lng = input.Longitude
	}
	if input.GooglePlaceID != nil {
		params.SetGooglePlaceID = true
		params.GooglePlaceID = optionalString(*input.GooglePlaceID)
	}
	if input.RegionCode != nil {
		params.SetRegionCode = true
		params.RegionCode = optionalString(*input.RegionCode)
	}
	if input.ProvinceCode != nil {
		params.SetProvinceCode = true
		params.ProvinceCode = optionalString(*input.ProvinceCode)
	}
	if input.CityCode != nil {
		params.SetCityMunicipalityCode = true
		params.CityMunicipalityCode = optionalString(*input.CityCode)
	}
	if input.BarangayCode != nil {
		params.SetBarangayCode = true
		params.BarangayCode = optionalString(*input.BarangayCode)
	}
	if input.LocationSource != nil {
		params.SetLocationSource = true
		params.LocationSource = *input.LocationSource
	}

	row, err := r.queries.UpdateGroup(ctx, params)
	if err != nil {
		return Group{}, err
	}
	return mapUpdateGroup(row), nil
}

func (r *Repo) MediaBelongsToGroup(ctx context.Context, groupID, mediaID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
SELECT EXISTS (
	SELECT 1
	FROM media_objects
	WHERE id = $2::uuid
	  AND context_id = $1::uuid
	  AND context_type IN ('group_logo', 'group_cover')
	  AND state = 'active'
)`, groupID, mediaID).Scan(&exists)
	return exists, err
}

func (r *Repo) GetMembership(ctx context.Context, groupID, userID string) (GroupMember, error) {
	row, err := r.queries.GetMembership(ctx, groupsqlc.GetMembershipParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
	})
	if err != nil {
		return GroupMember{}, err
	}
	return mapGetMembership(row), nil
}

func (r *Repo) UpsertMembership(ctx context.Context, groupID, userID, role, status string) (GroupMember, error) {
	row, err := r.queries.UpsertMembership(ctx, groupsqlc.UpsertMembershipParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
		Role:    role,
		Status:  status,
	})
	if err != nil {
		return GroupMember{}, err
	}
	return mapUpsertMembership(row), nil
}

func (r *Repo) InviteMember(ctx context.Context, groupID, userID, invitedBy string) (GroupMember, error) {
	row, err := r.queries.InviteMember(ctx, groupsqlc.InviteMemberParams{
		GroupID:   uuidParam(groupID),
		UserID:    uuidParam(userID),
		InvitedBy: uuidParam(invitedBy),
	})
	if err != nil {
		return GroupMember{}, err
	}
	return mapInviteMember(row), nil
}

func (r *Repo) AcceptInvite(ctx context.Context, groupID, userID string) (GroupMember, error) {
	row, err := r.queries.AcceptInvite(ctx, groupsqlc.AcceptInviteParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
	})
	if err != nil {
		return GroupMember{}, err
	}
	return mapAcceptInvite(row), nil
}

func (r *Repo) RejectInvite(ctx context.Context, groupID, userID string) (GroupMember, error) {
	row, err := r.queries.RejectInvite(ctx, groupsqlc.RejectInviteParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
	})
	if err != nil {
		return GroupMember{}, err
	}
	return mapRejectInvite(row), nil
}

func (r *Repo) LeaveGroup(ctx context.Context, groupID, userID string) error {
	return r.queries.LeaveGroup(ctx, groupsqlc.LeaveGroupParams{
		GroupID: uuidParam(groupID),
		UserID:  uuidParam(userID),
	})
}

func (r *Repo) ListMembers(ctx context.Context, input ListGroupMembersInput) ([]GroupMember, int, error) {
	rows, err := r.queries.ListMembers(ctx, groupsqlc.ListMembersParams{
		GroupID:    uuidParam(input.GroupID),
		OffsetRows: int32((input.Page - 1) * input.Limit),
		LimitRows:  int32(input.Limit),
	})
	if err != nil {
		return nil, 0, err
	}
	items := make([]GroupMember, 0, len(rows))
	total := 0
	for _, row := range rows {
		items = append(items, mapListMember(row))
		total = int(row.TotalCount)
	}
	return items, total, nil
}

func (r *Repo) ListPosts(ctx context.Context, input ListGroupPostsInput) ([]GroupPost, int, error) {
	rows, err := r.queries.ListPosts(ctx, groupsqlc.ListPostsParams{
		GroupID:    uuidParam(input.GroupID),
		OffsetRows: int32((input.Page - 1) * input.Limit),
		LimitRows:  int32(input.Limit),
	})
	if err != nil {
		return nil, 0, err
	}
	items := make([]GroupPost, 0, len(rows))
	total := 0
	for _, row := range rows {
		items = append(items, mapListPost(row))
		total = int(row.TotalCount)
	}
	return items, total, nil
}

func (r *Repo) CreatePost(ctx context.Context, input CreateGroupPostInput) (GroupPost, error) {
	row, err := r.queries.CreatePost(ctx, groupsqlc.CreatePostParams{
		GroupID:      uuidParam(input.GroupID),
		AuthorUserID: uuidParam(input.AuthorUserID),
		Title:        input.Title,
		Content:      input.Content,
	})
	if err != nil {
		return GroupPost{}, err
	}
	return mapCreatePost(row), nil
}

func (r *Repo) UserIsActive(ctx context.Context, userID string) (bool, error) {
	return r.queries.UserIsActive(ctx, uuidParam(userID))
}

func mapListGroup(row groupsqlc.ListGroupsRow) Group {
	return Group{
		ID:                     uuidString(row.ID),
		Name:                   row.Name,
		Slug:                   row.Slug,
		Bio:                    row.Bio,
		Description:            row.Description,
		LogoMediaID:            row.LogoMediaID,
		LogoURL:                row.LogoUrl,
		CoverMediaID:           row.CoverMediaID,
		CoverURL:               row.CoverUrl,
		Visibility:             row.Visibility,
		Status:                 row.Status,
		JoinPolicy:             row.JoinPolicy,
		Location:               row.Location,
		LocationName:           row.LocationName,
		FormattedAddress:       row.FormattedAddress,
		Latitude:               row.Lat,
		Longitude:              row.Lng,
		GooglePlaceID:          row.GooglePlaceID,
		RegionCode:             row.RegionCode,
		ProvinceCode:           row.ProvinceCode,
		CityCode:               row.CityMunicipalityCode,
		BarangayCode:           row.BarangayCode,
		LocationSource:         row.LocationSource,
		MemberCount:            int(row.MemberCount),
		EventCount:             int(row.EventCount),
		PostCount:              int(row.PostCount),
		CreatedBy:              uuidString(row.CreatedBy),
		CreatedAt:              timeValue(row.CreatedAt),
		UpdatedAt:              timeValue(row.UpdatedAt),
		ViewerRole:             row.ViewerRole,
		ViewerMembershipStatus: row.ViewerMembershipStatus,
		ViewerJoinedAt:         timePtr(row.ViewerJoinedAt),
		ViewerInvitedAt:        timePtr(row.ViewerInvitedAt),
	}
}

func mapGetGroup(row groupsqlc.GetGroupByIDRow) Group {
	group := Group{
		ID:                     uuidString(row.ID),
		Name:                   row.Name,
		Slug:                   row.Slug,
		Bio:                    row.Bio,
		Description:            row.Description,
		LogoMediaID:            row.LogoMediaID,
		LogoURL:                row.LogoUrl,
		CoverMediaID:           row.CoverMediaID,
		CoverURL:               row.CoverUrl,
		Visibility:             row.Visibility,
		Status:                 row.Status,
		JoinPolicy:             row.JoinPolicy,
		Location:               row.Location,
		LocationName:           row.LocationName,
		FormattedAddress:       row.FormattedAddress,
		Latitude:               row.Lat,
		Longitude:              row.Lng,
		GooglePlaceID:          row.GooglePlaceID,
		RegionCode:             row.RegionCode,
		ProvinceCode:           row.ProvinceCode,
		CityCode:               row.CityMunicipalityCode,
		BarangayCode:           row.BarangayCode,
		LocationSource:         row.LocationSource,
		MemberCount:            int(row.MemberCount),
		EventCount:             int(row.EventCount),
		PostCount:              int(row.PostCount),
		CreatedBy:              uuidString(row.CreatedBy),
		CreatedAt:              timeValue(row.CreatedAt),
		UpdatedAt:              timeValue(row.UpdatedAt),
		ViewerRole:             row.ViewerRole,
		ViewerMembershipStatus: row.ViewerMembershipStatus,
		ViewerJoinedAt:         timePtr(row.ViewerJoinedAt),
		ViewerInvitedAt:        timePtr(row.ViewerInvitedAt),
	}
	return group
}

func mapGetGroupBySlug(row groupsqlc.GetGroupBySlugRow) Group {
	return Group{
		ID:                     uuidString(row.ID),
		Name:                   row.Name,
		Slug:                   row.Slug,
		Bio:                    row.Bio,
		Description:            row.Description,
		LogoMediaID:            row.LogoMediaID,
		LogoURL:                row.LogoUrl,
		CoverMediaID:           row.CoverMediaID,
		CoverURL:               row.CoverUrl,
		Visibility:             row.Visibility,
		Status:                 row.Status,
		JoinPolicy:             row.JoinPolicy,
		Location:               row.Location,
		LocationName:           row.LocationName,
		FormattedAddress:       row.FormattedAddress,
		Latitude:               row.Lat,
		Longitude:              row.Lng,
		GooglePlaceID:          row.GooglePlaceID,
		RegionCode:             row.RegionCode,
		ProvinceCode:           row.ProvinceCode,
		CityCode:               row.CityMunicipalityCode,
		BarangayCode:           row.BarangayCode,
		LocationSource:         row.LocationSource,
		MemberCount:            int(row.MemberCount),
		EventCount:             int(row.EventCount),
		PostCount:              int(row.PostCount),
		CreatedBy:              uuidString(row.CreatedBy),
		CreatedAt:              timeValue(row.CreatedAt),
		UpdatedAt:              timeValue(row.UpdatedAt),
		ViewerRole:             row.ViewerRole,
		ViewerMembershipStatus: row.ViewerMembershipStatus,
		ViewerJoinedAt:         timePtr(row.ViewerJoinedAt),
		ViewerInvitedAt:        timePtr(row.ViewerInvitedAt),
	}
}

func mapCreateGroup(row groupsqlc.CreateGroupRow) Group {
	return Group{
		ID:                     uuidString(row.ID),
		Name:                   row.Name,
		Slug:                   row.Slug,
		Bio:                    row.Bio,
		Description:            row.Description,
		LogoMediaID:            row.LogoMediaID,
		LogoURL:                row.LogoUrl,
		CoverMediaID:           row.CoverMediaID,
		CoverURL:               row.CoverUrl,
		Visibility:             row.Visibility,
		Status:                 row.Status,
		JoinPolicy:             row.JoinPolicy,
		Location:               row.Location,
		LocationName:           row.LocationName,
		FormattedAddress:       row.FormattedAddress,
		Latitude:               row.Lat,
		Longitude:              row.Lng,
		GooglePlaceID:          row.GooglePlaceID,
		RegionCode:             row.RegionCode,
		ProvinceCode:           row.ProvinceCode,
		CityCode:               row.CityMunicipalityCode,
		BarangayCode:           row.BarangayCode,
		LocationSource:         row.LocationSource,
		MemberCount:            int(row.MemberCount),
		EventCount:             int(row.EventCount),
		PostCount:              int(row.PostCount),
		CreatedBy:              uuidString(row.CreatedBy),
		CreatedAt:              timeValue(row.CreatedAt),
		UpdatedAt:              timeValue(row.UpdatedAt),
		ViewerRole:             row.ViewerRole,
		ViewerMembershipStatus: row.ViewerMembershipStatus,
		ViewerJoinedAt:         timePtr(row.ViewerJoinedAt),
		ViewerInvitedAt:        timePtr(row.ViewerInvitedAt),
	}
}

func mapUpdateGroup(row groupsqlc.UpdateGroupRow) Group {
	return Group{
		ID:                     uuidString(row.ID),
		Name:                   row.Name,
		Slug:                   row.Slug,
		Bio:                    row.Bio,
		Description:            row.Description,
		LogoMediaID:            row.LogoMediaID,
		LogoURL:                row.LogoUrl,
		CoverMediaID:           row.CoverMediaID,
		CoverURL:               row.CoverUrl,
		Visibility:             row.Visibility,
		Status:                 row.Status,
		JoinPolicy:             row.JoinPolicy,
		Location:               row.Location,
		LocationName:           row.LocationName,
		FormattedAddress:       row.FormattedAddress,
		Latitude:               row.Lat,
		Longitude:              row.Lng,
		GooglePlaceID:          row.GooglePlaceID,
		RegionCode:             row.RegionCode,
		ProvinceCode:           row.ProvinceCode,
		CityCode:               row.CityMunicipalityCode,
		BarangayCode:           row.BarangayCode,
		LocationSource:         row.LocationSource,
		MemberCount:            int(row.MemberCount),
		EventCount:             int(row.EventCount),
		PostCount:              int(row.PostCount),
		CreatedBy:              uuidString(row.CreatedBy),
		CreatedAt:              timeValue(row.CreatedAt),
		UpdatedAt:              timeValue(row.UpdatedAt),
		ViewerRole:             row.ViewerRole,
		ViewerMembershipStatus: row.ViewerMembershipStatus,
		ViewerJoinedAt:         timePtr(row.ViewerJoinedAt),
		ViewerInvitedAt:        timePtr(row.ViewerInvitedAt),
	}
}

func mapGetMembership(row groupsqlc.GetMembershipRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func mapUpsertMembership(row groupsqlc.UpsertMembershipRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func mapInviteMember(row groupsqlc.InviteMemberRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func mapAcceptInvite(row groupsqlc.AcceptInviteRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func mapRejectInvite(row groupsqlc.RejectInviteRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func mapListMember(row groupsqlc.ListMembersRow) GroupMember {
	return groupMember(row.GroupID, row.UserID, row.Role, row.Status, row.InvitedBy, row.InvitedAt, row.RespondedAt, row.JoinedAt, row.LeftAt, row.CreatedAt, row.UpdatedAt, row.Username, row.DisplayName, row.AvatarUrl)
}

func groupMember(groupID, userID pgtype.UUID, role, status string, invitedBy pgtype.UUID, invitedAt, respondedAt, joinedAt, leftAt, createdAt, updatedAt pgtype.Timestamptz, username, displayName, avatarURL string) GroupMember {
	return GroupMember{
		GroupID:     uuidString(groupID),
		UserID:      uuidString(userID),
		Role:        role,
		Status:      status,
		InvitedBy:   uuidString(invitedBy),
		InvitedAt:   timePtr(invitedAt),
		RespondedAt: timePtr(respondedAt),
		JoinedAt:    timePtr(joinedAt),
		LeftAt:      timePtr(leftAt),
		CreatedAt:   timeValue(createdAt),
		UpdatedAt:   timeValue(updatedAt),
		Username:    username,
		DisplayName: displayName,
		AvatarURL:   avatarURL,
	}
}

func mapListPost(row groupsqlc.ListPostsRow) GroupPost {
	return GroupPost{
		ID:              uuidString(row.ID),
		GroupID:         uuidString(row.GroupID),
		AuthorUserID:    uuidString(row.AuthorUserID),
		Title:           row.Title,
		Content:         row.Content,
		Status:          row.Status,
		LikeCount:       row.LikeCount,
		CommentCount:    row.CommentCount,
		CreatedAt:       timeValue(row.CreatedAt),
		UpdatedAt:       timeValue(row.UpdatedAt),
		AuthorName:      row.AuthorName,
		AuthorUsername:  row.AuthorUsername,
		AuthorAvatarURL: row.AuthorAvatarUrl,
	}
}

func mapCreatePost(row groupsqlc.CreatePostRow) GroupPost {
	return GroupPost{
		ID:              uuidString(row.ID),
		GroupID:         uuidString(row.GroupID),
		AuthorUserID:    uuidString(row.AuthorUserID),
		Title:           row.Title,
		Content:         row.Content,
		Status:          row.Status,
		LikeCount:       row.LikeCount,
		CommentCount:    row.CommentCount,
		CreatedAt:       timeValue(row.CreatedAt),
		UpdatedAt:       timeValue(row.UpdatedAt),
		AuthorName:      row.AuthorName,
		AuthorUsername:  row.AuthorUsername,
		AuthorAvatarURL: row.AuthorAvatarUrl,
	}
}

func uuidParam(value string) pgtype.UUID {
	parsed, err := uuid.Parse(value)
	if err != nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	return uuid.UUID(value.Bytes).String()
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	v := value
	return &v
}

func timeValue(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time.UTC()
}

func timePtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	t := value.Time.UTC()
	return &t
}

func IsNoRows(err error) bool {
	return err == pgx.ErrNoRows
}
