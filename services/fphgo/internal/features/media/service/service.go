package service

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	feedservice "fphgo/internal/features/feed/service"
	mediarepo "fphgo/internal/features/media/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

const (
	ContextProfileAvatar        = "profile_avatar"
	ContextProfileFeed          = "profile_feed"
	ContextChikaAttachment      = "chika_attachment"
	ContextEventAttachment      = "event_attachment"
	ContextPaymentMethodQR      = "payment_method_qr"
	ContextCourseBookingReceipt = "course_booking_receipt"
	ContextDiveSpotAttachment   = "dive_spot_attachment"
	ContextGroupCover           = "group_cover"
	ContextInstructorProof      = "instructor_certification_proof"

	PresetThumb    = "thumb"
	PresetCard     = "card"
	PresetDialog   = "dialog"
	PresetOriginal = "original"

	maxUploadBytes           = 10 * 1024 * 1024
	momentMaxDurationSeconds = 30
	momentUploadExpiry       = 2 * time.Hour
)

type repository interface {
	CreateMediaObject(ctx context.Context, input mediarepo.CreateMediaObjectInput) (mediarepo.MediaObject, error)
	GetMediaObjectsByIDs(ctx context.Context, mediaIDs []string) ([]mediarepo.MediaObject, error)
	ListVisibleProfileMediaObjectIDs(ctx context.Context, mediaIDs []string, viewerUserID string) (map[string]bool, error)
	ListMediaByOwner(ctx context.Context, input mediarepo.ListMediaByOwnerInput) ([]mediarepo.MediaObject, error)
	ListMediaByContext(ctx context.Context, input mediarepo.ListMediaByContextInput) ([]mediarepo.MediaObject, error)
	PublishMediaPost(ctx context.Context, input mediarepo.PublishMediaPostInput) (mediarepo.MediaPost, []mediarepo.MediaItem, error)
	ListProfileMediaByUsername(ctx context.Context, input mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error)
	ListProfileMomentsByUsername(ctx context.Context, input mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error)
	ListDiveSiteMoments(ctx context.Context, input mediarepo.ListDiveSiteMomentsInput) ([]mediarepo.ProfileMediaItem, error)
	ListProfileDiveSpotHighlightsByUsername(ctx context.Context, input mediarepo.ListProfileDiveSpotHighlightsInput) ([]mediarepo.ProfileDiveSpotHighlight, error)
	ListProfileMediaByUsernameAndDiveSite(ctx context.Context, input mediarepo.ListProfileDiveSpotMediaInput) ([]mediarepo.ProfileMediaItem, error)
	GetVisibleMediaPostSocialState(ctx context.Context, postID, viewerUserID string) (mediarepo.PostSocialState, error)
	LikeMediaPost(ctx context.Context, postID, userID string) error
	UnlikeMediaPost(ctx context.Context, postID, userID string) error
	SaveMediaPost(ctx context.Context, postID, userID string) error
	UnsaveMediaPost(ctx context.Context, postID, userID string) error
	GetMediaPostDetail(ctx context.Context, postID, viewerUserID string) ([]mediarepo.MediaPostDetailItem, error)
	CreateMoment(ctx context.Context, input mediarepo.CreateMomentInput) (mediarepo.MediaPost, mediarepo.MediaItem, error)
	GetMomentMediaItemByPostForOwner(ctx context.Context, postID, ownerID string) (mediarepo.MediaItem, error)
	GetMomentMediaItemByStreamUID(ctx context.Context, streamUID string) (mediarepo.MediaItem, error)
	MarkMomentUploaded(ctx context.Context, postID, ownerID string) (mediarepo.MediaItem, error)
	MarkMomentReady(ctx context.Context, input mediarepo.MomentStatusUpdate) (mediarepo.MediaItem, error)
	MarkMomentFailed(ctx context.Context, input mediarepo.MomentStatusUpdate) (mediarepo.MediaItem, error)
	MarkExpiredMomentUploadsFailed(ctx context.Context, now time.Time, failedReason string) (int64, error)
	CreateMediaPostComment(ctx context.Context, postID, authorUserID, body string) (mediarepo.MediaPostComment, error)
	GetMediaPostComment(ctx context.Context, postID, commentID, viewerUserID string) (mediarepo.MediaPostComment, error)
	ListMediaPostComments(ctx context.Context, input mediarepo.ListMediaPostCommentsInput) ([]mediarepo.MediaPostComment, error)
	SoftDeleteMediaPostComment(ctx context.Context, postID, commentID, actorID string) error
	GetVisibleMediaPostCommentLikeState(ctx context.Context, postID, commentID, viewerUserID string) (mediarepo.CommentLikeState, error)
	LikeMediaPostComment(ctx context.Context, commentID, userID string) error
	UnlikeMediaPostComment(ctx context.Context, commentID, userID string) error
}

type uploader interface {
	PutObject(ctx context.Context, bucketName, objectKey, contentType string, body io.Reader, sizeBytes int64) error
	DeleteObject(ctx context.Context, bucketName, objectKey string) error
}

type Service struct {
	repo                     repository
	uploader                 uploader
	siteLookup               siteLookup
	bucketName               string
	cdnBaseURL               string
	signingSecret            string
	signingKeyVersion        int
	nowFn                    func() time.Time
	activity                 activityPublisher
	stream                   streamClient
	momentsEnabled           bool
	streamRequireSignedURLs  bool
	streamMaxDurationSeconds int
	streamUploadExpiry       time.Duration
}

type siteLookup interface {
	GetSiteForWrite(ctx context.Context, siteID string) (SiteRecord, error)
}

type SiteRecord struct {
	ID              string
	Slug            string
	Name            string
	Area            string
	ModerationState string
}

type activityPublisher interface {
	PublishActivity(ctx context.Context, input feedservice.ActivityPublishInput) error
}

type Option func(*Service)

func WithSiteLookup(lookup siteLookup) Option {
	return func(s *Service) {
		if lookup != nil {
			s.siteLookup = lookup
		}
	}
}

func WithActivityPublisher(publisher activityPublisher) Option {
	return func(s *Service) {
		s.activity = publisher
	}
}

func WithStreamClient(client streamClient, requireSignedURLs bool) Option {
	return func(s *Service) {
		s.stream = client
		s.streamRequireSignedURLs = requireSignedURLs
	}
}

