package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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

	mediarepo "fphgo/internal/features/media/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/pagination"
	"fphgo/internal/shared/validatex"
)

const (
	ContextProfileAvatar      = "profile_avatar"
	ContextProfileFeed        = "profile_feed"
	ContextChikaAttachment    = "chika_attachment"
	ContextEventAttachment    = "event_attachment"
	ContextDiveSpotAttachment = "dive_spot_attachment"
	ContextGroupCover         = "group_cover"

	PresetThumb    = "thumb"
	PresetCard     = "card"
	PresetDialog   = "dialog"
	PresetOriginal = "original"
)

type repository interface {
	CreateMediaObject(ctx context.Context, input mediarepo.CreateMediaObjectInput) (mediarepo.MediaObject, error)
	GetMediaObjectsByIDs(ctx context.Context, mediaIDs []string) ([]mediarepo.MediaObject, error)
	ListMediaByOwner(ctx context.Context, input mediarepo.ListMediaByOwnerInput) ([]mediarepo.MediaObject, error)
	ListMediaByContext(ctx context.Context, input mediarepo.ListMediaByContextInput) ([]mediarepo.MediaObject, error)
	PublishMediaPost(ctx context.Context, input mediarepo.PublishMediaPostInput) (mediarepo.MediaPost, []mediarepo.MediaItem, error)
	ListProfileMediaByUsername(ctx context.Context, input mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error)
}

type uploader interface {
	PutObject(ctx context.Context, bucketName, objectKey, contentType string, body io.Reader, sizeBytes int64) error
	DeleteObject(ctx context.Context, bucketName, objectKey string) error
}

