package repo

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	mediaqlc "fphgo/internal/features/media/repo/sqlc"
)

type Repo struct {
	pool    *pgxpool.Pool
	queries *mediaqlc.Queries
}

type MediaObject struct {
	ID             string
	OwnerAppUserID string
	ContextType    string
	ContextID      *string
	ObjectKey      string
	MimeType       string
	SizeBytes      int64
	Width          int32
	Height         int32
	State          string
	CreatedAt      time.Time
}

type CreateMediaObjectInput struct {
	OwnerAppUserID string
	ContextType    string
	ContextID      *string
	ObjectKey      string
	MimeType       string
	SizeBytes      int64
	Width          int32
	Height         int32
	State          string
}

type MediaUploadGroup struct {
	ID              string
	AuthorAppUserID string
	Source          string
	ItemCount       int32
	CreatedAt       time.Time
}

type MediaPost struct {
	ID              string
	AuthorAppUserID string
	UploadGroupID   string
	DiveSiteID      string
	PostCaption     *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       *time.Time
}

type PostSocialState struct {
	PostID            string
	AuthorUserID      string
	AuthorUsername    string
	AuthorDisplayName string
	AuthorAvatarURL   string
	LikeCount         int64
	CommentCount      int64
	ViewerHasLiked    bool
	ViewerHasSaved    bool
}

type SaveState struct {
	PostID         string
	ViewerHasSaved bool
}

type CommentLikeState struct {
	CommentID      string
	PostID         string
	LikeCount      int64
	ViewerHasLiked bool
}

type MediaItem struct {
	ID              string
	PostID          string
	MediaObjectID   string
	AuthorAppUserID string
	UploadGroupID   string
	DiveSiteID      string
	Type            string
	StorageKey      string
	MimeType        string
	Width           int32
	Height          int32
	DurationMs      *int32
	Caption         *string
	SortOrder       int32
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       *time.Time
}

type PublishMediaPostInput struct {
	AuthorAppUserID string
	Source          string
	DiveSiteID      string
	PostCaption     *string
	Items           []CreateMediaItemInput
}

type CreateMediaItemInput struct {
	MediaObjectID   string
	AuthorAppUserID string
	DiveSiteID      string
	Type            string
	StorageKey      string
	MimeType        string
	Width           int32
	Height          int32
	DurationMs      *int32
	Caption         *string
	SortOrder       int32
	Status          string
}

type ProfileMediaItem struct {
	MediaItem
	PostCaption    *string
	DiveSiteSlug   string
	DiveSiteName   string
	DiveSiteArea   string
	LikeCount      int64
	CommentCount   int64
	ViewerHasLiked bool
	ViewerHasSaved bool
}

type MediaPostDetailItem struct {
	ProfileMediaItem
	AuthorUsername    string
	AuthorDisplayName string
	AuthorAvatarURL   string
	PostCreatedAt     time.Time
	PostUpdatedAt     time.Time
}

type MediaPostComment struct {
	ID                string
	PostID            string
	AuthorUserID      string
	AuthorUsername    string
	AuthorDisplayName string
	AuthorAvatarURL   string
	Body              string
	LikeCount         int64
	ViewerHasLiked    bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type ListMediaByOwnerInput struct {
	OwnerAppUserID string
	CursorCreated  time.Time
	CursorID       string
	Limit          int32
}

type ListMediaByContextInput struct {
	ContextType   string
	ContextID     *string
	CursorCreated time.Time
	CursorID      string
	Limit         int32
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool, queries: mediaqlc.New(pool)}
}