func WithMomentsEnabled(enabled bool) Option {
	return func(s *Service) {
		s.momentsEnabled = enabled
	}
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type UploadInput struct {
	OwnerUserID string
	ContextType string
	ContextID   *string
	Filename    string
	File        io.ReadSeeker
	SizeBytes   int64
}

type UploadResult struct {
	ID          string
	ObjectKey   string
	MimeType    string
	SizeBytes   int64
	Width       int
	Height      int
	ContextType string
	ContextID   *string
	State       string
}

type cleanedUpload struct {
	reader  io.ReadSeeker
	size    int64
	cleanup func()
}

type MintURLItemInput struct {
	MediaID string
	Preset  string
	Width   *int
	Format  *string
	Quality *int
}

type MintURLsInput struct {
	ViewerUserID string
	Items        []MintURLItemInput
}

type MintedURLItem struct {
	MediaID   string
	URL       string
	ExpiresAt int64
}

type MintError struct {
	MediaID string
	Code    string
	Message string
}

type MintURLsResult struct {
	Items  []MintedURLItem
	Errors []MintError
}

type ListMediaInput struct {
	OwnerUserID string
	ContextType *string
	ContextID   *string
	Limit       int32
	Cursor      string
}

type ListMediaResult struct {
	Items      []UploadResult
	NextCursor string
}

type CreateMediaPostInput struct {
	ActorID           string
	DiveSiteID        string
	PostCaption       *string
	ApplyCaptionToAll bool
	Source            string
	Items             []CreateMediaPostItemInput
}

type CreateMediaPostItemInput struct {
	MediaObjectID string
	Type          string
	StorageKey    string
	MimeType      string
	Width         int
	Height        int
	DurationMs    *int
	Caption       *string
	DiveSiteID    *string
	SortOrder     int
}

type MediaPostResult struct {
	ID              string
	AuthorAppUserID string
	UploadGroupID   string
	DiveSiteID      string
	PostCaption     *string
	LikeCount       int64
	CommentCount    int64
	ViewerHasLiked  bool
	ViewerHasSaved  bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ProfileMediaItemResult struct {
	ID               string
	MediaObjectID    string
	PostID           string
	PostCaption      *string
	UploadGroupID    string
	AuthorAppUserID  string
	Type             string
	StorageKey       string
	MimeType         string
	Width            int
	Height           int
	DurationMs       *int
	Caption          *string
	DiveSiteID       string
	DiveSiteSlug     string
	DiveSiteName     string
	DiveSiteArea     string
	SortOrder        int
	Status           string
	ProcessingStatus string
	Playback         *MomentPlaybackResult
	PlaybackURL      *string
	ThumbnailURL     *string
	PreviewURL       *string
	StreamUID        *string
	LikeCount        int64
	CommentCount     int64
	ViewerHasLiked   bool
	ViewerHasSaved   bool
	CreatedAt        time.Time
}

type MomentPlaybackResult struct {
	Provider  string
	IframeURL *string
	HLSURL    *string
	DASHURL   *string
	PosterURL *string
}

type MediaPostAuthorResult struct {
	ID          string
	Username    string
	DisplayName string
	AvatarURL   string
}

type MediaPostDetailResult struct {
	Post   MediaPostResult
	Author MediaPostAuthorResult
	Items  []ProfileMediaItemResult
}

type CreateMediaPostResult struct {
	Post  MediaPostResult
	Items []ProfileMediaItemResult
}

type CreateMomentUploadIntentInput struct {
	ActorID     string
	Caption     *string
	DiveSiteID  *string
	Filename    *string
	ContentType *string
}

type MomentUploadIntentResult struct {
	PostID             string
	MediaItemID        string
	MediaObjectID      string
	StreamUID          string
	UploadURL          string
	Status             string
	UploadExpiresAt    time.Time
	MaxDurationSeconds int
}

type CompleteMomentUploadInput struct {
	ActorID string
	PostID  string
}

type MomentStatusResult struct {
	PostID          string
	MediaItemID     string
	Status          string
	Playback        *MomentPlaybackResult
	PlaybackURL     string
	ThumbnailURL    string
	PreviewURL      string
	DurationMs      *int
	Width           int
	Height          int
	FailedReason    *string
	UploadExpiresAt *time.Time
	ReadyAt         *time.Time
}

type ListProfileMediaInput struct {
	Username     string
	ViewerUserID string
	Cursor       string
	Limit        int32
}

type ListDiveSiteMomentsInput struct {
	ViewerUserID string
	DiveSiteID   string
	Cursor       string
	Limit        int32
}

type ListProfileMediaResult struct {
	Items      []ProfileMediaItemResult
	NextCursor string
}

type ExpiredMomentCleanupResult struct {
	FailedCount int64
}

type DiveSpotHighlightResult struct {
	DiveSpotID           string
	DiveSpotSlug         string
	DiveSpotName         string
	DiveSpotArea         string
	CoverMediaObjectID   string
	CoverThumbnailURL    string
	MediaCount           int64
	LatestMediaCreatedAt time.Time
}

type ListDiveSpotHighlightsInput struct {
	Username     string
	ViewerUserID string
	Limit        int32
}

type ListDiveSpotHighlightsResult struct {
	Items []DiveSpotHighlightResult
}

type ListDiveSpotHighlightMediaInput struct {
	Username     string
	ViewerUserID string
	DiveSpotID   string
	Cursor       string
	Limit        int32
}

type LikeStateResult struct {
	PostID         string
	LikeCount      int64
	ViewerHasLiked bool
}

type SaveStateResult struct {
	PostID         string
	ViewerHasSaved bool
}

type CommentLikeStateResult struct {
	CommentID      string
	LikeCount      int64
	ViewerHasLiked bool
}

type MediaPostCommentAuthorResult struct {
	ID          string
	Username    string
	DisplayName string
	AvatarURL   string
}

type MediaPostCommentResult struct {
	ID             string
	PostID         string
	Author         MediaPostCommentAuthorResult
	Body           string
	LikeCount      int64
	ViewerHasLiked bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ListMediaPostCommentsInput struct {
	PostID       string
	ViewerUserID string
	Cursor       string
	Limit        int32
}

type ListMediaPostCommentsResult struct {
	Items      []MediaPostCommentResult
	NextCursor string
}

type CreateMediaPostCommentInput struct {
	PostID  string
	ActorID string
	Body    string
}

type DeleteMediaPostCommentInput struct {
	PostID    string
	CommentID string
	ActorID   string
	ActorRole string
}

type contextRule struct {
	maxUploadBytes    int64
	ttl               time.Duration
	maxTransformWidth int
	allowedPresets    map[string]bool
	requiresContextID bool
}

type presetRule struct {
	defaultWidth *int
	defaultQ     *int
}

var contextRules = map[string]contextRule{
	ContextProfileAvatar: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 1024,
		allowedPresets:    map[string]bool{PresetThumb: true, PresetCard: true, PresetDialog: true},
	},
	ContextProfileFeed: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		allowedPresets:    map[string]bool{PresetThumb: true, PresetCard: true, PresetDialog: true},
	},
	ContextChikaAttachment: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               12 * time.Hour,
		maxTransformWidth: 1600,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextEventAttachment: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextPaymentMethodQR: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 1600,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextCourseBookingReceipt: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextDiveSpotAttachment: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextGroupCover: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextInstructorProof: {
		maxUploadBytes:    maxUploadBytes,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
}

var presetRules = map[string]presetRule{
	PresetThumb:    {defaultWidth: ptrInt(144), defaultQ: ptrInt(70)},
	PresetCard:     {defaultWidth: ptrInt(640), defaultQ: ptrInt(75)},
	PresetDialog:   {defaultWidth: ptrInt(1080), defaultQ: ptrInt(80)},
	PresetOriginal: {},
}

var allowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

var mimeExt = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
	"image/gif":  "gif",
}

func New(repo repository, uploader uploader, bucketName, cdnBaseURL, signingSecret string, signingKeyVersion int, opts ...Option) *Service {
	if signingKeyVersion <= 0 {
		signingKeyVersion = 1
	}
	svc := &Service{
		repo:              repo,
		uploader:          uploader,
		bucketName:        bucketName,
		cdnBaseURL:        strings.TrimRight(cdnBaseURL, "/"),
		signingSecret:     signingSecret,
		signingKeyVersion: signingKeyVersion,
		nowFn: func() time.Time {
			return time.Now().UTC()
		},
		momentsEnabled:           true,
		streamMaxDurationSeconds: momentMaxDurationSeconds,
		streamUploadExpiry:       momentUploadExpiry,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) Upload(ctx context.Context, input UploadInput) (UploadResult, error) {
	if _, err := uuid.Parse(input.OwnerUserID); err != nil {
		return UploadResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	rule, issues := validateContext(input.ContextType, input.ContextID)
	if len(issues) > 0 {
		return UploadResult{}, ValidationFailure{Issues: issues}
	}
	if input.SizeBytes <= 0 {
		return UploadResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"file"}, Code: "too_small", Message: "file is required"}}}
	}
	if input.SizeBytes > rule.maxUploadBytes {
		return UploadResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"file"}, Code: "too_big", Message: "file exceeds context upload limit"}}}
	}
	if s.uploader == nil || strings.TrimSpace(s.bucketName) == "" {
		return UploadResult{}, apperrors.New(http.StatusInternalServerError, "media_storage_unavailable", "media storage is not configured", nil)
	}

	mimeType, width, height, err := sniffAndMeasureImage(input.File)
	if err != nil {
		return UploadResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"file"}, Code: "custom", Message: err.Error()}}}
	}
	if !allowedMIMETypes[mimeType] {
		return UploadResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"file"}, Code: "invalid_enum", Message: "unsupported image type"}}}
	}

	ext := extForMime(mimeType)
	filename, err := buildFilename(ext, s.nowFn())
	if err != nil {
		return UploadResult{}, apperrors.New(http.StatusInternalServerError, "media_filename_failed", "failed to generate object key", err)
	}
	objectKey := buildObjectKey(input.ContextType, input.OwnerUserID, input.ContextID, filename, s.nowFn())

	if _, err := input.File.Seek(0, io.SeekStart); err != nil {
		return UploadResult{}, apperrors.New(http.StatusInternalServerError, "media_read_failed", "failed to read uploaded file", err)
	}

	cleaned, err := sanitizeForUpload(input.File, mimeType)
	if err != nil {
		return UploadResult{}, apperrors.New(http.StatusBadRequest, "media_sanitize_failed", "failed to sanitize image metadata", err)
	}
	defer cleaned.cleanup()

	if err := s.uploader.PutObject(ctx, s.bucketName, objectKey, mimeType, cleaned.reader, cleaned.size); err != nil {
		return UploadResult{}, apperrors.New(http.StatusBadGateway, "media_upload_failed", "failed to upload media", err)
	}

	created, err := s.repo.CreateMediaObject(ctx, mediarepo.CreateMediaObjectInput{
		OwnerAppUserID: input.OwnerUserID,
		ContextType:    input.ContextType,
		ContextID:      input.ContextID,
		ObjectKey:      objectKey,
		MimeType:       mimeType,
		SizeBytes:      cleaned.size,
		Width:          int32(width),
		Height:         int32(height),
		State:          "active",
	})
	if err != nil {
		_ = s.uploader.DeleteObject(ctx, s.bucketName, objectKey)
		return UploadResult{}, apperrors.New(http.StatusInternalServerError, "media_persist_failed", "failed to persist media", err)
	}

	return UploadResult{
		ID:          created.ID,
		ObjectKey:   created.ObjectKey,
		MimeType:    created.MimeType,
		SizeBytes:   created.SizeBytes,
		Width:       int(created.Width),
		Height:      int(created.Height),
		ContextType: created.ContextType,
		ContextID:   created.ContextID,
		State:       created.State,
	}, nil
}

func sanitizeForUpload(file io.ReadSeeker, mimeType string) (cleanedUpload, error) {
	switch mimeType {
	case "image/jpeg":
		return reencodeImage(file, mimeType)
	case "image/png":
		return reencodeImage(file, mimeType)
	case "image/gif":
		return reencodeImage(file, mimeType)
	case "image/webp":
		return stripWebPExif(file)
	default:
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			return cleanedUpload{}, err
		}
		size, err := seekSize(file)
		if err != nil {
			return cleanedUpload{}, err
		}
		return cleanedUpload{
			reader:  file,
			size:    size,
			cleanup: func() {},
		}, nil
	}
}

func reencodeImage(file io.ReadSeeker, mimeType string) (cleanedUpload, error) {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return cleanedUpload{}, err
	}
	img, _, err := image.Decode(file)
	if err != nil {
		return cleanedUpload{}, err
	}

	tmp, err := os.CreateTemp("", "media-clean-*")
	if err != nil {
		return cleanedUpload{}, err
	}
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmp.Name())
	}

	switch mimeType {
	case "image/jpeg":
		err = jpeg.Encode(tmp, img, &jpeg.Options{Quality: 92})
	case "image/png":
		err = png.Encode(tmp, img)
	case "image/gif":
		err = gif.Encode(tmp, img, nil)
	default:
		err = fmt.Errorf("unsupported image mime for sanitize: %s", mimeType)
	}
	if err != nil {
		cleanup()
		return cleanedUpload{}, err
	}

	size, err := tmp.Seek(0, io.SeekCurrent)
	if err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	return cleanedUpload{reader: tmp, size: size, cleanup: cleanup}, nil
}

func stripWebPExif(file io.ReadSeeker) (cleanedUpload, error) {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return cleanedUpload{}, err
	}
	header := make([]byte, 12)
	if _, err := io.ReadFull(file, header); err != nil {
		return cleanedUpload{}, err
	}
	if string(header[0:4]) != "RIFF" || string(header[8:12]) != "WEBP" {
		return cleanedUpload{}, fmt.Errorf("invalid webp file")
	}

	tmp, err := os.CreateTemp("", "media-webp-clean-*")
	if err != nil {
		return cleanedUpload{}, err
	}
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmp.Name())
	}
	if _, err := tmp.Write(header); err != nil {
		cleanup()
		return cleanedUpload{}, err
	}

	chunkHeader := make([]byte, 8)
	for {
		n, readErr := io.ReadFull(file, chunkHeader)
		if readErr == io.EOF {
			break
		}
		if readErr == io.ErrUnexpectedEOF || n == 0 {
			break
		}
		if readErr != nil {
			cleanup()
			return cleanedUpload{}, readErr
		}

		chunkType := string(chunkHeader[:4])
		chunkSize := int64(binary.LittleEndian.Uint32(chunkHeader[4:8]))
		if chunkSize < 0 {
			cleanup()
			return cleanedUpload{}, fmt.Errorf("invalid webp chunk size")
		}
		paddedSize := chunkSize
		if chunkSize%2 == 1 {
			paddedSize++
		}

		if chunkType != "EXIF" {
			if _, err := tmp.Write(chunkHeader); err != nil {
				cleanup()
				return cleanedUpload{}, err
			}
			if _, err := io.CopyN(tmp, file, paddedSize); err != nil {
				cleanup()
				return cleanedUpload{}, err
			}
		} else {
			if _, err := io.CopyN(io.Discard, file, paddedSize); err != nil {
				cleanup()
				return cleanedUpload{}, err
			}
		}
	}

	size, err := tmp.Seek(0, io.SeekCurrent)
	if err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	if size < 8 {
		cleanup()
		return cleanedUpload{}, fmt.Errorf("invalid rewritten webp size")
	}
	if _, err := tmp.Seek(4, io.SeekStart); err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	if err := binary.Write(tmp, binary.LittleEndian, uint32(size-8)); err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return cleanedUpload{}, err
	}
	return cleanedUpload{
		reader:  tmp,
		size:    size,
		cleanup: cleanup,
	}, nil
}