type Service struct {
	repo              repository
	uploader          uploader
	siteLookup        siteLookup
	bucketName        string
	cdnBaseURL        string
	signingSecret     string
	signingKeyVersion int
	nowFn             func() time.Time
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

type Option func(*Service)

func WithSiteLookup(lookup siteLookup) Option {
	return func(s *Service) {
		if lookup != nil {
			s.siteLookup = lookup
		}
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
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ProfileMediaItemResult struct {
	ID              string
	MediaObjectID   string
	PostID          string
	UploadGroupID   string
	AuthorAppUserID string
	Type            string
	StorageKey      string
	MimeType        string
	Width           int
	Height          int
	DurationMs      *int
	Caption         *string
	DiveSiteID      string
	DiveSiteSlug    string
	DiveSiteName    string
	DiveSiteArea    string
	SortOrder       int
	Status          string
	CreatedAt       time.Time
}

type CreateMediaPostResult struct {
	Post  MediaPostResult
	Items []ProfileMediaItemResult
}

type ListProfileMediaInput struct {
	Username string
	Cursor   string
	Limit    int32
}

type ListProfileMediaResult struct {
	Items      []ProfileMediaItemResult
	NextCursor string
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
		maxUploadBytes:    5 * 1024 * 1024,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 1024,
		allowedPresets:    map[string]bool{PresetThumb: true, PresetCard: true, PresetDialog: true},
	},
	ContextProfileFeed: {
		maxUploadBytes:    5 * 1024 * 1024,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextChikaAttachment: {
		maxUploadBytes:    10 * 1024 * 1024,
		ttl:               12 * time.Hour,
		maxTransformWidth: 1600,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextEventAttachment: {
		maxUploadBytes:    10 * 1024 * 1024,
		ttl:               3 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextDiveSpotAttachment: {
		maxUploadBytes:    10 * 1024 * 1024,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
		allowedPresets:    map[string]bool{PresetCard: true, PresetDialog: true},
	},
	ContextGroupCover: {
		maxUploadBytes:    10 * 1024 * 1024,
		ttl:               7 * 24 * time.Hour,
		maxTransformWidth: 2048,
		requiresContextID: true,
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
	for _, row := range rows {
		byID[row.ID] = row
	}

	result := MintURLsResult{Items: make([]MintedURLItem, 0, len(input.Items)), Errors: make([]MintError, 0)}
	for _, item := range input.Items {
		row, ok := byID[item.MediaID]
		if !ok {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "not_found", Message: "media not found"})
			continue
		}
		if row.OwnerAppUserID != input.ViewerUserID {
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
		if !rule.allowedPresets[preset] && preset != PresetOriginal {
			result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "preset_not_allowed", Message: "preset is not allowed for media context"})
			continue
		}

		now := s.nowFn()
		expiresAt := now.Add(rule.ttl).Unix()
		query := make(url.Values)
		query.Set("exp", strconv.FormatInt(expiresAt, 10))
		query.Set("k", strconv.Itoa(s.signingKeyVersion))

		if preset != PresetOriginal {
			format := "auto"
			if item.Format != nil && strings.TrimSpace(*item.Format) != "" {
				format = strings.ToLower(strings.TrimSpace(*item.Format))
			}
			if !isAllowedOutputFormat(format) {
				result.Errors = append(result.Errors, MintError{MediaID: item.MediaID, Code: "invalid_format", Message: "format is invalid"})
				continue
			}
			width := defaultWidthForPreset(preset)
			if item.Width != nil && *item.Width > 0 {
				width = *item.Width
			}
			width = clampInt(width, 1, rule.maxTransformWidth)

			quality := defaultQualityForPreset(preset)
			if item.Quality != nil {
				quality = *item.Quality
			}
			quality = clampInt(quality, 50, 85)

			query.Set("w", strconv.Itoa(width))
			query.Set("q", strconv.Itoa(quality))
			query.Set("f", format)
		}

		requestPath := "/" + row.ObjectKey
		canonical := canonicalString(requestPath, query)
		signature := signCanonical(canonical, s.signingSecret)
		query.Set("sig", signature)

		result.Items = append(result.Items, MintedURLItem{
			MediaID:   item.MediaID,
			URL:       s.cdnBaseURL + requestPath + "?" + query.Encode(),
			ExpiresAt: expiresAt,
		})
	}

	return result, nil
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
		if row.SizeBytes > 5*1024*1024 {
			return CreateMediaPostResult{}, ValidationFailure{Issues: []validatex.Issue{{
				Path:    []any{"items", idx, "mediaObjectId"},
				Code:    "too_big",
				Message: "file exceeds 5 MB limit",
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
			ID:              item.ID,
			MediaObjectID:   item.MediaObjectID,
			PostID:          item.PostID,
			UploadGroupID:   item.UploadGroupID,
			AuthorAppUserID: item.AuthorAppUserID,
			Type:            item.Type,
			StorageKey:      item.StorageKey,
			MimeType:        item.MimeType,
			Width:           int(item.Width),
			Height:          int(item.Height),
			DurationMs:      intPtrFromInt32(item.DurationMs),
			Caption:         item.Caption,
			DiveSiteID:      item.DiveSiteID,
			DiveSiteSlug:    site.Slug,
			DiveSiteName:    site.Name,
			DiveSiteArea:    site.Area,
			SortOrder:       int(item.SortOrder),
			Status:          item.Status,
			CreatedAt:       item.CreatedAt,
		})
	}

	return CreateMediaPostResult{
		Post: MediaPostResult{
			ID:              createdPost.ID,
			AuthorAppUserID: createdPost.AuthorAppUserID,
			UploadGroupID:   createdPost.UploadGroupID,
			DiveSiteID:      createdPost.DiveSiteID,
			PostCaption:     createdPost.PostCaption,
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
			ID:              row.ID,
			MediaObjectID:   row.MediaObjectID,
			PostID:          row.PostID,
			UploadGroupID:   row.UploadGroupID,
			AuthorAppUserID: row.AuthorAppUserID,
			Type:            row.Type,
			StorageKey:      row.StorageKey,
			MimeType:        row.MimeType,
			Width:           int(row.Width),
			Height:          int(row.Height),
			DurationMs:      intPtrFromInt32(row.DurationMs),
			Caption:         row.Caption,
			DiveSiteID:      row.DiveSiteID,
			DiveSiteSlug:    row.DiveSiteSlug,
			DiveSiteName:    row.DiveSiteName,
			DiveSiteArea:    row.DiveSiteArea,
			SortOrder:       int(row.SortOrder),
			Status:          row.Status,
			CreatedAt:       row.CreatedAt,
		})
	}

	return ListProfileMediaResult{Items: items, NextCursor: nextCursor}, nil
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
	case ContextDiveSpotAttachment:
		return path.Join("dive-spots", valueOrEmpty(contextID), filename)
	case ContextGroupCover:
		return path.Join("groups", valueOrEmpty(contextID), "cover", filename)
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

func canonicalString(requestPath string, query url.Values) string {
	signedKeys := []string{"f", "q", "w", "exp", "k"}
	parts := make([]string, 0, len(signedKeys))
	for _, key := range signedKeys {
		value := strings.TrimSpace(query.Get(key))
		if value == "" {
			continue
		}
		parts = append(parts, key+"="+value)
	}
	return "GET\n" + requestPath + "\n" + strings.Join(parts, "&")
}

func signCanonical(canonical, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = io.Copy(h, bytes.NewBufferString(canonical))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
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