func (r *Repo) CreateMediaObject(ctx context.Context, input CreateMediaObjectInput) (MediaObject, error) {
	row, err := r.queries.CreateMediaObject(ctx, mediaqlc.CreateMediaObjectParams{
		OwnerAppUserID: toUUID(input.OwnerAppUserID),
		ContextType:    input.ContextType,
		ContextID:      toUUIDPtr(input.ContextID),
		ObjectKey:      input.ObjectKey,
		MimeType:       input.MimeType,
		SizeBytes:      input.SizeBytes,
		Width:          input.Width,
		Height:         input.Height,
		State:          input.State,
	})
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func (r *Repo) GetMediaObjectByID(ctx context.Context, mediaID string) (MediaObject, error) {
	row, err := r.queries.GetMediaObjectByID(ctx, toUUID(mediaID))
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func (r *Repo) GetMediaObjectsByIDs(ctx context.Context, mediaIDs []string) ([]MediaObject, error) {
	ids := make([]pgtype.UUID, 0, len(mediaIDs))
	for _, id := range mediaIDs {
		ids = append(ids, toUUID(id))
	}
	rows, err := r.queries.GetMediaObjectsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) ListMediaByOwner(ctx context.Context, input ListMediaByOwnerInput) ([]MediaObject, error) {
	rows, err := r.queries.ListMediaByOwner(ctx, mediaqlc.ListMediaByOwnerParams{
		OwnerAppUserID: toUUID(input.OwnerAppUserID),
		CreatedAt:      toTimestamptz(input.CursorCreated),
		ID:             toUUID(input.CursorID),
		Limit:          input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) ListMediaByContext(ctx context.Context, input ListMediaByContextInput) ([]MediaObject, error) {
	rows, err := r.queries.ListMediaByContext(ctx, mediaqlc.ListMediaByContextParams{
		ContextType: input.ContextType,
		ContextID:   toUUIDPtr(input.ContextID),
		CreatedAt:   toTimestamptz(input.CursorCreated),
		ID:          toUUID(input.CursorID),
		Limit:       input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaObject, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMedia(row))
	}
	return items, nil
}

func (r *Repo) UpdateMediaState(ctx context.Context, mediaID, state string) (MediaObject, error) {
	row, err := r.queries.UpdateMediaState(ctx, mediaqlc.UpdateMediaStateParams{ID: toUUID(mediaID), State: state})
	if err != nil {
		return MediaObject{}, err
	}
	return mapMedia(row), nil
}

func (r *Repo) PublishMediaPost(ctx context.Context, input PublishMediaPostInput) (MediaPost, []MediaItem, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return MediaPost{}, nil, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	q := mediaqlc.New(tx)
	group, err := q.CreateMediaUploadGroup(ctx, mediaqlc.CreateMediaUploadGroupParams{
		AuthorAppUserID: toUUID(input.AuthorAppUserID),
		Source:          input.Source,
		ItemCount:       int32(len(input.Items)),
	})
	if err != nil {
		return MediaPost{}, nil, err
	}

	post, err := q.CreateMediaPost(ctx, mediaqlc.CreateMediaPostParams{
		AuthorAppUserID: toUUID(input.AuthorAppUserID),
		UploadGroupID:   group.ID,
		DiveSiteID:      toUUID(input.DiveSiteID),
		PostCaption:     stringPtr(input.PostCaption),
	})
	if err != nil {
		return MediaPost{}, nil, err
	}

	items := make([]MediaItem, 0, len(input.Items))
	for _, item := range input.Items {
		created, createErr := q.CreateMediaItem(ctx, mediaqlc.CreateMediaItemParams{
			PostID:          post.ID,
			MediaObjectID:   toUUID(item.MediaObjectID),
			AuthorAppUserID: toUUID(item.AuthorAppUserID),
			UploadGroupID:   group.ID,
			DiveSiteID:      toUUID(item.DiveSiteID),
			Type:            item.Type,
			StorageKey:      item.StorageKey,
			MimeType:        item.MimeType,
			Width:           item.Width,
			Height:          item.Height,
			DurationMs:      item.DurationMs,
			Caption:         stringPtr(item.Caption),
			SortOrder:       item.SortOrder,
			Status:          item.Status,
		})
		if createErr != nil {
			return MediaPost{}, nil, createErr
		}
		items = append(items, mapMediaItem(created))
	}

	if err := tx.Commit(ctx); err != nil {
		return MediaPost{}, nil, err
	}

	return mapMediaPost(post), items, nil
}

func (r *Repo) ListProfileMediaByUsername(ctx context.Context, input ListProfileMediaInput) ([]ProfileMediaItem, error) {
	rows, err := r.queries.ListProfileMediaByUsername(ctx, mediaqlc.ListProfileMediaByUsernameParams{
		ViewerUserID: toUUID(input.ViewerUserID),
		Username:     input.Username,
		CreatedAt:    toTimestamptz(input.CursorCreated),
		ID:           toUUID(input.CursorID),
		LimitCount:   input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]ProfileMediaItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapProfileMediaItem(row))
	}
	return items, nil
}

type ListProfileMediaInput struct {
	Username      string
	ViewerUserID  string
	CursorCreated time.Time
	CursorID      string
	Limit         int32
}

func (r *Repo) GetVisibleMediaPostSocialState(ctx context.Context, postID, viewerUserID string) (PostSocialState, error) {
	row, err := r.queries.GetVisibleMediaPostSocialState(ctx, mediaqlc.GetVisibleMediaPostSocialStateParams{
		MediaPostID:  toUUID(postID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return PostSocialState{}, err
	}
	return PostSocialState{
		PostID:            row.ID.String(),
		AuthorUserID:      row.AuthorAppUserID.String(),
		AuthorUsername:    row.AuthorUsername,
		AuthorDisplayName: row.AuthorDisplayName,
		AuthorAvatarURL:   row.AuthorAvatarUrl,
		LikeCount:         row.LikeCount,
		CommentCount:      row.CommentCount,
		ViewerHasLiked:    row.ViewerHasLiked,
		ViewerHasSaved:    row.ViewerHasSaved,
	}, nil
}

func (r *Repo) LikeMediaPost(ctx context.Context, postID, userID string) error {
	return r.queries.LikeMediaPost(ctx, mediaqlc.LikeMediaPostParams{
		MediaPostID: toUUID(postID),
		UserID:      toUUID(userID),
	})
}

func (r *Repo) UnlikeMediaPost(ctx context.Context, postID, userID string) error {
	return r.queries.UnlikeMediaPost(ctx, mediaqlc.UnlikeMediaPostParams{
		MediaPostID: toUUID(postID),
		UserID:      toUUID(userID),
	})
}

func (r *Repo) SaveMediaPost(ctx context.Context, postID, userID string) error {
	return r.queries.SaveMediaPost(ctx, mediaqlc.SaveMediaPostParams{
		MediaPostID: toUUID(postID),
		UserID:      toUUID(userID),
	})
}

func (r *Repo) UnsaveMediaPost(ctx context.Context, postID, userID string) error {
	return r.queries.UnsaveMediaPost(ctx, mediaqlc.UnsaveMediaPostParams{
		MediaPostID: toUUID(postID),
		UserID:      toUUID(userID),
	})
}

func (r *Repo) GetMediaPostDetail(ctx context.Context, postID, viewerUserID string) ([]MediaPostDetailItem, error) {
	rows, err := r.queries.GetMediaPostDetail(ctx, mediaqlc.GetMediaPostDetailParams{
		MediaPostID:  toUUID(postID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaPostDetailItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMediaPostDetailItem(row))
	}
	return items, nil
}

func (r *Repo) CreateMediaPostComment(ctx context.Context, postID, authorUserID, body string) (MediaPostComment, error) {
	row, err := r.queries.CreateMediaPostComment(ctx, mediaqlc.CreateMediaPostCommentParams{
		MediaPostID:  toUUID(postID),
		AuthorUserID: toUUID(authorUserID),
		Body:         body,
	})
	if err != nil {
		return MediaPostComment{}, err
	}
	return r.GetMediaPostComment(ctx, postID, row.ID.String(), authorUserID)
}

func (r *Repo) GetMediaPostComment(ctx context.Context, postID, commentID, viewerUserID string) (MediaPostComment, error) {
	row, err := r.queries.GetMediaPostComment(ctx, mediaqlc.GetMediaPostCommentParams{
		MediaPostID:  toUUID(postID),
		CommentID:    toUUID(commentID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return MediaPostComment{}, err
	}
	return mapMediaPostComment(row), nil
}

func (r *Repo) ListMediaPostComments(ctx context.Context, input ListMediaPostCommentsInput) ([]MediaPostComment, error) {
	rows, err := r.queries.ListMediaPostComments(ctx, mediaqlc.ListMediaPostCommentsParams{
		MediaPostID:  toUUID(input.PostID),
		ViewerUserID: toUUID(input.ViewerUserID),
		CreatedAt:    toTimestamptz(input.CursorCreated),
		ID:           toUUID(input.CursorID),
		LimitCount:   input.Limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]MediaPostComment, 0, len(rows))
	for _, row := range rows {
		items = append(items, mapMediaPostCommentListRow(row))
	}
	return items, nil
}

type ListMediaPostCommentsInput struct {
	PostID        string
	ViewerUserID  string
	CursorCreated time.Time
	CursorID      string
	Limit         int32
}

func (r *Repo) SoftDeleteMediaPostComment(ctx context.Context, postID, commentID, actorID string) error {
	return r.queries.SoftDeleteMediaPostComment(ctx, mediaqlc.SoftDeleteMediaPostCommentParams{
		ID:              toUUID(commentID),
		MediaPostID:     toUUID(postID),
		DeletedByUserID: toUUID(actorID),
	})
}

func (r *Repo) GetVisibleMediaPostCommentLikeState(ctx context.Context, postID, commentID, viewerUserID string) (CommentLikeState, error) {
	row, err := r.queries.GetVisibleMediaPostCommentLikeState(ctx, mediaqlc.GetVisibleMediaPostCommentLikeStateParams{
		MediaPostID:  toUUID(postID),
		CommentID:    toUUID(commentID),
		ViewerUserID: toUUID(viewerUserID),
	})
	if err != nil {
		return CommentLikeState{}, err
	}
	return CommentLikeState{
		CommentID:      row.ID.String(),
		PostID:         row.MediaPostID.String(),
		LikeCount:      row.LikeCount,
		ViewerHasLiked: row.ViewerHasLiked,
	}, nil
}

func (r *Repo) LikeMediaPostComment(ctx context.Context, commentID, userID string) error {
	return r.queries.LikeMediaPostComment(ctx, mediaqlc.LikeMediaPostCommentParams{
		CommentID: toUUID(commentID),
		UserID:    toUUID(userID),
	})
}

func (r *Repo) UnlikeMediaPostComment(ctx context.Context, commentID, userID string) error {
	return r.queries.UnlikeMediaPostComment(ctx, mediaqlc.UnlikeMediaPostCommentParams{
		CommentID: toUUID(commentID),
		UserID:    toUUID(userID),
	})
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func mapMedia(row mediaqlc.MediaObject) MediaObject {
	return MediaObject{
		ID:             row.ID.String(),
		OwnerAppUserID: row.OwnerAppUserID.String(),
		ContextType:    row.ContextType,
		ContextID:      uuidPtr(row.ContextID),
		ObjectKey:      row.ObjectKey,
		MimeType:       row.MimeType,
		SizeBytes:      row.SizeBytes,
		Width:          row.Width,
		Height:         row.Height,
		State:          row.State,
		CreatedAt:      row.CreatedAt.Time.UTC(),
	}
}

func mapMediaPost(row mediaqlc.MediaPost) MediaPost {
	return MediaPost{
		ID:              row.ID.String(),
		AuthorAppUserID: row.AuthorAppUserID.String(),
		UploadGroupID:   row.UploadGroupID.String(),
		DiveSiteID:      row.DiveSiteID.String(),
		PostCaption:     stringPtr(row.PostCaption),
		CreatedAt:       row.CreatedAt.Time.UTC(),
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
		DeletedAt:       timestamptzPtr(row.DeletedAt),
	}
}

func mapMediaItem(row mediaqlc.MediaItem) MediaItem {
	return MediaItem{
		ID:              row.ID.String(),
		PostID:          row.PostID.String(),
		MediaObjectID:   row.MediaObjectID.String(),
		AuthorAppUserID: row.AuthorAppUserID.String(),
		UploadGroupID:   row.UploadGroupID.String(),
		DiveSiteID:      row.DiveSiteID.String(),
		Type:            row.Type,
		StorageKey:      row.StorageKey,
		MimeType:        row.MimeType,
		Width:           row.Width,
		Height:          row.Height,
		DurationMs:      int32PtrFromPtr(row.DurationMs),
		Caption:         stringPtr(row.Caption),
		SortOrder:       row.SortOrder,
		Status:          row.Status,
		CreatedAt:       row.CreatedAt.Time.UTC(),
		UpdatedAt:       row.UpdatedAt.Time.UTC(),
		DeletedAt:       timestamptzPtr(row.DeletedAt),
	}
}

func mapProfileMediaItem(row mediaqlc.ListProfileMediaByUsernameRow) ProfileMediaItem {
	return ProfileMediaItem{
		MediaItem: MediaItem{
			ID:              row.ID.String(),
			PostID:          row.PostID.String(),
			MediaObjectID:   row.MediaObjectID.String(),
			AuthorAppUserID: row.AuthorAppUserID.String(),
			UploadGroupID:   row.UploadGroupID.String(),
			DiveSiteID:      row.DiveSiteID.String(),
			Type:            row.Type,
			StorageKey:      row.StorageKey,
			MimeType:        row.MimeType,
			Width:           row.Width,
			Height:          row.Height,
			DurationMs:      int32PtrFromPtr(row.DurationMs),
			Caption:         stringPtr(row.Caption),
			SortOrder:       row.SortOrder,
			Status:          row.Status,
			CreatedAt:       row.CreatedAt.Time.UTC(),
			UpdatedAt:       row.UpdatedAt.Time.UTC(),
			DeletedAt:       timestamptzPtr(row.DeletedAt),
		},
		PostCaption:    stringPtr(row.PostCaption),
		DiveSiteSlug:   row.DiveSiteSlug,
		DiveSiteName:   row.DiveSiteName,
		DiveSiteArea:   row.DiveSiteArea,
		LikeCount:      row.LikeCount,
		CommentCount:   row.CommentCount,
		ViewerHasLiked: row.ViewerHasLiked,
		ViewerHasSaved: row.ViewerHasSaved,
	}
}

func mapMediaPostDetailItem(row mediaqlc.GetMediaPostDetailRow) MediaPostDetailItem {
	return MediaPostDetailItem{
		ProfileMediaItem: ProfileMediaItem{
			MediaItem: MediaItem{
				ID:              row.ID.String(),
				PostID:          row.PostID.String(),
				MediaObjectID:   row.MediaObjectID.String(),
				AuthorAppUserID: row.AuthorAppUserID.String(),
				UploadGroupID:   row.UploadGroupID.String(),
				DiveSiteID:      row.DiveSiteID.String(),
				Type:            row.Type,
				StorageKey:      row.StorageKey,
				MimeType:        row.MimeType,
				Width:           row.Width,
				Height:          row.Height,
				DurationMs:      int32PtrFromPtr(row.DurationMs),
				Caption:         stringPtr(row.Caption),
				SortOrder:       row.SortOrder,
				Status:          row.Status,
				CreatedAt:       row.CreatedAt.Time.UTC(),
				UpdatedAt:       row.UpdatedAt.Time.UTC(),
				DeletedAt:       timestamptzPtr(row.DeletedAt),
			},
			PostCaption:    stringPtr(row.PostCaption),
			DiveSiteSlug:   row.DiveSiteSlug,
			DiveSiteName:   row.DiveSiteName,
			DiveSiteArea:   row.DiveSiteArea,
			LikeCount:      row.LikeCount,
			CommentCount:   row.CommentCount,
			ViewerHasLiked: row.ViewerHasLiked,
			ViewerHasSaved: row.ViewerHasSaved,
		},
		AuthorUsername:    row.AuthorUsername,
		AuthorDisplayName: row.AuthorDisplayName,
		AuthorAvatarURL:   row.AuthorAvatarUrl,
		PostCreatedAt:     row.PostCreatedAt.Time.UTC(),
		PostUpdatedAt:     row.PostUpdatedAt.Time.UTC(),
	}
}

func mapMediaPostComment(row mediaqlc.GetMediaPostCommentRow) MediaPostComment {
	return MediaPostComment{
		ID:                row.ID.String(),
		PostID:            row.MediaPostID.String(),
		AuthorUserID:      row.AuthorUserID.String(),
		AuthorUsername:    row.AuthorUsername,
		AuthorDisplayName: row.AuthorDisplayName,
		AuthorAvatarURL:   row.AuthorAvatarUrl,
		Body:              row.Body,
		LikeCount:         row.LikeCount,
		ViewerHasLiked:    row.ViewerHasLiked,
		CreatedAt:         row.CreatedAt.Time.UTC(),
		UpdatedAt:         row.UpdatedAt.Time.UTC(),
	}
}

func mapMediaPostCommentListRow(row mediaqlc.ListMediaPostCommentsRow) MediaPostComment {
	return MediaPostComment{
		ID:                row.ID.String(),
		PostID:            row.MediaPostID.String(),
		AuthorUserID:      row.AuthorUserID.String(),
		AuthorUsername:    row.AuthorUsername,
		AuthorDisplayName: row.AuthorDisplayName,
		AuthorAvatarURL:   row.AuthorAvatarUrl,
		Body:              row.Body,
		LikeCount:         row.LikeCount,
		ViewerHasLiked:    row.ViewerHasLiked,
		CreatedAt:         row.CreatedAt.Time.UTC(),
		UpdatedAt:         row.UpdatedAt.Time.UTC(),
	}
}

func toUUID(value string) pgtype.UUID {
	var id pgtype.UUID
	_ = id.Scan(value)
	return id
}

func toUUIDPtr(value *string) pgtype.UUID {
	if value == nil || strings.TrimSpace(*value) == "" {
		return pgtype.UUID{}
	}
	return toUUID(*value)
}

func toTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func uuidPtr(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}
	parsed := value.String()
	return &parsed
}

func timestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time.UTC()
	return &result
}

func stringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func int32PtrFromPtr(value *int32) *int32 {
	if value == nil {
		return nil
	}
	result := *value
	return &result
}