func seekSize(rs io.ReadSeeker) (int64, error) {
	current, err := rs.Seek(0, io.SeekCurrent)
	if err != nil {
		return 0, err
	}
	size, err := rs.Seek(0, io.SeekEnd)
	if err != nil {
		return 0, err
	}
	if _, err := rs.Seek(current, io.SeekStart); err != nil {
		return 0, err
	}
	return size, nil
}

func (s *Service) MintURLs(ctx context.Context, input MintURLsInput) (MintURLsResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(input.ViewerUserID)); err != nil {
		return MintURLsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if len(input.Items) == 0 {
		return MintURLsResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"items"}, Code: "required", Message: "items is required"}}}
	}
	if len(input.Items) > 100 {
		return MintURLsResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"items"}, Code: "too_big", Message: "items must be 100 or fewer"}}}
	}
	if strings.TrimSpace(s.cdnBaseURL) == "" || strings.TrimSpace(s.signingSecret) == "" {
		return MintURLsResult{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}

	mediaIDs := make([]string, 0, len(input.Items))
	for idx, item := range input.Items {
		if _, err := uuid.Parse(item.MediaID); err != nil {
			return MintURLsResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"items", idx, "mediaId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
		}
		mediaIDs = append(mediaIDs, item.MediaID)
	}

	rows, err := s.repo.GetMediaObjectsByIDs(ctx, mediaIDs)
	if err != nil {
		return MintURLsResult{}, apperrors.New(http.StatusInternalServerError, "media_lookup_failed", "failed to load media", err)
	}
	byID := make(map[string]mediarepo.MediaObject, len(rows))
	foreignProfileFeedIDs := make([]string, 0)
	for _, row := range rows {
		byID[row.ID] = row
		if row.OwnerAppUserID != input.ViewerUserID && row.ContextType == ContextProfileFeed {
			foreignProfileFeedIDs = append(foreignProfileFeedIDs, row.ID)
		}
	}

	visibleForeignProfileFeedIDs := map[string]bool{}
	if len(foreignProfileFeedIDs) > 0 {
		var err error
		visibleForeignProfileFeedIDs, err = s.repo.ListVisibleProfileMediaObjectIDs(ctx, foreignProfileFeedIDs, input.ViewerUserID)
		if err != nil {
			return MintURLsResult{}, apperrors.New(http.StatusInternalServerError, "media_visibility_failed", "failed to verify visible profile media", err)
		}
	}

	result := MintURLsResult{Items: make([]MintedURLItem, 0, len(input.Items)), Errors: make([]MintError, 0)}
	for _, item := range input.Items {
		row, ok := byID[item.MediaID]
		if !ok {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "not_found", Message: "media not found"})
			continue
		}
		isOwner := row.OwnerAppUserID == input.ViewerUserID
		isVisibleProfileFeed := row.ContextType == ContextProfileFeed && visibleForeignProfileFeedIDs[row.ID]
		if !isOwner && !isVisibleProfileFeed {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "not_found", Message: "media not found"})
			continue
		}
		if row.State != "active" {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: row.State, Message: "media is not active"})
			continue
		}
		if !isValidObjectKey(row.ObjectKey) {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "invalid_object_key", Message: "media object key is invalid"})
			continue
		}

		rule := contextRules[row.ContextType]
		preset := strings.TrimSpace(item.Preset)
		if preset == "" {
			preset = PresetCard
		}
		if _, ok := presetRules[preset]; !ok {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "invalid_preset", Message: "preset is invalid"})
			continue
		}
		if !isOwner && preset == PresetOriginal {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "preset_not_allowed", Message: "preset is not allowed for media context"})
			continue
		}
		if !rule.allowedPresets[preset] && preset != PresetOriginal {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "preset_not_allowed", Message: "preset is not allowed for media context"})
			continue
		}

		now := s.nowFn()
		expiresAt := now.Add(rule.ttl).Unix()
		format := ""
		width := 0
		quality := 0
		if preset != PresetOriginal {
			format = "auto"
			if item.Format != nil && strings.TrimSpace(*item.Format) != "" {
				format = strings.ToLower(strings.TrimSpace(*item.Format))
			}
			if !isAllowedOutputFormat(format) {
				result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "invalid_format", Message: "format is invalid"})
				continue
			}
			width = defaultWidthForPreset(preset)
			if item.Width != nil && *item.Width > 0 {
				width = *item.Width
			}
			width = clampInt(width, 1, rule.maxTransformWidth)

			quality = defaultQualityForPreset(preset)
			if item.Quality != nil {
				quality = *item.Quality
			}
			quality = clampInt(quality, 50, 85)
		}

		signer := mediasign.New(s.cdnBaseURL, s.signingSecret, s.signingKeyVersion, mediasign.WithNow(s.nowFn))
		signedURL := signer.URLWithTransform(row.ObjectKey, width, quality, format, rule.ttl)
		if signedURL == "" {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "media_signing_unavailable", Message: "media signing is not configured"})
			continue
		}

		result.Items = append(result.Items, MintedURLItem{
			MediaID:   item.MediaID,
			URL:       signedURL,
			ExpiresAt: expiresAt,
		})
	}

	return result, nil
}

func (s *Service) CreateMomentUploadIntent(ctx context.Context, input CreateMomentUploadIntentInput) (MomentUploadIntentResult, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if !s.momentsEnabled {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusServiceUnavailable, "moments_unavailable", "Moments uploads are temporarily unavailable", nil)
	}
	if s.stream == nil {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusInternalServerError, "moments_stream_unavailable", "Moments video upload is not configured", nil)
	}
	if s.streamRequireSignedURLs {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusServiceUnavailable, "moments_unavailable", "Moments uploads are temporarily unavailable", nil)
	}
	caption := normalizeOptionalString(input.Caption)
	if caption != nil && len([]rune(*caption)) > 1000 {
		return MomentUploadIntentResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"caption"}, Code: "too_big", Message: "Caption must be 1000 characters or fewer"}}}
	}
	var diveSiteID *string
	if input.DiveSiteID != nil && strings.TrimSpace(*input.DiveSiteID) != "" {
		trimmed := strings.TrimSpace(*input.DiveSiteID)
		if _, err := uuid.Parse(trimmed); err != nil {
			return MomentUploadIntentResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"diveSiteId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
		}
		if s.siteLookup == nil {
			return MomentUploadIntentResult{}, apperrors.New(http.StatusInternalServerError, "site_lookup_unavailable", "dive site lookup is not configured", nil)
		}
		site, err := s.siteLookup.GetSiteForWrite(ctx, trimmed)
		if err != nil {
			return MomentUploadIntentResult{}, mapSiteLookupError(err)
		}
		if site.ModerationState != "approved" {
			return MomentUploadIntentResult{}, apperrors.New(http.StatusForbidden, "forbidden", "linked dive site is not available", nil)
		}
		diveSiteID = &trimmed
	}
	if input.ContentType != nil {
		contentType := strings.ToLower(strings.TrimSpace(*input.ContentType))
		if contentType != "" && contentType != "video/mp4" && contentType != "video/quicktime" {
			return MomentUploadIntentResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"contentType"}, Code: "invalid_enum", Message: "Use an MP4 or MOV video for Moments"}}}
		}
	}

	expiresAt := s.nowFn().Add(s.streamUploadExpiry)
	intent, err := s.stream.CreateDirectUpload(ctx, StreamDirectUploadInput{
		CreatorID:          actorID,
		MaxDurationSeconds: s.streamMaxDurationSeconds,
		Expiry:             expiresAt,
		RequireSignedURLs:  s.streamRequireSignedURLs,
		Meta: map[string]string{
			"feature":  "moments",
			"filename": valueOrEmptyString(input.Filename),
		},
	})
	if err != nil {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusBadGateway, "moment_upload_intent_failed", "Failed to start Moment upload", err)
	}
	post, item, err := s.repo.CreateMoment(ctx, mediarepo.CreateMomentInput{
		AuthorAppUserID:  actorID,
		DiveSiteID:       diveSiteID,
		PostCaption:      caption,
		StreamUID:        intent.UID,
		UploadURL:        intent.UploadURL,
		UploadExpiresAt:  expiresAt,
		RequireSignedURL: s.streamRequireSignedURLs,
	})
	if err != nil {
		return MomentUploadIntentResult{}, apperrors.New(http.StatusInternalServerError, "moment_create_failed", "Failed to create Moment", err)
	}
	return MomentUploadIntentResult{
		PostID:             post.ID,
		MediaItemID:        item.ID,
		MediaObjectID:      item.MediaObjectID,
		StreamUID:          intent.UID,
		UploadURL:          intent.UploadURL,
		Status:             item.ProcessingStatus,
		UploadExpiresAt:    expiresAt,
		MaxDurationSeconds: s.streamMaxDurationSeconds,
	}, nil
}

func (s *Service) CompleteMomentUpload(ctx context.Context, input CompleteMomentUploadInput) (MomentStatusResult, error) {
	actorID := strings.TrimSpace(input.ActorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return MomentStatusResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	postID := strings.TrimSpace(input.PostID)
	if _, err := uuid.Parse(postID); err != nil {
		return MomentStatusResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"postId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	existing, err := s.repo.GetMomentMediaItemByPostForOwner(ctx, postID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return MomentStatusResult{}, apperrors.New(http.StatusNotFound, "not_found", "Moment not found", err)
		}
		return MomentStatusResult{}, apperrors.New(http.StatusInternalServerError, "moment_lookup_failed", "Failed to load Moment", err)
	}
	switch existing.ProcessingStatus {
	case "ready", "failed", "rejected":
		return momentStatusFromItem(existing), nil
	}
	item, err := s.repo.MarkMomentUploaded(ctx, postID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return MomentStatusResult{}, apperrors.New(http.StatusNotFound, "not_found", "Moment not found", err)
		}
		return MomentStatusResult{}, apperrors.New(http.StatusInternalServerError, "moment_complete_failed", "Failed to update Moment upload", err)
	}
	if item.StreamUID != nil && s.stream != nil {
		if synced, syncErr := s.syncMomentStreamStatus(ctx, *item.StreamUID); syncErr == nil {
			item = synced
		}
	}
	return momentStatusFromItem(item), nil
}

func (s *Service) SyncMomentStreamStatus(ctx context.Context, actorID, postID string) (MomentStatusResult, error) {
	actorID = strings.TrimSpace(actorID)
	if _, err := uuid.Parse(actorID); err != nil {
		return MomentStatusResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(postID)); err != nil {
		return MomentStatusResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"postId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
	}
	item, err := s.repo.GetMomentMediaItemByPostForOwner(ctx, postID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return MomentStatusResult{}, apperrors.New(http.StatusNotFound, "not_found", "Moment not found", err)
		}
		return MomentStatusResult{}, apperrors.New(http.StatusInternalServerError, "moment_lookup_failed", "Failed to load Moment", err)
	}
	if item.StreamUID == nil || strings.TrimSpace(*item.StreamUID) == "" {
		return momentStatusFromItem(item), nil
	}
	synced, err := s.syncMomentStreamStatus(ctx, *item.StreamUID)
	if err != nil {
		return MomentStatusResult{}, err
	}
	return momentStatusFromItem(synced), nil
}

func (s *Service) ExpireStaleMomentUploads(ctx context.Context) (ExpiredMomentCleanupResult, error) {
	count, err := s.repo.MarkExpiredMomentUploadsFailed(ctx, s.nowFn(), "Moment upload expired before processing completed")
	if err != nil {
		return ExpiredMomentCleanupResult{}, apperrors.New(http.StatusInternalServerError, "moment_cleanup_failed", "Failed to clean up expired Moments", err)
	}
	return ExpiredMomentCleanupResult{FailedCount: count}, nil
}

func (s *Service) RunExpiredMomentCleanupProcessor(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 10 * time.Minute
	}
	_, _ = s.ExpireStaleMomentUploads(ctx)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = s.ExpireStaleMomentUploads(ctx)
		}
	}
}

func (s *Service) syncMomentStreamStatus(ctx context.Context, streamUID string) (mediarepo.MediaItem, error) {
	if s.stream == nil {
		return mediarepo.MediaItem{}, apperrors.New(http.StatusInternalServerError, "moments_stream_unavailable", "Moments video upload is not configured", nil)
	}
	video, err := s.stream.GetVideo(ctx, streamUID)
	if err != nil {
		return mediarepo.MediaItem{}, apperrors.New(http.StatusBadGateway, "moment_status_sync_failed", "Failed to check Moment processing", err)
	}
	if strings.EqualFold(video.StatusState, "error") {
		return s.repo.MarkMomentFailed(ctx, mediarepo.MomentStatusUpdate{
			StreamUID:    streamUID,
			FailedReason: firstNonEmpty(video.ErrorReasonText, "Cloudflare Stream could not process this video"),
		})
	}
	if !video.ReadyToStream && !strings.EqualFold(video.StatusState, "ready") {
		item, err := s.repo.GetMomentMediaItemByStreamUID(ctx, streamUID)
		if err != nil {
			return mediarepo.MediaItem{}, apperrors.New(http.StatusInternalServerError, "moment_lookup_failed", "Failed to load Moment", err)
		}
		return item, nil
	}
	durationMs := int32(video.DurationSeconds * 1000)
	if durationMs < 0 {
		durationMs = 0
	}
	width := int32(video.Width)
	height := int32(video.Height)
	if width <= 0 {
		width = 1
	}
	if height <= 0 {
		height = 1
	}
	playbackURL := "https://iframe.videodelivery.net/" + streamUID
	item, err := s.repo.MarkMomentReady(ctx, mediarepo.MomentStatusUpdate{
		StreamUID:    streamUID,
		Width:        width,
		Height:       height,
		DurationMs:   &durationMs,
		PlaybackUID:  streamUID,
		PlaybackURL:  playbackURL,
		ThumbnailURL: firstNonEmpty(video.ThumbnailURL, "https://videodelivery.net/"+streamUID+"/thumbnails/thumbnail.jpg"),
		PreviewURL:   video.PreviewURL,
	})
	if err != nil {
		return mediarepo.MediaItem{}, err
	}
	s.publishMomentActivity(ctx, item)
	return item, nil
}

func (s *Service) publishMomentActivity(ctx context.Context, item mediarepo.MediaItem) {
	if s.activity == nil || item.ProcessingStatus != "ready" || item.Status != "active" {
		return
	}
	site := SiteRecord{}
	if strings.TrimSpace(item.DiveSiteID) != "" && s.siteLookup != nil {
		if found, err := s.siteLookup.GetSiteForWrite(ctx, item.DiveSiteID); err == nil && found.ModerationState == "approved" {
			site = found
		}
	}
	media := []map[string]any{{
		"id":            item.ID,
		"mediaObjectId": item.MediaObjectID,
		"type":          item.Type,
		"width":         int(item.Width),
		"height":        int(item.Height),
		"caption":       valueOrEmptyString(item.Caption),
		"sortOrder":     int(item.SortOrder),
		"playbackUrl":   valueOrEmptyString(item.PlaybackURL),
		"playback":      momentPlaybackMapFromItem(item),
		"thumbnailUrl":  valueOrEmptyString(item.ThumbnailURL),
		"previewUrl":    valueOrEmptyString(item.PreviewURL),
		"durationMs":    intValueFromInt32(item.DurationMs),
	}}
	_ = s.activity.PublishActivity(ctx, feedservice.ActivityPublishInput{
		Type:            feedservice.ActivityMediaPostCreated,
		SourceModule:    feedservice.ActivitySourceMedia,
		SourceType:      "media_post",
		SourceID:        item.PostID,
		ActorUserID:     item.AuthorAppUserID,
		TargetType:      "media_post",
		TargetID:        item.PostID,
		Visibility:      feedservice.ActivityVisibilityPublic,
		State:           feedservice.ActivityStateActive,
		Area:            site.Area,
		DiveSiteID:      site.ID,
		OccurredAt:      item.CreatedAt,
		SourceCreatedAt: item.CreatedAt,
		Title:           firstNonEmpty(site.Name, "Moment"),
		Body:            valueOrEmptyString(item.Caption),
		Media:           media,
		Metadata: map[string]any{
			"diveSiteName": site.Name,
			"diveSiteSlug": site.Slug,
			"source":       "moment_upload",
			"mediaType":    "video",
		},
	})
}

func (s *Service) CreateMediaPost(ctx context.Context, input CreateMediaPostInput) (CreateMediaPostResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(input.ActorID)); err != nil {
		return CreateMediaPostResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(input.DiveSiteID)); err != nil {
		return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"diveSiteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if len(input.Items) == 0 {
		return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"items"},
			Code:    "required",
			Message: "items is required",
		}}}
	}
	if len(input.Items) > 10 {
		return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"items"},
			Code:    "too_big",
			Message: "items must be 10 or fewer",
		}}}
	}
	if s.siteLookup == nil {
		return CreateMediaPostResult{}, apperrors.New(http.StatusInternalServerError, "site_lookup_unavailable", "dive site lookup is not configured", nil)
	}

	site, err := s.siteLookup.GetSiteForWrite(ctx, input.DiveSiteID)
	if err != nil {
		return CreateMediaPostResult{}, mapSiteLookupError(err)
	}
	if site.ModerationState != "approved" {
		return CreateMediaPostResult{}, apperrors.New(http.StatusForbidden, "forbidden", "linked dive site is not available", nil)
	}

	mediaIDs := make([]string, 0, len(input.Items))
	for idx, item := range input.Items {
		if _, err := uuid.Parse(strings.TrimSpace(item.MediaObjectID)); err != nil {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "invalid_uuid",
				Message: "Must be a valid UUID",
			}}}
		}
		mediaIDs = append(mediaIDs, item.MediaObjectID)
	}

	rows, err := s.repo.GetMediaObjectsByIDs(ctx, mediaIDs)
	if err != nil {
		return CreateMediaPostResult{}, apperrors.New(http.StatusInternalServerError, "media_lookup_failed", "failed to load uploaded media", err)
	}
	byID := make(map[string]mediarepo.MediaObject, len(rows))
	for _, row := range rows {
		byID[row.ID] = row
	}

	sharedCaption := firstNonEmptyCaption(input.Items)
	items := make([]mediarepo.CreateMediaItemInput, 0, len(input.Items))
	for idx, item := range input.Items {
		row, ok := byID[item.MediaObjectID]
		if !ok {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "custom",
				Message: "uploaded media is missing",
			}}}
		}
		if row.OwnerAppUserID != input.ActorID {
			return CreateMediaPostResult{}, apperrors.New(http.StatusForbidden, "forbidden", "uploaded media does not belong to actor", nil)
		}
		if row.ContextType != ContextProfileFeed {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "custom",
				Message: "uploaded media must use the profile feed uploader context",
			}}}
		}
		if row.State != "active" {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "custom",
				Message: "uploaded media is not active",
			}}}
		}
		if row.SizeBytes > maxUploadBytes {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "too_big",
				Message: "file exceeds 10 MB limit",
			}}}
		}
		if item.Type != "photo" {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "type"},
				Code:    "invalid_enum",
				Message: "only photo items are supported in this flow",
			}}}
		}
		if !allowedMIMETypes[row.MimeType] {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mimeType"},
				Code:    "invalid_enum",
				Message: "unsupported image type",
			}}}
		}
		if row.Width <= 0 || row.Height <= 0 {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "width"},
				Code:    "custom",
				Message: "uploaded media dimensions are required",
			}}}
		}
		if strings.TrimSpace(item.StorageKey) == "" || item.StorageKey != row.ObjectKey {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "storageKey"},
				Code:    "custom",
				Message: "storage key does not match uploaded media",
			}}}
		}
		if strings.TrimSpace(item.MimeType) == "" || strings.TrimSpace(item.MimeType) != row.MimeType {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mimeType"},
				Code:    "custom",
				Message: "mime type does not match uploaded media",
			}}}
		}
		if item.Width != int(row.Width) || item.Height != int(row.Height) {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "width"},
				Code:    "custom",
				Message: "dimensions do not match uploaded media",
			}}}
		}

		caption := normalizeOptionalString(item.Caption)
		if input.ApplyCaptionToAll && caption == nil && sharedCaption != nil {
			caption = sharedCaption
		}
		itemDiveSiteID := input.DiveSiteID
		if item.DiveSiteID != nil && strings.TrimSpace(*item.DiveSiteID) != "" {
			itemDiveSiteID = strings.TrimSpace(*item.DiveSiteID)
			if _, err := uuid.Parse(itemDiveSiteID); err != nil {
				return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
					Path:    []any{"items", idx, "diveSiteId"},
					Code:    "invalid_uuid",
					Message: "Must be a valid UUID",
				}}}
			}
			if itemDiveSiteID != input.DiveSiteID {
				return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
					Path:    []any{"items", idx, "diveSiteId"},
					Code:    "custom",
					Message: "per-item dive sites are not supported in this flow",
				}}}
			}
		}

		items = append(items, mediarepo.CreateMediaItemInput{
			MediaObjectID:   row.ID,
			AuthorAppUserID: input.ActorID,
			DiveSiteID:      itemDiveSiteID,
			Type:            item.Type,
			StorageKey:      row.ObjectKey,
			MimeType:        row.MimeType,
			Width:           row.Width,
			Height:          row.Height,
			DurationMs:      nil,
			Caption:         caption,
			SortOrder:       int32(idx),
			Status:          "active",
		})
	}

	source := strings.TrimSpace(input.Source)
	if source == "" {
		source = "create_post"
	}
	if source != "create_post" && source != "profile_upload" {
		return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"source"},
			Code:    "invalid_enum",
			Message: "source is invalid",
		}}}
	}

	postCaption := normalizeOptionalString(input.PostCaption)
	createdPost, createdItems, err := s.repo.PublishMediaPost(ctx, mediarepo.PublishMediaPostInput{
		AuthorAppUserID: input.ActorID,
		Source:          source,
		DiveSiteID:      input.DiveSiteID,
		PostCaption:     postCaption,
		Items:           items,
	})
	if err != nil {
		return CreateMediaPostResult{}, apperrors.New(http.StatusInternalServerError, "media_post_create_failed", "failed to create media post", err)
	}

	resultItems := make([]ProfileMediaItemResult, 0, len(createdItems))
	for _, item := range createdItems {
		resultItems = append(resultItems, ProfileMediaItemResult{
			ID:               item.ID,
			MediaObjectID:    item.MediaObjectID,
			PostID:           item.PostID,
			UploadGroupID:    item.UploadGroupID,
			AuthorAppUserID:  item.AuthorAppUserID,
			Type:             item.Type,
			StorageKey:       item.StorageKey,
			MimeType:         item.MimeType,
			Width:            int(item.Width),
			Height:           int(item.Height),
			DurationMs:       intPtrFromInt32(item.DurationMs),
			Caption:          item.Caption,
			DiveSiteID:       item.DiveSiteID,
			DiveSiteSlug:     site.Slug,
			DiveSiteName:     site.Name,
			DiveSiteArea:     site.Area,
			SortOrder:        int(item.SortOrder),
			Status:           item.Status,
			ProcessingStatus: item.ProcessingStatus,
			Playback:         momentPlaybackFromItem(item),
			PlaybackURL:      item.PlaybackURL,
			ThumbnailURL:     item.ThumbnailURL,
			PreviewURL:       item.PreviewURL,
			StreamUID:        item.StreamUID,
			LikeCount:        0,
			CommentCount:     0,
			ViewerHasLiked:   false,
			ViewerHasSaved:   false,
			CreatedAt:        item.CreatedAt,
		})
	}

	if s.activity != nil {
		media := make([]map[string]any, 0, len(resultItems))
		for _, item := range resultItems {
			media = append(media, map[string]any{
				"id":            item.ID,
				"mediaObjectId": item.MediaObjectID,
				"type":          item.Type,
				"width":         item.Width,
				"height":        item.Height,
			})
		}
		_ = s.activity.PublishActivity(ctx, feedservice.ActivityPublishInput{
			Type:            feedservice.ActivityMediaPostCreated,
			SourceModule:    feedservice.ActivitySourceMedia,
			SourceType:      "media_post",
			SourceID:        createdPost.ID,
			ActorUserID:     createdPost.AuthorAppUserID,
			TargetType:      "media_post",
			TargetID:        createdPost.ID,
			Visibility:      feedservice.ActivityVisibilityPublic,
			State:           feedservice.ActivityStateActive,
			Area:            site.Area,
			DiveSiteID:      site.ID,
			OccurredAt:      createdPost.CreatedAt,
			SourceCreatedAt: createdPost.CreatedAt,
			Title:           site.Name,
			Body:            valueOrEmptyString(createdPost.PostCaption),
			Media:           media,
			Metadata: map[string]any{
				"diveSiteName": site.Name,
				"diveSiteSlug": site.Slug,
				"source":       source,
			},
		})
	}

	return CreateMediaPostResult{
		Post: MediaPostResult{
			ID:              createdPost.ID,
			AuthorAppUserID: createdPost.AuthorAppUserID,
			UploadGroupID:   createdPost.UploadGroupID,
			DiveSiteID:      valueOrEmptyString(createdPost.DiveSiteID),
			PostCaption:     createdPost.PostCaption,
			LikeCount:       0,
			CommentCount:    0,
			ViewerHasLiked:  false,
			ViewerHasSaved:  false,
			CreatedAt:       createdPost.CreatedAt,
			UpdatedAt:       createdPost.UpdatedAt,
		},
		Items: resultItems,
	}, nil
}

func (s *Service) ListProfileMedia(ctx context.Context, input ListProfileMediaInput) (ListProfileMediaResult, error) {
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"username"},
			Code:    "required",
			Message: "username is required",
		}}}
	}
	if input.Limit <= 0 || input.Limit > 60 {
		input.Limit = 24
	}

	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		decodedCreated, decodedID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = decodedCreated
		cursorID = decodedID
	}

	rows, err := s.repo.ListProfileMediaByUsername(ctx, mediarepo.ListProfileMediaInput{
		Username:      username,
		ViewerUserID:  strings.TrimSpace(input.ViewerUserID),
		CursorCreated: cursorCreated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ListProfileMediaResult{}, apperrors.New(http.StatusInternalServerError, "profile_media_failed", "failed to load profile media", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}

	items := make([]ProfileMediaItemResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, ProfileMediaItemResult{
			ID:               row.ID,
			MediaObjectID:    row.MediaObjectID,
			PostID:           row.PostID,
			PostCaption:      row.PostCaption,
			UploadGroupID:    row.UploadGroupID,
			AuthorAppUserID:  row.AuthorAppUserID,
			Type:             row.Type,
			StorageKey:       row.StorageKey,
			MimeType:         row.MimeType,
			Width:            int(row.Width),
			Height:           int(row.Height),
			DurationMs:       intPtrFromInt32(row.DurationMs),
			Caption:          row.Caption,
			DiveSiteID:       row.DiveSiteID,
			DiveSiteSlug:     row.DiveSiteSlug,
			DiveSiteName:     row.DiveSiteName,
			DiveSiteArea:     row.DiveSiteArea,
			SortOrder:        int(row.SortOrder),
			Status:           row.Status,
			ProcessingStatus: row.ProcessingStatus,
			Playback:         momentPlaybackFromProfileItem(row),
			PlaybackURL:      row.PlaybackURL,
			ThumbnailURL:     row.ThumbnailURL,
			PreviewURL:       row.PreviewURL,
			StreamUID:        row.StreamUID,
			LikeCount:        row.LikeCount,
			CommentCount:     row.CommentCount,
			ViewerHasLiked:   row.ViewerHasLiked,
			ViewerHasSaved:   row.ViewerHasSaved,
			CreatedAt:        row.CreatedAt,
		})
	}

	return ListProfileMediaResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) ListProfileMoments(ctx context.Context, input ListProfileMediaInput) (ListProfileMediaResult, error) {
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"username"},
			Code:    "required",
			Message: "username is required",
		}}}
	}
	if input.Limit <= 0 || input.Limit > 60 {
		input.Limit = 24
	}

	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		decodedCreated, decodedID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = decodedCreated
		cursorID = decodedID
	}

	rows, err := s.repo.ListProfileMomentsByUsername(ctx, mediarepo.ListProfileMediaInput{
		Username:      username,
		ViewerUserID:  strings.TrimSpace(input.ViewerUserID),
		CursorCreated: cursorCreated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ListProfileMediaResult{}, apperrors.New(http.StatusInternalServerError, "profile_moments_failed", "failed to load Moments", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}

	items := make([]ProfileMediaItemResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, profileMediaResultFromRepo(row))
	}

	return ListProfileMediaResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) ListDiveSiteMoments(ctx context.Context, input ListDiveSiteMomentsInput) (ListProfileMediaResult, error) {
	diveSiteID := strings.TrimSpace(input.DiveSiteID)
	if _, err := uuid.Parse(diveSiteID); err != nil {
		return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"siteId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	viewerID := strings.TrimSpace(input.ViewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ListProfileMediaResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}
	if input.Limit <= 0 || input.Limit > 60 {
		input.Limit = 24
	}

	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		decodedCreated, decodedID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = decodedCreated
		cursorID = decodedID
	}

	rows, err := s.repo.ListDiveSiteMoments(ctx, mediarepo.ListDiveSiteMomentsInput{
		ViewerUserID:  viewerID,
		DiveSiteID:    diveSiteID,
		CursorCreated: cursorCreated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ListProfileMediaResult{}, apperrors.New(http.StatusInternalServerError, "dive_site_moments_failed", "failed to load Moments", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}

	items := make([]ProfileMediaItemResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, profileMediaResultFromRepo(row))
	}

	return ListProfileMediaResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) ListDiveSpotHighlights(ctx context.Context, input ListDiveSpotHighlightsInput) (ListDiveSpotHighlightsResult, error) {
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ListDiveSpotHighlightsResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"username"},
			Code:    "required",
			Message: "username is required",
		}}}
	}
	viewerID := strings.TrimSpace(input.ViewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ListDiveSpotHighlightsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}
	if input.Limit <= 0 || input.Limit > 60 {
		input.Limit = 24
	}

	rows, err := s.repo.ListProfileDiveSpotHighlightsByUsername(ctx, mediarepo.ListProfileDiveSpotHighlightsInput{
		Username:     username,
		ViewerUserID: viewerID,
		Limit:        input.Limit,
	})
	if err != nil {
		return ListDiveSpotHighlightsResult{}, apperrors.New(http.StatusInternalServerError, "profile_highlights_failed", "failed to load dive spot highlights", err)
	}

	items := make([]DiveSpotHighlightResult, 0, len(rows))
	for _, row := range rows {
		cover := row.CoverMediaItem
		items = append(items, DiveSpotHighlightResult{
			DiveSpotID:           cover.DiveSiteID,
			DiveSpotSlug:         cover.DiveSiteSlug,
			DiveSpotName:         cover.DiveSiteName,
			DiveSpotArea:         cover.DiveSiteArea,
			CoverMediaObjectID:   cover.MediaObjectID,
			CoverThumbnailURL:    s.signMediaURL(cover.StorageKey, PresetThumb),
			MediaCount:           row.MediaCount,
			LatestMediaCreatedAt: row.LatestMediaCreatedAt,
		})
	}

	return ListDiveSpotHighlightsResult{Items: items}, nil
}

func (s *Service) ListDiveSpotHighlightMedia(ctx context.Context, input ListDiveSpotHighlightMediaInput) (ListProfileMediaResult, error) {
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"username"},
			Code:    "required",
			Message: "username is required",
		}}}
	}
	diveSpotID := strings.TrimSpace(input.DiveSpotID)
	if _, err := uuid.Parse(diveSpotID); err != nil {
		return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"diveSpotId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	viewerID := strings.TrimSpace(input.ViewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ListProfileMediaResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}
	if input.Limit <= 0 || input.Limit > 120 {
		input.Limit = 60
	}

	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		decodedCreated, decodedID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListProfileMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = decodedCreated
		cursorID = decodedID
	}

	rows, err := s.repo.ListProfileMediaByUsernameAndDiveSite(ctx, mediarepo.ListProfileDiveSpotMediaInput{
		Username:      username,
		ViewerUserID:  viewerID,
		DiveSiteID:    diveSpotID,
		CursorCreated: cursorCreated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ListProfileMediaResult{}, apperrors.New(http.StatusInternalServerError, "profile_highlight_media_failed", "failed to load dive spot highlight media", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}

	items := make([]ProfileMediaItemResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, profileMediaResultFromRepo(row))
	}

	return ListProfileMediaResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) LikeMediaPost(ctx context.Context, actorID, postID string) (LikeStateResult, error) {
	return s.setMediaPostLike(ctx, actorID, postID, true)
}

func (s *Service) UnlikeMediaPost(ctx context.Context, actorID, postID string) (LikeStateResult, error) {
	return s.setMediaPostLike(ctx, actorID, postID, false)
}

func (s *Service) setMediaPostLike(ctx context.Context, actorID, postID string, liked bool) (LikeStateResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return LikeStateResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(postID)); err != nil {
		return LikeStateResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetVisibleMediaPostSocialState(ctx, postID, actorID); err != nil {
		if mediarepo.IsNoRows(err) {
			return LikeStateResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_like_failed", "failed to load media post", err)
	}
	if liked {
		if err := s.repo.LikeMediaPost(ctx, postID, actorID); err != nil {
			return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_like_failed", "failed to like media post", err)
		}
	} else if err := s.repo.UnlikeMediaPost(ctx, postID, actorID); err != nil {
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_like_failed", "failed to unlike media post", err)
	}
	state, err := s.repo.GetVisibleMediaPostSocialState(ctx, postID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return LikeStateResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return LikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_like_failed", "failed to load media post", err)
	}
	state.ViewerHasLiked = liked
	return LikeStateResult{
		PostID:         state.PostID,
		LikeCount:      state.LikeCount,
		ViewerHasLiked: state.ViewerHasLiked,
	}, nil
}

func (s *Service) SaveMediaPost(ctx context.Context, actorID, postID string) (SaveStateResult, error) {
	return s.setMediaPostSave(ctx, actorID, postID, true)
}

func (s *Service) UnsaveMediaPost(ctx context.Context, actorID, postID string) (SaveStateResult, error) {
	return s.setMediaPostSave(ctx, actorID, postID, false)
}

func (s *Service) setMediaPostSave(ctx context.Context, actorID, postID string, saved bool) (SaveStateResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return SaveStateResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(postID)); err != nil {
		return SaveStateResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetVisibleMediaPostSocialState(ctx, postID, actorID); err != nil {
		if mediarepo.IsNoRows(err) {
			return SaveStateResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return SaveStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_save_failed", "failed to load media post", err)
	}
	if saved {
		if err := s.repo.SaveMediaPost(ctx, postID, actorID); err != nil {
			return SaveStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_save_failed", "failed to save media post", err)
		}
	} else if err := s.repo.UnsaveMediaPost(ctx, postID, actorID); err != nil {
		return SaveStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_save_failed", "failed to unsave media post", err)
	}
	state, err := s.repo.GetVisibleMediaPostSocialState(ctx, postID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return SaveStateResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return SaveStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_save_failed", "failed to load media post", err)
	}
	state.ViewerHasSaved = saved
	return SaveStateResult{PostID: state.PostID, ViewerHasSaved: state.ViewerHasSaved}, nil
}

func (s *Service) GetMediaPostDetail(ctx context.Context, postID, viewerUserID string) (MediaPostDetailResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(postID)); err != nil {
		return MediaPostDetailResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if strings.TrimSpace(viewerUserID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(viewerUserID)); err != nil {
			return MediaPostDetailResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}
	rows, err := s.repo.GetMediaPostDetail(ctx, postID, strings.TrimSpace(viewerUserID))
	if err != nil {
		return MediaPostDetailResult{}, apperrors.New(http.StatusInternalServerError, "media_post_detail_failed", "failed to load media post", err)
	}
	if len(rows) == 0 {
		return MediaPostDetailResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", nil)
	}
	first := rows[0]
	items := make([]ProfileMediaItemResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, profileMediaResultFromRepo(row.ProfileMediaItem))
	}
	return MediaPostDetailResult{
		Post: MediaPostResult{
			ID:              first.PostID,
			AuthorAppUserID: first.AuthorAppUserID,
			UploadGroupID:   first.UploadGroupID,
			DiveSiteID:      first.DiveSiteID,
			PostCaption:     first.PostCaption,
			LikeCount:       first.LikeCount,
			CommentCount:    first.CommentCount,
			ViewerHasLiked:  first.ViewerHasLiked,
			ViewerHasSaved:  first.ViewerHasSaved,
			CreatedAt:       first.PostCreatedAt,
			UpdatedAt:       first.PostUpdatedAt,
		},
		Author: MediaPostAuthorResult{
			ID:          first.AuthorAppUserID,
			Username:    first.AuthorUsername,
			DisplayName: first.AuthorDisplayName,
			AvatarURL:   first.AuthorAvatarURL,
		},
		Items: items,
	}, nil
}

func (s *Service) ListMediaPostComments(ctx context.Context, input ListMediaPostCommentsInput) (ListMediaPostCommentsResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(input.PostID)); err != nil {
		return ListMediaPostCommentsResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	viewerID := strings.TrimSpace(input.ViewerUserID)
	if viewerID != "" {
		if _, err := uuid.Parse(viewerID); err != nil {
			return ListMediaPostCommentsResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid viewer id", err)
		}
	}
	if _, err := s.repo.GetVisibleMediaPostSocialState(ctx, input.PostID, viewerID); err != nil {
		if mediarepo.IsNoRows(err) {
			return ListMediaPostCommentsResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return ListMediaPostCommentsResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comments_failed", "failed to load media post", err)
	}
	if input.Limit <= 0 || input.Limit > pagination.MaxLimit {
		input.Limit = pagination.DefaultLimit
	}
	cursorCreated, cursorID := pagination.DefaultUUIDCursor()
	if strings.TrimSpace(input.Cursor) != "" {
		decodedCreated, decodedID, err := pagination.DecodeUUID(input.Cursor)
		if err != nil {
			return ListMediaPostCommentsResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"cursor"},
				Code:    "custom",
				Message: "invalid cursor",
			}}}
		}
		cursorCreated = decodedCreated
		cursorID = decodedID
	}
	rows, err := s.repo.ListMediaPostComments(ctx, mediarepo.ListMediaPostCommentsInput{
		PostID:        input.PostID,
		ViewerUserID:  viewerID,
		CursorCreated: cursorCreated,
		CursorID:      cursorID,
		Limit:         input.Limit + 1,
	})
	if err != nil {
		return ListMediaPostCommentsResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comments_failed", "failed to load comments", err)
	}
	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = pagination.Encode(next.CreatedAt, next.ID)
		rows = rows[:cutoff]
	}
	items := make([]MediaPostCommentResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, mediaPostCommentResultFromRepo(row))
	}
	return ListMediaPostCommentsResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) CreateMediaPostComment(ctx context.Context, input CreateMediaPostCommentInput) (MediaPostCommentResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(input.ActorID)); err != nil {
		return MediaPostCommentResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(input.PostID)); err != nil {
		return MediaPostCommentResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	body := strings.TrimSpace(input.Body)
	if body == "" {
		return MediaPostCommentResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"body"},
			Code:    "required",
			Message: "body is required",
		}}}
	}
	if len([]rune(body)) > 4000 {
		return MediaPostCommentResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"body"},
			Code:    "too_big",
			Message: "body must be 4000 characters or fewer",
		}}}
	}
	if _, err := s.repo.GetVisibleMediaPostSocialState(ctx, input.PostID, input.ActorID); err != nil {
		if mediarepo.IsNoRows(err) {
			return MediaPostCommentResult{}, apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return MediaPostCommentResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_failed", "failed to load media post", err)
	}
	row, err := s.repo.CreateMediaPostComment(ctx, input.PostID, input.ActorID, body)
	if err != nil {
		return MediaPostCommentResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_failed", "failed to create comment", err)
	}
	return mediaPostCommentResultFromRepo(row), nil
}

func (s *Service) DeleteMediaPostComment(ctx context.Context, input DeleteMediaPostCommentInput) error {
	if _, err := uuid.Parse(strings.TrimSpace(input.ActorID)); err != nil {
		return apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(input.PostID)); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(strings.TrimSpace(input.CommentID)); err != nil {
		return ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"commentId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetVisibleMediaPostSocialState(ctx, input.PostID, input.ActorID); err != nil {
		if mediarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "media_post_not_found", "media post not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "media_post_comment_failed", "failed to load media post", err)
	}
	comment, err := s.repo.GetMediaPostComment(ctx, input.PostID, input.CommentID, input.ActorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return apperrors.New(http.StatusNotFound, "media_post_comment_not_found", "comment not found", err)
		}
		return apperrors.New(http.StatusInternalServerError, "media_post_comment_failed", "failed to load comment", err)
	}
	if comment.AuthorUserID != input.ActorID && !isModeratorRole(input.ActorRole) {
		return apperrors.New(http.StatusForbidden, "forbidden", "only owner or moderator can delete comment", nil)
	}
	if err := s.repo.SoftDeleteMediaPostComment(ctx, input.PostID, input.CommentID, input.ActorID); err != nil {
		return apperrors.New(http.StatusInternalServerError, "media_post_comment_failed", "failed to delete comment", err)
	}
	return nil
}

func (s *Service) LikeMediaPostComment(ctx context.Context, actorID, postID, commentID string) (CommentLikeStateResult, error) {
	return s.setMediaPostCommentLike(ctx, actorID, postID, commentID, true)
}

func (s *Service) UnlikeMediaPostComment(ctx context.Context, actorID, postID, commentID string) (CommentLikeStateResult, error) {
	return s.setMediaPostCommentLike(ctx, actorID, postID, commentID, false)
}

func (s *Service) setMediaPostCommentLike(ctx context.Context, actorID, postID, commentID string, liked bool) (CommentLikeStateResult, error) {
	if _, err := uuid.Parse(strings.TrimSpace(actorID)); err != nil {
		return CommentLikeStateResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if _, err := uuid.Parse(strings.TrimSpace(postID)); err != nil {
		return CommentLikeStateResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"postId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := uuid.Parse(strings.TrimSpace(commentID)); err != nil {
		return CommentLikeStateResult{}, ValidationFailure{Issues: []validatex.Issue{{
			Path:    []any{"commentId"},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}}
	}
	if _, err := s.repo.GetVisibleMediaPostCommentLikeState(ctx, postID, commentID, actorID); err != nil {
		if mediarepo.IsNoRows(err) {
			return CommentLikeStateResult{}, apperrors.New(http.StatusNotFound, "media_post_comment_not_found", "comment not found", err)
		}
		return CommentLikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_like_failed", "failed to load comment", err)
	}
	if liked {
		if err := s.repo.LikeMediaPostComment(ctx, commentID, actorID); err != nil {
			return CommentLikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_like_failed", "failed to like comment", err)
		}
	} else if err := s.repo.UnlikeMediaPostComment(ctx, commentID, actorID); err != nil {
		return CommentLikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_like_failed", "failed to unlike comment", err)
	}
	state, err := s.repo.GetVisibleMediaPostCommentLikeState(ctx, postID, commentID, actorID)
	if err != nil {
		if mediarepo.IsNoRows(err) {
			return CommentLikeStateResult{}, apperrors.New(http.StatusNotFound, "media_post_comment_not_found", "comment not found", err)
		}
		return CommentLikeStateResult{}, apperrors.New(http.StatusInternalServerError, "media_post_comment_like_failed", "failed to load comment", err)
	}
	state.ViewerHasLiked = liked
	return CommentLikeStateResult{
		CommentID:      state.CommentID,
		LikeCount:      state.LikeCount,
		ViewerHasLiked: state.ViewerHasLiked,
	}, nil
}

func (s *Service) ListMedia(ctx context.Context, input ListMediaInput) (ListMediaResult, error) {
	if _, err := uuid.Parse(input.OwnerUserID); err != nil {
		return ListMediaResult{}, apperrors.New(http.StatusUnauthorized, "unauthorized", "invalid actor id", err)
	}
	if input.Limit <= 0 || input.Limit > 100 {
		input.Limit = 20
	}
	if input.ContextType != nil && strings.TrimSpace(*input.ContextType) != "" {
		if _, ok := contextRules[strings.TrimSpace(*input.ContextType)]; !ok {
			return ListMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"contextType"}, Code: "invalid_enum", Message: "unsupported contextType"}}}
		}
	}
	if input.ContextID != nil && strings.TrimSpace(*input.ContextID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(*input.ContextID)); err != nil {
			return ListMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"contextId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}}
		}
	}

	cursorCreated := time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC)
	cursorID := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	if strings.TrimSpace(input.Cursor) != "" {
		parts := strings.Split(strings.TrimSpace(input.Cursor), "|")
		if len(parts) != 2 {
			return ListMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"cursor"}, Code: "custom", Message: "invalid cursor"}}}
		}
		nanos, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return ListMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"cursor"}, Code: "custom", Message: "invalid cursor"}}}
		}
		if _, err := uuid.Parse(parts[1]); err != nil {
			return ListMediaResult{}, ValidationFailure{Issues: []validatex.Issue{{Path: []any{"cursor"}, Code: "custom", Message: "invalid cursor"}}}
		}
		cursorCreated = time.Unix(0, nanos).UTC()
		cursorID = parts[1]
	}

	limitPlusOne := input.Limit + 1
	var rows []mediarepo.MediaObject
	var err error
	if input.ContextType != nil && strings.TrimSpace(*input.ContextType) != "" {
		rows, err = s.listOwnedMediaByContext(ctx, input, strings.TrimSpace(*input.ContextType), cursorCreated, cursorID, limitPlusOne)
	} else {
		rows, err = s.repo.ListMediaByOwner(ctx, mediarepo.ListMediaByOwnerInput{
			OwnerAppUserID: input.OwnerUserID,
			CursorCreated:  cursorCreated,
			CursorID:       cursorID,
			Limit:          limitPlusOne,
		})
	}
	if err != nil {
		return ListMediaResult{}, apperrors.New(http.StatusInternalServerError, "media_list_failed", "failed to list media", err)
	}

	nextCursor := ""
	if int32(len(rows)) > input.Limit {
		cutoff := int(input.Limit)
		next := rows[cutoff-1]
		nextCursor = strconv.FormatInt(next.CreatedAt.UnixNano(), 10) + "|" + next.ID
		rows = rows[:cutoff]
	}

	items := make([]UploadResult, 0, len(rows))
	for _, row := range rows {
		items = append(items, UploadResult{
			ID:          row.ID,
			ObjectKey:   row.ObjectKey,
			MimeType:    row.MimeType,
			SizeBytes:   row.SizeBytes,
			Width:       int(row.Width),
			Height:      int(row.Height),
			ContextType: row.ContextType,
			ContextID:   row.ContextID,
			State:       row.State,
		})
	}

	return ListMediaResult{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) listOwnedMediaByContext(
	ctx context.Context,
	input ListMediaInput,
	contextType string,
	cursorCreated time.Time,
	cursorID string,
	limitPlusOne int32,
) ([]mediarepo.MediaObject, error) {
	collected := make([]mediarepo.MediaObject, 0, limitPlusOne)
	nextCreated := cursorCreated
	nextID := cursorID

	for int32(len(collected)) < limitPlusOne {
		rows, err := s.repo.ListMediaByContext(ctx, mediarepo.ListMediaByContextInput{
			ContextType:   contextType,
			ContextID:     input.ContextID,
			CursorCreated: nextCreated,
			CursorID:      nextID,
			Limit:         limitPlusOne,
		})
		if err != nil {
			return nil, err
		}
		if len(rows) == 0 {
			break
		}

		for _, row := range rows {
			if row.OwnerAppUserID == input.OwnerUserID {
				collected = append(collected, row)
				if int32(len(collected)) == limitPlusOne {
					break
				}
			}
		}

		if int32(len(rows)) < limitPlusOne {
			break
		}
		last := rows[len(rows)-1]
		nextCreated = last.CreatedAt
		nextID = last.ID
	}

	return collected, nil
}

func mapSiteLookupError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return apperrors.New(http.StatusNotFound, "site_not_found", "dive site not found", err)
	}
	return apperrors.New(http.StatusInternalServerError, "site_lookup_failed", "failed to load dive site", err)
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func firstNonEmptyCaption(items []CreateMediaPostItemInput) *string {
	for _, item := range items {
		if caption := normalizeOptionalString(item.Caption); caption != nil {
			return caption
		}
	}
	return nil
}

func intPtrFromInt32(value *int32) *int {
	if value == nil {
		return nil
	}
	result := int(*value)
	return &result
}

func intValueFromInt32(value *int32) int {
	if value == nil {
		return 0
	}
	return int(*value)
}

func valueOrEmptyString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func momentPlaybackFromProfileItem(item mediarepo.ProfileMediaItem) *MomentPlaybackResult {
	return momentPlaybackFromItem(item.MediaItem)
}

func momentPlaybackFromItem(item mediarepo.MediaItem) *MomentPlaybackResult {
	if item.Type != "video" || item.Provider != "cloudflare_stream" {
		return nil
	}
	uid := valueOrEmptyString(item.PlaybackUID)
	if uid == "" {
		uid = valueOrEmptyString(item.StreamUID)
	}
	if uid == "" {
		uid = cloudflareStreamUIDFromPlaybackURL(valueOrEmptyString(item.PlaybackURL))
	}
	if uid == "" && valueOrEmptyString(item.PlaybackURL) == "" {
		return nil
	}
	iframeURL := valueOrEmptyString(item.PlaybackURL)
	if iframeURL == "" && uid != "" {
		iframeURL = "https://iframe.videodelivery.net/" + uid
	}
	hlsURL := ""
	if uid != "" {
		hlsURL = "https://videodelivery.net/" + uid + "/manifest/video.m3u8"
	}
	posterURL := firstNonEmpty(valueOrEmptyString(item.ThumbnailURL), valueOrEmptyString(item.PreviewURL))
	return &MomentPlaybackResult{
		Provider:  "cloudflare_stream",
		IframeURL: optionalStringPtr(iframeURL),
		HLSURL:    optionalStringPtr(hlsURL),
		PosterURL: optionalStringPtr(posterURL),
	}
}

func momentPlaybackMapFromItem(item mediarepo.MediaItem) map[string]any {
	playback := momentPlaybackFromItem(item)
	if playback == nil {
		return nil
	}
	return map[string]any{
		"provider":  playback.Provider,
		"iframeUrl": playback.IframeURL,
		"hlsUrl":    playback.HLSURL,
		"dashUrl":   playback.DASHURL,
		"posterUrl": playback.PosterURL,
	}
}

func optionalStringPtr(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}

func cloudflareStreamUIDFromPlaybackURL(playbackURL string) string {
	trimmed := strings.TrimSpace(playbackURL)
	if trimmed == "" {
		return ""
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		return ""
	}
	host := strings.ToLower(parsed.Hostname())
	if host != "iframe.videodelivery.net" && host != "videodelivery.net" {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}

func momentStatusFromItem(item mediarepo.MediaItem) MomentStatusResult {
	return MomentStatusResult{
		PostID:          item.PostID,
		MediaItemID:     item.ID,
		Status:          item.ProcessingStatus,
		Playback:        momentPlaybackFromItem(item),
		PlaybackURL:     valueOrEmptyString(item.PlaybackURL),
		ThumbnailURL:    valueOrEmptyString(item.ThumbnailURL),
		PreviewURL:      valueOrEmptyString(item.PreviewURL),
		DurationMs:      intPtrFromInt32(item.DurationMs),
		Width:           int(item.Width),
		Height:          int(item.Height),
		FailedReason:    item.FailedReason,
		UploadExpiresAt: item.UploadExpiresAt,
		ReadyAt:         item.ReadyAt,
	}
}

func validateContext(contextType string, contextID *string) (contextRule, []validatex.Issue) {
	rule, ok := contextRules[contextType]
	if !ok {
		return contextRule{}, []validatex.Issue{{Path: []any{"contextType"}, Code: "invalid_enum", Message: "unsupported contextType"}}
	}
	if rule.requiresContextID {
		if contextID == nil || strings.TrimSpace(*contextID) == "" {
			return contextRule{}, []validatex.Issue{{Path: []any{"contextId"}, Code: "required", Message: "contextId is required for contextType"}}
		}
		if _, err := uuid.Parse(strings.TrimSpace(*contextID)); err != nil {
			return contextRule{}, []validatex.Issue{{Path: []any{"contextId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}
		}
	}
	if contextID != nil && strings.TrimSpace(*contextID) != "" {
		if _, err := uuid.Parse(strings.TrimSpace(*contextID)); err != nil {
			return contextRule{}, []validatex.Issue{{Path: []any{"contextId"}, Code: "invalid_uuid", Message: "Must be a valid UUID"}}
		}
	}
	return rule, nil
}

func buildObjectKey(contextType, ownerUserID string, contextID *string, filename string, now time.Time) string {
	year := fmt.Sprintf("%04d", now.UTC().Year())
	month := fmt.Sprintf("%02d", int(now.UTC().Month()))

	switch contextType {
	case ContextProfileAvatar:
		return path.Join("avatars", ownerUserID, filename)
	case ContextProfileFeed:
		return path.Join("feed", ownerUserID, year, month, filename)
	case ContextChikaAttachment:
		return path.Join("chika", valueOrEmpty(contextID), filename)
	case ContextEventAttachment:
		return path.Join("events", valueOrEmpty(contextID), filename)
	case ContextPaymentMethodQR:
		return path.Join("payment-methods", valueOrEmpty(contextID), filename)
	case ContextCourseBookingReceipt:
		return path.Join("course-bookings", valueOrEmpty(contextID), "receipts", filename)
	case ContextDiveSpotAttachment:
		return path.Join("dive-spots", valueOrEmpty(contextID), filename)
	case ContextGroupCover:
		return path.Join("groups", valueOrEmpty(contextID), "cover", filename)
	case ContextInstructorProof:
		return path.Join("instructors", ownerUserID, "certification-proof", filename)
	default:
		return path.Join("unknown", ownerUserID, filename)
	}
}

func buildFilename(ext string, now time.Time) (string, error) {
	raw := make([]byte, 4)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	randHex := hex.EncodeToString(raw)
	return fmt.Sprintf("%d-%s.%s", now.UTC().UnixMilli(), randHex, ext), nil
}

func sniffAndMeasureImage(file io.ReadSeeker) (string, int, int, error) {
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", 0, 0, fmt.Errorf("failed to inspect file")
	}
	header := make([]byte, 512)
	n, err := io.ReadFull(file, header)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", 0, 0, fmt.Errorf("failed to read file header")
	}
	mimeType := strings.ToLower(strings.TrimSpace(http.DetectContentType(header[:n])))
	if mimeType == "application/octet-stream" {
		return "", 0, 0, fmt.Errorf("unsupported image type")
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", 0, 0, fmt.Errorf("failed to inspect file")
	}
	if mimeType == "image/webp" {
		w, h, parseErr := parseWebPDimensions(file)
		if parseErr != nil {
			return "", 0, 0, fmt.Errorf("failed to read image dimensions")
		}
		return mimeType, w, h, nil
	}
	cfg, _, err := image.DecodeConfig(file)
	if err != nil {
		return "", 0, 0, fmt.Errorf("failed to decode image")
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return "", 0, 0, fmt.Errorf("invalid image dimensions")
	}
	return mimeType, cfg.Width, cfg.Height, nil
}

func parseWebPDimensions(rs io.ReadSeeker) (int, int, error) {
	if _, err := rs.Seek(0, io.SeekStart); err != nil {
		return 0, 0, err
	}
	buf := make([]byte, 64)
	n, err := io.ReadFull(rs, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return 0, 0, err
	}
	buf = buf[:n]
	if len(buf) < 30 || string(buf[0:4]) != "RIFF" || string(buf[8:12]) != "WEBP" {
		return 0, 0, fmt.Errorf("invalid webp header")
	}
	chunk := string(buf[12:16])
	switch chunk {
	case "VP8 ":
		if len(buf) < 30 {
			return 0, 0, fmt.Errorf("invalid vp8 header")
		}
		if !(buf[23] == 0x9d && buf[24] == 0x01 && buf[25] == 0x2a) {
			return 0, 0, fmt.Errorf("invalid vp8 signature")
		}
		width := int(binary.LittleEndian.Uint16(buf[26:28]) & 0x3fff)
		height := int(binary.LittleEndian.Uint16(buf[28:30]) & 0x3fff)
		if width <= 0 || height <= 0 {
			return 0, 0, fmt.Errorf("invalid vp8 dimensions")
		}
		return width, height, nil
	case "VP8L":
		if len(buf) < 25 {
			return 0, 0, fmt.Errorf("invalid vp8l header")
		}
		if buf[20] != 0x2f {
			return 0, 0, fmt.Errorf("invalid vp8l signature")
		}
		b0 := uint32(buf[21])
		b1 := uint32(buf[22])
		b2 := uint32(buf[23])
		b3 := uint32(buf[24])
		width := int(1 + (b0 | ((b1 & 0x3f) << 8)))
		height := int(1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)))
		if width <= 0 || height <= 0 {
			return 0, 0, fmt.Errorf("invalid vp8l dimensions")
		}
		return width, height, nil
	case "VP8X":
		if len(buf) < 30 {
			return 0, 0, fmt.Errorf("invalid vp8x header")
		}
		width := 1 + int(buf[24]) + int(buf[25])<<8 + int(buf[26])<<16
		height := 1 + int(buf[27]) + int(buf[28])<<8 + int(buf[29])<<16
		if width <= 0 || height <= 0 {
			return 0, 0, fmt.Errorf("invalid vp8x dimensions")
		}
		return width, height, nil
	default:
		return 0, 0, fmt.Errorf("unsupported webp chunk")
	}
}

func extForMime(mimeType string) string {
	if ext, ok := mimeExt[mimeType]; ok {
		return ext
	}
	return "bin"
}

func profileMediaResultFromRepo(row mediarepo.ProfileMediaItem) ProfileMediaItemResult {
	return ProfileMediaItemResult{
		ID:               row.ID,
		MediaObjectID:    row.MediaObjectID,
		PostID:           row.PostID,
		PostCaption:      row.PostCaption,
		UploadGroupID:    row.UploadGroupID,
		AuthorAppUserID:  row.AuthorAppUserID,
		Type:             row.Type,
		StorageKey:       row.StorageKey,
		MimeType:         row.MimeType,
		Width:            int(row.Width),
		Height:           int(row.Height),
		DurationMs:       intPtrFromInt32(row.DurationMs),
		Caption:          row.Caption,
		DiveSiteID:       row.DiveSiteID,
		DiveSiteSlug:     row.DiveSiteSlug,
		DiveSiteName:     row.DiveSiteName,
		DiveSiteArea:     row.DiveSiteArea,
		SortOrder:        int(row.SortOrder),
		Status:           row.Status,
		ProcessingStatus: row.ProcessingStatus,
		Playback:         momentPlaybackFromProfileItem(row),
		PlaybackURL:      row.PlaybackURL,
		ThumbnailURL:     row.ThumbnailURL,
		PreviewURL:       row.PreviewURL,
		StreamUID:        row.StreamUID,
		LikeCount:        row.LikeCount,
		CommentCount:     row.CommentCount,
		ViewerHasLiked:   row.ViewerHasLiked,
		ViewerHasSaved:   row.ViewerHasSaved,
		CreatedAt:        row.CreatedAt,
	}
}

func mediaPostCommentResultFromRepo(row mediarepo.MediaPostComment) MediaPostCommentResult {
	return MediaPostCommentResult{
		ID:     row.ID,
		PostID: row.PostID,
		Author: MediaPostCommentAuthorResult{
			ID:          row.AuthorUserID,
			Username:    row.AuthorUsername,
			DisplayName: row.AuthorDisplayName,
			AvatarURL:   row.AuthorAvatarURL,
		},
		Body:           row.Body,
		LikeCount:      row.LikeCount,
		ViewerHasLiked: row.ViewerHasLiked,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func (s *Service) signMediaURL(objectKey, preset string) string {
	if strings.TrimSpace(s.cdnBaseURL) == "" || strings.TrimSpace(s.signingSecret) == "" {
		return ""
	}
	if !isValidObjectKey(objectKey) {
		return ""
	}
	rule := contextRules[ContextProfileFeed]
	width := defaultWidthForPreset(preset)
	quality := defaultQualityForPreset(preset)
	signer := mediasign.New(s.cdnBaseURL, s.signingSecret, s.signingKeyVersion, mediasign.WithNow(s.nowFn))
	return signer.URLWithTransform(objectKey, width, quality, "auto", rule.ttl)
}

func isModeratorRole(role string) bool {
	switch strings.TrimSpace(role) {
	case "moderator", "admin", "super_admin":
		return true
	default:
		return false
	}
}

func isAllowedOutputFormat(format string) bool {
	switch format {
	case "auto", "webp", "jpeg", "png":
		return true
	default:
		return false
	}
}

func defaultWidthForPreset(preset string) int {
	rule := presetRules[preset]
	if rule.defaultWidth == nil {
		return 0
	}
	return *rule.defaultWidth
}

func defaultQualityForPreset(preset string) int {
	rule := presetRules[preset]
	if rule.defaultQ == nil {
		return 75
	}
	return *rule.defaultQ
}

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func ptrInt(value int) *int {
	return &value
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func isValidObjectKey(objectKey string) bool {
	key := strings.TrimSpace(objectKey)
	if key == "" || strings.HasPrefix(key, "/") {
		return false
	}
	parts := strings.Split(key, "/")
	for _, part := range parts {
		if part == ".." {
			return false
		}
	}
	return true
}
