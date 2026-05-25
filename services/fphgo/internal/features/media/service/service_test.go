package service

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	feedservice "fphgo/internal/features/feed/service"
	mediarepo "fphgo/internal/features/media/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
)

type fakeRepo struct {
	created                      []mediarepo.CreateMediaObjectInput
	mediaByID                    map[string]mediarepo.MediaObject
	visibleProfileMediaObjectIDs map[string]bool
	publishedPost                *mediarepo.PublishMediaPostInput
	socialState                  mediarepo.PostSocialState
	commentLikeState             mediarepo.CommentLikeState
	likedPostID                  string
	unlikedPostID                string
	savedPostID                  string
	unsavedPostID                string
	likeUserID                   string
	saveUserID                   string
	comments                     []mediarepo.MediaPostComment
	deletedCommentID             string
	commentLikedID               string
	commentUnlikedID             string
	highlights                   []mediarepo.ProfileDiveSpotHighlight
	highlightMedia               []mediarepo.ProfileMediaItem
	profileMedia                 []mediarepo.ProfileMediaItem
	profileMoments               []mediarepo.ProfileMediaItem
	diveSiteMoments              []mediarepo.ProfileMediaItem
	lastHighlightsInput          mediarepo.ListProfileDiveSpotHighlightsInput
	lastHighlightMediaInput      mediarepo.ListProfileDiveSpotMediaInput
	lastProfileMediaInput        mediarepo.ListProfileMediaInput
	lastProfileMomentsInput      mediarepo.ListProfileMediaInput
	lastDiveSiteMomentsInput     mediarepo.ListDiveSiteMomentsInput
	momentItem                   *mediarepo.MediaItem
	momentLookupErr              error
	markMomentUploadedCalls      int
	expiredMomentRows            []int64
	expiredMomentCalls           int
	expiredMomentNow             time.Time
	expiredMomentFailedReason    string
}

func (f *fakeRepo) CreateMediaObject(_ context.Context, input mediarepo.CreateMediaObjectInput) (mediarepo.MediaObject, error) {
	f.created = append(f.created, input)
	id := "11111111-1111-1111-1111-111111111111"
	obj := mediarepo.MediaObject{
		ID:             id,
		OwnerAppUserID: input.OwnerAppUserID,
		ContextType:    input.ContextType,
		ContextID:      input.ContextID,
		ObjectKey:      input.ObjectKey,
		MimeType:       input.MimeType,
		SizeBytes:      input.SizeBytes,
		Width:          input.Width,
		Height:         input.Height,
		State:          input.State,
		CreatedAt:      time.Now().UTC(),
	}
	if f.mediaByID == nil {
		f.mediaByID = map[string]mediarepo.MediaObject{}
	}
	f.mediaByID[id] = obj
	return obj, nil
}

func (f *fakeRepo) GetMediaObjectsByIDs(_ context.Context, mediaIDs []string) ([]mediarepo.MediaObject, error) {
	items := make([]mediarepo.MediaObject, 0, len(mediaIDs))
	for _, id := range mediaIDs {
		if item, ok := f.mediaByID[id]; ok {
			items = append(items, item)
		}
	}
	return items, nil
}

func (f *fakeRepo) ListVisibleProfileMediaObjectIDs(_ context.Context, mediaIDs []string, _ string) (map[string]bool, error) {
	visible := make(map[string]bool, len(mediaIDs))
	for _, id := range mediaIDs {
		if f.visibleProfileMediaObjectIDs[id] {
			visible[id] = true
		}
	}
	return visible, nil
}

func (f *fakeRepo) ListMediaByOwner(_ context.Context, input mediarepo.ListMediaByOwnerInput) ([]mediarepo.MediaObject, error) {
	items := make([]mediarepo.MediaObject, 0, len(f.mediaByID))
	for _, item := range f.mediaByID {
		if item.OwnerAppUserID != input.OwnerAppUserID {
			continue
		}
		if item.CreatedAt.After(input.CursorCreated) {
			continue
		}
		if item.CreatedAt.Equal(input.CursorCreated) && item.ID >= input.CursorID {
			continue
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	if int32(len(items)) > input.Limit {
		items = items[:input.Limit]
	}
	return items, nil
}

func (f *fakeRepo) ListMediaByContext(_ context.Context, input mediarepo.ListMediaByContextInput) ([]mediarepo.MediaObject, error) {
	items := make([]mediarepo.MediaObject, 0, len(f.mediaByID))
	contextID := ""
	if input.ContextID != nil {
		contextID = strings.TrimSpace(*input.ContextID)
	}
	for _, item := range f.mediaByID {
		if item.ContextType != input.ContextType {
			continue
		}
		itemContextID := ""
		if item.ContextID != nil {
			itemContextID = strings.TrimSpace(*item.ContextID)
		}
		if itemContextID != contextID {
			continue
		}
		if item.CreatedAt.After(input.CursorCreated) {
			continue
		}
		if item.CreatedAt.Equal(input.CursorCreated) && item.ID >= input.CursorID {
			continue
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	if int32(len(items)) > input.Limit {
		items = items[:input.Limit]
	}
	return items, nil
}

func (f *fakeRepo) PublishMediaPost(_ context.Context, input mediarepo.PublishMediaPostInput) (mediarepo.MediaPost, []mediarepo.MediaItem, error) {
	f.publishedPost = &input
	post := mediarepo.MediaPost{
		ID:              "22222222-2222-2222-2222-222222222222",
		AuthorAppUserID: input.AuthorAppUserID,
		UploadGroupID:   "33333333-3333-3333-3333-333333333333",
		DiveSiteID:      &input.DiveSiteID,
		PostCaption:     input.PostCaption,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}
	items := make([]mediarepo.MediaItem, 0, len(input.Items))
	for idx, item := range input.Items {
		items = append(items, mediarepo.MediaItem{
			ID:              "44444444-4444-4444-4444-44444444444" + string(rune('0'+idx)),
			PostID:          post.ID,
			MediaObjectID:   item.MediaObjectID,
			AuthorAppUserID: item.AuthorAppUserID,
			UploadGroupID:   post.UploadGroupID,
			DiveSiteID:      item.DiveSiteID,
			Type:            item.Type,
			StorageKey:      item.StorageKey,
			MimeType:        item.MimeType,
			Width:           item.Width,
			Height:          item.Height,
			DurationMs:      item.DurationMs,
			Caption:         item.Caption,
			SortOrder:       item.SortOrder,
			Status:          item.Status,
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
		})
	}
	return post, items, nil
}

func (f *fakeRepo) CreateMoment(_ context.Context, input mediarepo.CreateMomentInput) (mediarepo.MediaPost, mediarepo.MediaItem, error) {
	post := mediarepo.MediaPost{
		ID:              "22222222-2222-2222-2222-222222222222",
		AuthorAppUserID: input.AuthorAppUserID,
		UploadGroupID:   "33333333-3333-3333-3333-333333333333",
		DiveSiteID:      input.DiveSiteID,
		PostCaption:     input.PostCaption,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}
	item := mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           post.ID,
		MediaObjectID:    "11111111-1111-1111-1111-111111111111",
		AuthorAppUserID:  input.AuthorAppUserID,
		UploadGroupID:    post.UploadGroupID,
		Type:             "video",
		StorageKey:       "cloudflare-stream/" + input.StreamUID,
		MimeType:         "video/mp4",
		Width:            1,
		Height:           1,
		Status:           "hidden",
		Provider:         "cloudflare_stream",
		StreamUID:        &input.StreamUID,
		PlaybackUID:      &input.StreamUID,
		ProcessingStatus: "upload_requested",
		ModerationStatus: "approved",
		UploadExpiresAt:  &input.UploadExpiresAt,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}
	if input.DiveSiteID != nil {
		item.DiveSiteID = *input.DiveSiteID
	}
	return post, item, nil
}

func (f *fakeRepo) GetMomentMediaItemByPostForOwner(_ context.Context, postID, ownerID string) (mediarepo.MediaItem, error) {
	if f.momentLookupErr != nil {
		return mediarepo.MediaItem{}, f.momentLookupErr
	}
	if f.momentItem != nil {
		return *f.momentItem, nil
	}
	streamUID := "stream123"
	return mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           postID,
		AuthorAppUserID:  ownerID,
		Type:             "video",
		Status:           "hidden",
		Provider:         "cloudflare_stream",
		StreamUID:        &streamUID,
		ProcessingStatus: "processing",
		ModerationStatus: "approved",
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) GetMomentMediaItemByStreamUID(_ context.Context, streamUID string) (mediarepo.MediaItem, error) {
	return mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           "22222222-2222-2222-2222-222222222222",
		Type:             "video",
		Status:           "hidden",
		Provider:         "cloudflare_stream",
		StreamUID:        &streamUID,
		ProcessingStatus: "processing",
		ModerationStatus: "approved",
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) MarkMomentUploaded(_ context.Context, postID, ownerID string) (mediarepo.MediaItem, error) {
	f.markMomentUploadedCalls++
	streamUID := "stream123"
	return mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           postID,
		AuthorAppUserID:  ownerID,
		Type:             "video",
		Status:           "hidden",
		Provider:         "cloudflare_stream",
		StreamUID:        &streamUID,
		ProcessingStatus: "processing",
		ModerationStatus: "approved",
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) MarkMomentReady(_ context.Context, input mediarepo.MomentStatusUpdate) (mediarepo.MediaItem, error) {
	return mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           "22222222-2222-2222-2222-222222222222",
		Type:             "video",
		Status:           "active",
		Provider:         "cloudflare_stream",
		StreamUID:        &input.StreamUID,
		ProcessingStatus: "ready",
		ModerationStatus: "approved",
		Width:            input.Width,
		Height:           input.Height,
		DurationMs:       input.DurationMs,
		PlaybackURL:      &input.PlaybackURL,
		ThumbnailURL:     &input.ThumbnailURL,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) MarkMomentFailed(_ context.Context, input mediarepo.MomentStatusUpdate) (mediarepo.MediaItem, error) {
	return mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           "22222222-2222-2222-2222-222222222222",
		Type:             "video",
		Status:           "hidden",
		Provider:         "cloudflare_stream",
		StreamUID:        &input.StreamUID,
		ProcessingStatus: "failed",
		FailedReason:     &input.FailedReason,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) MarkExpiredMomentUploadsFailed(_ context.Context, now time.Time, failedReason string) (int64, error) {
	f.expiredMomentCalls++
	f.expiredMomentNow = now
	f.expiredMomentFailedReason = failedReason
	if len(f.expiredMomentRows) == 0 {
		return 0, nil
	}
	count := f.expiredMomentRows[0]
	f.expiredMomentRows = f.expiredMomentRows[1:]
	return count, nil
}

func (f *fakeRepo) ListProfileMediaByUsername(_ context.Context, input mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error) {
	f.lastProfileMediaInput = input
	return f.profileMedia, nil
}

func (f *fakeRepo) ListProfileMomentsByUsername(_ context.Context, input mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error) {
	f.lastProfileMomentsInput = input
	return f.profileMoments, nil
}

func (f *fakeRepo) ListDiveSiteMoments(_ context.Context, input mediarepo.ListDiveSiteMomentsInput) ([]mediarepo.ProfileMediaItem, error) {
	f.lastDiveSiteMomentsInput = input
	return f.diveSiteMoments, nil
}

func (f *fakeRepo) ListProfileDiveSpotHighlightsByUsername(_ context.Context, input mediarepo.ListProfileDiveSpotHighlightsInput) ([]mediarepo.ProfileDiveSpotHighlight, error) {
	f.lastHighlightsInput = input
	return f.highlights, nil
}

func (f *fakeRepo) ListProfileMediaByUsernameAndDiveSite(_ context.Context, input mediarepo.ListProfileDiveSpotMediaInput) ([]mediarepo.ProfileMediaItem, error) {
	f.lastHighlightMediaInput = input
	return f.highlightMedia, nil
}

func (f *fakeRepo) GetVisibleMediaPostSocialState(_ context.Context, postID, _ string) (mediarepo.PostSocialState, error) {
	if f.socialState.PostID == "" {
		return mediarepo.PostSocialState{PostID: postID}, nil
	}
	return f.socialState, nil
}

func (f *fakeRepo) LikeMediaPost(_ context.Context, postID, userID string) error {
	f.likedPostID = postID
	f.likeUserID = userID
	f.socialState = mediarepo.PostSocialState{PostID: postID, LikeCount: 1, ViewerHasLiked: true}
	return nil
}

func (f *fakeRepo) UnlikeMediaPost(_ context.Context, postID, userID string) error {
	f.unlikedPostID = postID
	f.likeUserID = userID
	f.socialState = mediarepo.PostSocialState{PostID: postID, LikeCount: 0, ViewerHasLiked: false}
	return nil
}

func (f *fakeRepo) SaveMediaPost(_ context.Context, postID, userID string) error {
	f.savedPostID = postID
	f.saveUserID = userID
	f.socialState.PostID = postID
	f.socialState.ViewerHasSaved = true
	return nil
}

func (f *fakeRepo) UnsaveMediaPost(_ context.Context, postID, userID string) error {
	f.unsavedPostID = postID
	f.saveUserID = userID
	f.socialState.PostID = postID
	f.socialState.ViewerHasSaved = false
	return nil
}

func (f *fakeRepo) GetMediaPostDetail(_ context.Context, _, _ string) ([]mediarepo.MediaPostDetailItem, error) {
	return nil, nil
}

func (f *fakeRepo) CreateMediaPostComment(_ context.Context, postID, authorUserID, body string) (mediarepo.MediaPostComment, error) {
	comment := mediarepo.MediaPostComment{
		ID:                "77777777-7777-4777-8777-777777777777",
		PostID:            postID,
		AuthorUserID:      authorUserID,
		AuthorDisplayName: "Diver",
		AuthorUsername:    "diver",
		Body:              body,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	f.comments = append([]mediarepo.MediaPostComment{comment}, f.comments...)
	f.socialState.PostID = postID
	f.socialState.CommentCount++
	return comment, nil
}

func (f *fakeRepo) GetMediaPostComment(_ context.Context, postID, commentID, _ string) (mediarepo.MediaPostComment, error) {
	for _, comment := range f.comments {
		if comment.ID == commentID && comment.PostID == postID {
			return comment, nil
		}
	}
	return mediarepo.MediaPostComment{
		ID:                commentID,
		PostID:            postID,
		AuthorUserID:      "550e8400-e29b-41d4-a716-446655440000",
		AuthorDisplayName: "Diver",
		AuthorUsername:    "diver",
		Body:              "hello",
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}, nil
}

func (f *fakeRepo) ListMediaPostComments(_ context.Context, _ mediarepo.ListMediaPostCommentsInput) ([]mediarepo.MediaPostComment, error) {
	return f.comments, nil
}

func (f *fakeRepo) SoftDeleteMediaPostComment(_ context.Context, postID, commentID, _ string) error {
	f.deletedCommentID = commentID
	if f.socialState.PostID == "" {
		f.socialState.PostID = postID
	}
	if f.socialState.CommentCount > 0 {
		f.socialState.CommentCount--
	}
	return nil
}

func (f *fakeRepo) GetVisibleMediaPostCommentLikeState(_ context.Context, postID, commentID, _ string) (mediarepo.CommentLikeState, error) {
	if f.commentLikeState.CommentID == "" {
		return mediarepo.CommentLikeState{PostID: postID, CommentID: commentID}, nil
	}
	return f.commentLikeState, nil
}

func (f *fakeRepo) LikeMediaPostComment(_ context.Context, commentID, userID string) error {
	f.commentLikedID = commentID
	f.likeUserID = userID
	f.commentLikeState.CommentID = commentID
	f.commentLikeState.LikeCount = 1
	f.commentLikeState.ViewerHasLiked = true
	return nil
}

func (f *fakeRepo) UnlikeMediaPostComment(_ context.Context, commentID, userID string) error {
	f.commentUnlikedID = commentID
	f.likeUserID = userID
	f.commentLikeState.CommentID = commentID
	f.commentLikeState.LikeCount = 0
	f.commentLikeState.ViewerHasLiked = false
	return nil
}

type fakeSiteLookup struct {
	site SiteRecord
	err  error
}

type fakeActivityPublisher struct {
	items []feedservice.ActivityPublishInput
}

func (f *fakeActivityPublisher) PublishActivity(_ context.Context, input feedservice.ActivityPublishInput) error {
	f.items = append(f.items, input)
	return nil
}

func (f fakeSiteLookup) GetSiteForWrite(context.Context, string) (SiteRecord, error) {
	if f.err != nil {
		return SiteRecord{}, f.err
	}
	return f.site, nil
}

type fakeUploader struct {
	putCalls    int
	deleteCalls int
	lastObject  string
	lastMime    string
	lastSize    int64
	lastBody    []byte
}

type fakeStreamClient struct {
	createInput  StreamDirectUploadInput
	createResult StreamDirectUploadResult
	video        StreamVideo
	getCalls     int
}

func (f *fakeStreamClient) CreateDirectUpload(_ context.Context, input StreamDirectUploadInput) (StreamDirectUploadResult, error) {
	f.createInput = input
	if f.createResult.UID == "" {
		f.createResult = StreamDirectUploadResult{UID: "stream123", UploadURL: "https://upload.videodelivery.net/direct"}
	}
	return f.createResult, nil
}

func (f *fakeStreamClient) GetVideo(_ context.Context, uid string) (StreamVideo, error) {
	f.getCalls++
	if f.video.UID == "" {
		f.video.UID = uid
	}
	return f.video, nil
}

func (f *fakeUploader) PutObject(_ context.Context, _ string, objectKey, contentType string, body io.Reader, sizeBytes int64) error {
	f.putCalls++
	f.lastObject = objectKey
	f.lastMime = contentType
	f.lastSize = sizeBytes
	uploaded, _ := io.ReadAll(body)
	f.lastBody = uploaded
	return nil
}

func (f *fakeUploader) DeleteObject(_ context.Context, _ string, _ string) error {
	f.deleteCalls++
	return nil
}

func TestUploadRejectsOversizeByContext(t *testing.T) {
	repo := &fakeRepo{}
	uploader := &fakeUploader{}
	svc := New(repo, uploader, "bucket", "https://cdn.example.com", "secret", 1)

	_, err := svc.Upload(context.Background(), UploadInput{
		OwnerUserID: "550e8400-e29b-41d4-a716-446655440000",
		ContextType: ContextProfileAvatar,
		SizeBytes:   11 * 1024 * 1024,
		File:        bytes.NewReader([]byte("not-an-image")),
	})
	if err == nil || !strings.Contains(err.Error(), "validation failed") {
		t.Fatalf("expected validation failure, got %v", err)
	}
}

func TestUploadRejectsInvalidType(t *testing.T) {
	repo := &fakeRepo{}
	uploader := &fakeUploader{}
	svc := New(repo, uploader, "bucket", "https://cdn.example.com", "secret", 1)

	_, err := svc.Upload(context.Background(), UploadInput{
		OwnerUserID: "550e8400-e29b-41d4-a716-446655440000",
		ContextType: ContextProfileFeed,
		SizeBytes:   int64(len("hello")),
		File:        bytes.NewReader([]byte("hello")),
	})
	if err == nil || !strings.Contains(err.Error(), "validation failed") {
		t.Fatalf("expected validation failure, got %v", err)
	}
}

func TestUploadStoresRowAndCallsUploader(t *testing.T) {
	repo := &fakeRepo{}
	uploader := &fakeUploader{}
	svc := New(repo, uploader, "bucket", "https://cdn.example.com", "secret", 1)
	svc.nowFn = func() time.Time {
		return time.Date(2026, time.February, 28, 12, 0, 0, 0, time.UTC)
	}

	imageBytes := testPNG(t, 40, 30)
	result, err := svc.Upload(context.Background(), UploadInput{
		OwnerUserID: "550e8400-e29b-41d4-a716-446655440000",
		ContextType: ContextProfileFeed,
		SizeBytes:   int64(len(imageBytes)),
		File:        bytes.NewReader(imageBytes),
	})
	if err != nil {
		t.Fatalf("expected upload success, got %v", err)
	}
	if uploader.putCalls != 1 {
		t.Fatalf("expected one put call, got %d", uploader.putCalls)
	}
	if len(repo.created) != 1 {
		t.Fatalf("expected one db insert, got %d", len(repo.created))
	}
	if result.Width != 40 || result.Height != 30 {
		t.Fatalf("unexpected dimensions: %dx%d", result.Width, result.Height)
	}
}

func TestUploadStripsJPEGExif(t *testing.T) {
	repo := &fakeRepo{}
	uploader := &fakeUploader{}
	svc := New(repo, uploader, "bucket", "https://cdn.example.com", "secret", 1)
	svc.nowFn = func() time.Time {
		return time.Date(2026, time.February, 28, 12, 0, 0, 0, time.UTC)
	}

	original := testJPEG(t, 40, 30)
	withExif := appendFakeExif(original)
	if !bytes.Contains(withExif, []byte("Exif\x00\x00")) {
		t.Fatal("test setup failed: exif marker missing in input")
	}

	_, err := svc.Upload(context.Background(), UploadInput{
		OwnerUserID: "550e8400-e29b-41d4-a716-446655440000",
		ContextType: ContextProfileFeed,
		SizeBytes:   int64(len(withExif)),
		File:        bytes.NewReader(withExif),
	})
	if err != nil {
		t.Fatalf("expected upload success, got %v", err)
	}
	if bytes.Contains(uploader.lastBody, []byte("Exif\x00\x00")) {
		t.Fatal("expected uploaded payload without exif marker")
	}
}

func TestMintURLsClampsWidthAndQuality(t *testing.T) {
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextChikaAttachment,
			ObjectKey:      "chika/22222222-2222-2222-2222-222222222222/1700000000000-abcd1234.jpg",
			State:          "active",
		},
	}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	svc.nowFn = func() time.Time {
		return time.Unix(1_700_000_000, 0).UTC()
	}

	result, err := svc.MintURLs(context.Background(), MintURLsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Items: []MintURLItemInput{{
			MediaID: "11111111-1111-1111-1111-111111111111",
			Preset:  PresetDialog,
			Width:   ptrInt(9999),
			Format:  ptrString("auto"),
			Quality: ptrInt(99),
		}}})
	if err != nil {
		t.Fatalf("expected mint success, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one minted item, got %d", len(result.Items))
	}
	url := result.Items[0].URL
	if !strings.Contains(url, "w=1600") {
		t.Fatalf("expected width clamp in url, got %s", url)
	}
	if !strings.Contains(url, "q=85") {
		t.Fatalf("expected quality clamp in url, got %s", url)
	}
}

func TestMediaSignerURLStable(t *testing.T) {
	signer := mediasign.New(
		"https://cdn.example.com",
		"secret",
		1,
		mediasign.WithNow(func() time.Time {
			return time.Unix(1_700_000_000, 0).UTC()
		}),
	)

	signedURL := signer.URLWithTransform("feed/user_123/2026/02/1700000123456-ab12cd.jpg", 640, 75, "auto", time.Hour)
	if !strings.HasPrefix(signedURL, "https://cdn.example.com/feed/user_123/2026/02/1700000123456-ab12cd.jpg?") {
		t.Fatalf("unexpected signed url path: %s", signedURL)
	}
	for _, part := range []string{"exp=1700003600", "f=auto", "k=1", "q=75", "w=640", "sig="} {
		if !strings.Contains(signedURL, part) {
			t.Fatalf("expected %q in signed url, got %s", part, signedURL)
		}
	}
}

func TestListDiveSpotHighlightsReturnsSignedCovers(t *testing.T) {
	createdAt := time.Date(2026, time.May, 23, 10, 0, 0, 0, time.UTC)
	repo := &fakeRepo{highlights: []mediarepo.ProfileDiveSpotHighlight{{
		CoverMediaItem: mediarepo.ProfileMediaItem{
			MediaItem: mediarepo.MediaItem{
				ID:            "11111111-1111-1111-1111-111111111111",
				MediaObjectID: "22222222-2222-2222-2222-222222222222",
				DiveSiteID:    "33333333-3333-3333-3333-333333333333",
				StorageKey:    "profile_feed/550e8400-e29b-41d4-a716-446655440000/cover.jpg",
				CreatedAt:     createdAt,
			},
			DiveSiteSlug: "anilao",
			DiveSiteName: "Anilao",
			DiveSiteArea: "Batangas",
		},
		MediaCount:           5,
		LatestMediaCreatedAt: createdAt,
	}}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret", 1)
	svc.nowFn = func() time.Time {
		return time.Unix(1_700_000_000, 0).UTC()
	}

	result, err := svc.ListDiveSpotHighlights(context.Background(), ListDiveSpotHighlightsInput{
		Username:     "member",
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Limit:        10,
	})
	if err != nil {
		t.Fatalf("expected highlights success, got %v", err)
	}
	if repo.lastHighlightsInput.Username != "member" || repo.lastHighlightsInput.Limit != 10 {
		t.Fatalf("unexpected repo input: %+v", repo.lastHighlightsInput)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one highlight, got %d", len(result.Items))
	}
	item := result.Items[0]
	if item.DiveSpotName != "Anilao" || item.MediaCount != 5 {
		t.Fatalf("unexpected highlight item: %+v", item)
	}
	if !strings.Contains(item.CoverThumbnailURL, "w=144") {
		t.Fatalf("expected thumbnail-sized signed cover url, got %s", item.CoverThumbnailURL)
	}
}

func TestListDiveSpotHighlightMediaFiltersByDiveSpot(t *testing.T) {
	repo := &fakeRepo{highlightMedia: []mediarepo.ProfileMediaItem{{
		MediaItem: mediarepo.MediaItem{
			ID:            "11111111-1111-1111-1111-111111111111",
			MediaObjectID: "22222222-2222-2222-2222-222222222222",
			DiveSiteID:    "33333333-3333-3333-3333-333333333333",
			CreatedAt:     time.Date(2026, time.May, 23, 10, 0, 0, 0, time.UTC),
		},
		DiveSiteName: "Anilao",
	}}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret", 1)

	result, err := svc.ListDiveSpotHighlightMedia(context.Background(), ListDiveSpotHighlightMediaInput{
		Username:     "member",
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		DiveSpotID:   "33333333-3333-3333-3333-333333333333",
		Limit:        60,
	})
	if err != nil {
		t.Fatalf("expected highlight media success, got %v", err)
	}
	if repo.lastHighlightMediaInput.DiveSiteID != "33333333-3333-3333-3333-333333333333" {
		t.Fatalf("expected dive spot filter to reach repo, got %+v", repo.lastHighlightMediaInput)
	}
	if len(result.Items) != 1 || result.Items[0].DiveSiteName != "Anilao" {
		t.Fatalf("unexpected media result: %+v", result.Items)
	}
}

func TestCreateMediaPostRejectsVideoItems(t *testing.T) {
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextProfileFeed,
			ObjectKey:      "feed/user/video.jpg",
			MimeType:       "image/jpeg",
			SizeBytes:      1024,
			Width:          100,
			Height:         100,
			State:          "active",
		},
	}}
	svc := New(
		repo,
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret",
		1,
		WithSiteLookup(fakeSiteLookup{site: SiteRecord{
			ID:              "66666666-6666-6666-6666-666666666666",
			Slug:            "anilao",
			Name:            "Anilao",
			Area:            "Batangas",
			ModerationState: "approved",
		}}),
	)

	_, err := svc.CreateMediaPost(context.Background(), CreateMediaPostInput{
		ActorID:    "550e8400-e29b-41d4-a716-446655440000",
		DiveSiteID: "66666666-6666-6666-6666-666666666666",
		Items: []CreateMediaPostItemInput{{
			MediaObjectID: "11111111-1111-1111-1111-111111111111",
			Type:          "video",
			StorageKey:    "feed/user/video.jpg",
			MimeType:      "image/jpeg",
			Width:         100,
			Height:        100,
			SortOrder:     0,
		}},
	})
	if err == nil || !strings.Contains(err.Error(), "validation failed") {
		t.Fatalf("expected validation failure, got %v", err)
	}
}

func TestCreateMediaPostPublishesGroupedPhotos(t *testing.T) {
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextProfileFeed,
			ObjectKey:      "feed/user/one.jpg",
			MimeType:       "image/jpeg",
			SizeBytes:      1024,
			Width:          100,
			Height:         120,
			State:          "active",
		},
		"22222222-2222-2222-2222-222222222222": {
			ID:             "22222222-2222-2222-2222-222222222222",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextProfileFeed,
			ObjectKey:      "feed/user/two.jpg",
			MimeType:       "image/jpeg",
			SizeBytes:      1024,
			Width:          100,
			Height:         150,
			State:          "active",
		},
	}}
	activity := &fakeActivityPublisher{}
	svc := New(
		repo,
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret",
		1,
		WithSiteLookup(fakeSiteLookup{site: SiteRecord{
			ID:              "66666666-6666-6666-6666-666666666666",
			Slug:            "anilao",
			Name:            "Anilao",
			Area:            "Batangas",
			ModerationState: "approved",
		}}),
		WithActivityPublisher(activity),
	)

	sharedCaption := "Freedive day"
	result, err := svc.CreateMediaPost(context.Background(), CreateMediaPostInput{
		ActorID:           "550e8400-e29b-41d4-a716-446655440000",
		DiveSiteID:        "66666666-6666-6666-6666-666666666666",
		ApplyCaptionToAll: true,
		Items: []CreateMediaPostItemInput{
			{
				MediaObjectID: "11111111-1111-1111-1111-111111111111",
				Type:          "photo",
				StorageKey:    "feed/user/one.jpg",
				MimeType:      "image/jpeg",
				Width:         100,
				Height:        120,
				Caption:       &sharedCaption,
				SortOrder:     0,
			},
			{
				MediaObjectID: "22222222-2222-2222-2222-222222222222",
				Type:          "photo",
				StorageKey:    "feed/user/two.jpg",
				MimeType:      "image/jpeg",
				Width:         100,
				Height:        150,
				SortOrder:     1,
			},
		},
	})
	if err != nil {
		t.Fatalf("expected create media post success, got %v", err)
	}
	if repo.publishedPost == nil {
		t.Fatal("expected repo publish call")
	}
	if repo.publishedPost.Source != "create_post" {
		t.Fatalf("expected default source create_post, got %s", repo.publishedPost.Source)
	}
	if len(repo.publishedPost.Items) != 2 {
		t.Fatalf("expected two published items, got %d", len(repo.publishedPost.Items))
	}
	if repo.publishedPost.Items[1].Caption == nil || *repo.publishedPost.Items[1].Caption != sharedCaption {
		t.Fatalf("expected shared caption to apply to blank item, got %#v", repo.publishedPost.Items[1].Caption)
	}
	if result.Items[0].DiveSiteName != "Anilao" {
		t.Fatalf("expected dive site name on result, got %s", result.Items[0].DiveSiteName)
	}
	if len(activity.items) != 1 {
		t.Fatalf("expected one media_post_created activity, got %#v", activity.items)
	}
	published := activity.items[0]
	if published.Type != feedservice.ActivityMediaPostCreated || published.Visibility != feedservice.ActivityVisibilityPublic {
		t.Fatalf("expected public media post activity, got %#v", published)
	}
	if len(published.Media) != 2 {
		t.Fatalf("expected activity media payload for two ready items, got %#v", published.Media)
	}
	if published.Media[0]["mediaObjectId"] != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("expected activity media object id, got %#v", published.Media[0])
	}
	if published.Media[0]["width"] != 100 || published.Media[0]["height"] != 120 {
		t.Fatalf("expected activity media dimensions, got %#v", published.Media[0])
	}
}

func TestMintURLsRejectsInvalidObjectKey(t *testing.T) {
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextProfileFeed,
			ObjectKey:      "feed/user/../bad.jpg",
			State:          "active",
		},
	}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.MintURLs(context.Background(), MintURLsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Items: []MintURLItemInput{{
			MediaID: "11111111-1111-1111-1111-111111111111",
			Preset:  PresetCard,
		}}})
	if err != nil {
		t.Fatalf("expected mint result, got error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Fatalf("expected no minted items, got %d", len(result.Items))
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "invalid_object_key" {
		t.Fatalf("expected invalid_object_key error, got %+v", result.Errors)
	}
}

func TestMintURLsRejectsForeignOwner(t *testing.T) {
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			ContextType:    ContextProfileFeed,
			ObjectKey:      "feed/user/2026/03/1700000000000-abcd1234.jpg",
			State:          "active",
		},
	}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	result, err := svc.MintURLs(context.Background(), MintURLsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Items: []MintURLItemInput{{
			MediaID: "11111111-1111-1111-1111-111111111111",
			Preset:  PresetCard,
		}},
	})
	if err != nil {
		t.Fatalf("expected mint result, got error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Fatalf("expected no minted items, got %d", len(result.Items))
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "not_found" {
		t.Fatalf("expected not_found error, got %+v", result.Errors)
	}
}

func TestMintURLsAllowsVisibleForeignProfileFeedMedia(t *testing.T) {
	repo := &fakeRepo{
		mediaByID: map[string]mediarepo.MediaObject{
			"11111111-1111-1111-1111-111111111111": {
				ID:             "11111111-1111-1111-1111-111111111111",
				OwnerAppUserID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				ContextType:    ContextProfileFeed,
				ObjectKey:      "feed/user/2026/03/1700000000000-abcd1234.jpg",
				State:          "active",
			},
		},
		visibleProfileMediaObjectIDs: map[string]bool{
			"11111111-1111-1111-1111-111111111111": true,
		},
	}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	result, err := svc.MintURLs(context.Background(), MintURLsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Items: []MintURLItemInput{{
			MediaID: "11111111-1111-1111-1111-111111111111",
			Preset:  PresetCard,
		}},
	})
	if err != nil {
		t.Fatalf("expected mint result, got error: %v", err)
	}
	if len(result.Errors) != 0 {
		t.Fatalf("expected no mint errors, got %+v", result.Errors)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one minted profile media item, got %d", len(result.Items))
	}
}

func TestMintURLsRejectsForeignProfileFeedOriginalPreset(t *testing.T) {
	repo := &fakeRepo{
		mediaByID: map[string]mediarepo.MediaObject{
			"11111111-1111-1111-1111-111111111111": {
				ID:             "11111111-1111-1111-1111-111111111111",
				OwnerAppUserID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				ContextType:    ContextProfileFeed,
				ObjectKey:      "feed/user/2026/03/1700000000000-abcd1234.jpg",
				State:          "active",
			},
		},
		visibleProfileMediaObjectIDs: map[string]bool{
			"11111111-1111-1111-1111-111111111111": true,
		},
	}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	result, err := svc.MintURLs(context.Background(), MintURLsInput{
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Items: []MintURLItemInput{{
			MediaID: "11111111-1111-1111-1111-111111111111",
			Preset:  PresetOriginal,
		}},
	})
	if err != nil {
		t.Fatalf("expected mint result, got error: %v", err)
	}
	if len(result.Items) != 0 {
		t.Fatalf("expected no minted original items, got %d", len(result.Items))
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "preset_not_allowed" {
		t.Fatalf("expected preset_not_allowed error, got %+v", result.Errors)
	}
}

func TestListMediaByContextReturnsOnlyOwnerItems(t *testing.T) {
	contextID := "22222222-2222-2222-2222-222222222222"
	repo := &fakeRepo{mediaByID: map[string]mediarepo.MediaObject{
		"11111111-1111-1111-1111-111111111111": {
			ID:             "11111111-1111-1111-1111-111111111111",
			OwnerAppUserID: "550e8400-e29b-41d4-a716-446655440000",
			ContextType:    ContextEventAttachment,
			ContextID:      &contextID,
			ObjectKey:      "events/22222222-2222-2222-2222-222222222222/1700000000000-abcd1234.jpg",
			State:          "active",
			CreatedAt:      time.Date(2026, time.March, 1, 10, 0, 0, 0, time.UTC),
		},
		"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
			ID:             "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			OwnerAppUserID: "99999999-9999-4999-8999-999999999999",
			ContextType:    ContextEventAttachment,
			ContextID:      &contextID,
			ObjectKey:      "events/22222222-2222-2222-2222-222222222222/1700000001000-ffff0000.jpg",
			State:          "active",
			CreatedAt:      time.Date(2026, time.March, 1, 9, 0, 0, 0, time.UTC),
		},
	}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	result, err := svc.ListMedia(context.Background(), ListMediaInput{
		OwnerUserID: "550e8400-e29b-41d4-a716-446655440000",
		ContextType: ptrString(ContextEventAttachment),
		ContextID:   &contextID,
		Limit:       20,
	})
	if err != nil {
		t.Fatalf("expected list success, got %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected one item, got %d", len(result.Items))
	}
	if result.Items[0].ID != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("unexpected media id: %s", result.Items[0].ID)
	}
}

func TestLikeMediaPostRequiresActor(t *testing.T) {
	svc := New(&fakeRepo{}, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	_, err := svc.LikeMediaPost(context.Background(), "", "22222222-2222-4222-8222-222222222222")
	if err == nil {
		t.Fatal("expected auth error")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok {
		t.Fatalf("expected AppError, got %T", err)
	}
	if appErr.Status != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized, got %+v", appErr)
	}
}

func TestLikeMediaPostUpdatesState(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.LikeMediaPost(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"22222222-2222-4222-8222-222222222222",
	)
	if err != nil {
		t.Fatalf("like media post: %v", err)
	}
	if repo.likedPostID != "22222222-2222-4222-8222-222222222222" || repo.likeUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo like call, got post=%q user=%q", repo.likedPostID, repo.likeUserID)
	}
	if result.PostID != "22222222-2222-4222-8222-222222222222" || result.LikeCount != 1 || !result.ViewerHasLiked {
		t.Fatalf("unexpected like result: %+v", result)
	}
}

func TestUnlikeMediaPostUpdatesState(t *testing.T) {
	repo := &fakeRepo{socialState: mediarepo.PostSocialState{
		PostID:         "22222222-2222-4222-8222-222222222222",
		LikeCount:      1,
		ViewerHasLiked: true,
	}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.UnlikeMediaPost(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"22222222-2222-4222-8222-222222222222",
	)
	if err != nil {
		t.Fatalf("unlike media post: %v", err)
	}
	if repo.unlikedPostID != "22222222-2222-4222-8222-222222222222" || repo.likeUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo unlike call, got post=%q user=%q", repo.unlikedPostID, repo.likeUserID)
	}
	if result.PostID != "22222222-2222-4222-8222-222222222222" || result.LikeCount != 0 || result.ViewerHasLiked {
		t.Fatalf("unexpected unlike result: %+v", result)
	}
}

func TestSaveMediaPostUpdatesState(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.SaveMediaPost(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"22222222-2222-4222-8222-222222222222",
	)
	if err != nil {
		t.Fatalf("save media post: %v", err)
	}
	if repo.savedPostID != "22222222-2222-4222-8222-222222222222" || repo.saveUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo save call, got post=%q user=%q", repo.savedPostID, repo.saveUserID)
	}
	if result.PostID != "22222222-2222-4222-8222-222222222222" || !result.ViewerHasSaved {
		t.Fatalf("unexpected save result: %+v", result)
	}
}

func TestCreateMediaPostCommentTrimsBody(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.CreateMediaPostComment(context.Background(), CreateMediaPostCommentInput{
		ActorID: "550e8400-e29b-41d4-a716-446655440000",
		PostID:  "22222222-2222-4222-8222-222222222222",
		Body:    "  looks calm  ",
	})
	if err != nil {
		t.Fatalf("create comment: %v", err)
	}
	if result.Body != "looks calm" {
		t.Fatalf("expected trimmed comment body, got %q", result.Body)
	}
}

func TestCreateMediaPostCommentRejectsEmptyBody(t *testing.T) {
	svc := New(&fakeRepo{}, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	_, err := svc.CreateMediaPostComment(context.Background(), CreateMediaPostCommentInput{
		ActorID: "550e8400-e29b-41d4-a716-446655440000",
		PostID:  "22222222-2222-4222-8222-222222222222",
		Body:    "   ",
	})
	if err == nil || !strings.Contains(err.Error(), "validation failed") {
		t.Fatalf("expected validation failure, got %v", err)
	}
}

func TestLikeMediaPostCommentUpdatesState(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.LikeMediaPostComment(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"22222222-2222-4222-8222-222222222222",
		"33333333-3333-4333-8333-333333333333",
	)
	if err != nil {
		t.Fatalf("like media post comment: %v", err)
	}
	if repo.commentLikedID != "33333333-3333-4333-8333-333333333333" || repo.likeUserID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected repo comment like call, got comment=%q user=%q", repo.commentLikedID, repo.likeUserID)
	}
	if result.CommentID != "33333333-3333-4333-8333-333333333333" || result.LikeCount != 1 || !result.ViewerHasLiked {
		t.Fatalf("unexpected comment like result: %+v", result)
	}
}

func TestCreateMomentUploadIntentCreatesPendingStreamMoment(t *testing.T) {
	stream := &fakeStreamClient{}
	svc := New(
		&fakeRepo{},
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithStreamClient(stream, false),
		WithSiteLookup(fakeSiteLookup{site: SiteRecord{
			ID:              "55555555-5555-4555-8555-555555555555",
			Name:            "Anilao",
			ModerationState: "approved",
		}}),
	)

	result, err := svc.CreateMomentUploadIntent(context.Background(), CreateMomentUploadIntentInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Caption:     ptrString("duck dive"),
		DiveSiteID:  ptrString("55555555-5555-4555-8555-555555555555"),
		Filename:    ptrString("moment.mp4"),
		ContentType: ptrString("video/mp4"),
	})
	if err != nil {
		t.Fatalf("create moment intent: %v", err)
	}
	if result.PostID == "" || result.UploadURL == "" || result.Status != "upload_requested" {
		t.Fatalf("unexpected moment intent result: %+v", result)
	}
	if strings.Contains(result.UploadURL, "stream-token") {
		t.Fatalf("upload intent response must not expose API token: %+v", result)
	}
	if stream.createInput.MaxDurationSeconds != 30 || stream.createInput.RequireSignedURLs {
		t.Fatalf("unexpected stream create input: %+v", stream.createInput)
	}
}

func TestCreateMomentUploadIntentRejectsUnsafeSignedPlayback(t *testing.T) {
	svc := New(
		&fakeRepo{},
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithStreamClient(&fakeStreamClient{}, true),
	)

	_, err := svc.CreateMomentUploadIntent(context.Background(), CreateMomentUploadIntentInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Filename:    ptrString("moment.mp4"),
		ContentType: ptrString("video/mp4"),
	})
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected app error, got %T %v", err, err)
	}
	if appErr.Status != http.StatusServiceUnavailable || appErr.Code != "moments_unavailable" {
		t.Fatalf("expected unavailable guard, got status=%d code=%s", appErr.Status, appErr.Code)
	}
	if strings.Contains(strings.ToLower(appErr.Message), "cloudflare") || strings.Contains(strings.ToLower(appErr.Message), "stream") {
		t.Fatalf("user-facing error should not mention provider internals: %q", appErr.Message)
	}
}

func TestCreateMomentUploadIntentRejectsDisabledMoments(t *testing.T) {
	svc := New(
		&fakeRepo{},
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithMomentsEnabled(false),
		WithStreamClient(&fakeStreamClient{}, false),
	)

	_, err := svc.CreateMomentUploadIntent(context.Background(), CreateMomentUploadIntentInput{
		ActorID:     "550e8400-e29b-41d4-a716-446655440000",
		Filename:    ptrString("moment.mp4"),
		ContentType: ptrString("video/mp4"),
	})
	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected app error, got %T %v", err, err)
	}
	if appErr.Status != http.StatusServiceUnavailable || appErr.Code != "moments_unavailable" {
		t.Fatalf("expected unavailable guard, got status=%d code=%s", appErr.Status, appErr.Code)
	}
}

func TestExpireStaleMomentUploadsMarksRowsFailedIdempotently(t *testing.T) {
	fixedNow := time.Date(2026, 5, 25, 10, 0, 0, 0, time.UTC)
	repo := &fakeRepo{expiredMomentRows: []int64{3, 0}}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)
	svc.nowFn = func() time.Time { return fixedNow }

	first, err := svc.ExpireStaleMomentUploads(context.Background())
	if err != nil {
		t.Fatalf("expire stale moments: %v", err)
	}
	second, err := svc.ExpireStaleMomentUploads(context.Background())
	if err != nil {
		t.Fatalf("expire stale moments second run: %v", err)
	}

	if first.FailedCount != 3 || second.FailedCount != 0 {
		t.Fatalf("expected idempotent cleanup counts 3 then 0, got %d then %d", first.FailedCount, second.FailedCount)
	}
	if repo.expiredMomentCalls != 2 || !repo.expiredMomentNow.Equal(fixedNow) {
		t.Fatalf("unexpected cleanup call state: calls=%d now=%s", repo.expiredMomentCalls, repo.expiredMomentNow)
	}
	if repo.expiredMomentFailedReason == "" {
		t.Fatal("expected failed reason to be persisted")
	}
}

func TestListProfileMomentsUsesDedicatedMomentPagination(t *testing.T) {
	created := time.Date(2026, 5, 25, 9, 0, 0, 0, time.UTC)
	repo := &fakeRepo{
		profileMedia: []mediarepo.ProfileMediaItem{
			testProfileMediaItem("11111111-1111-4111-8111-111111111111", "photo", created),
		},
		profileMoments: []mediarepo.ProfileMediaItem{
			testProfileMediaItem("22222222-2222-4222-8222-222222222222", "video", created),
			testProfileMediaItem("33333333-3333-4333-8333-333333333333", "video", created.Add(-time.Minute)),
		},
	}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.ListProfileMoments(context.Background(), ListProfileMediaInput{
		Username:     "maria",
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Limit:        1,
	})
	if err != nil {
		t.Fatalf("list profile moments: %v", err)
	}
	if len(result.Items) != 1 || result.Items[0].Type != "video" || result.NextCursor == "" {
		t.Fatalf("expected first dedicated video page with next cursor, got %+v", result)
	}
	if repo.lastProfileMediaInput.Username != "" {
		t.Fatalf("mixed profile media query should not be used, got %+v", repo.lastProfileMediaInput)
	}
	if repo.lastProfileMomentsInput.Username != "maria" || repo.lastProfileMomentsInput.Limit != 2 {
		t.Fatalf("unexpected dedicated moments query input: %+v", repo.lastProfileMomentsInput)
	}
}

func TestListDiveSiteMomentsReturnsReadyVisibleVideos(t *testing.T) {
	siteID := "55555555-5555-4555-8555-555555555555"
	repo := &fakeRepo{
		diveSiteMoments: []mediarepo.ProfileMediaItem{
			testProfileMediaItem("22222222-2222-4222-8222-222222222222", "video", time.Now().UTC()),
		},
	}
	svc := New(repo, nil, "bucket", "https://cdn.example.com", "secret-v1", 1)

	result, err := svc.ListDiveSiteMoments(context.Background(), ListDiveSiteMomentsInput{
		DiveSiteID:   siteID,
		ViewerUserID: "550e8400-e29b-41d4-a716-446655440000",
		Limit:        24,
	})
	if err != nil {
		t.Fatalf("list dive site moments: %v", err)
	}
	if len(result.Items) != 1 || result.Items[0].Type != "video" || result.Items[0].ProcessingStatus != "ready" {
		t.Fatalf("expected ready video moment, got %+v", result.Items)
	}
	if repo.lastDiveSiteMomentsInput.DiveSiteID != siteID || repo.lastDiveSiteMomentsInput.Limit != 25 {
		t.Fatalf("unexpected dive site moments query input: %+v", repo.lastDiveSiteMomentsInput)
	}
}

func TestMomentCompleteAndSyncRejectOtherUsersMoment(t *testing.T) {
	repo := &fakeRepo{momentLookupErr: pgx.ErrNoRows}
	stream := &fakeStreamClient{}
	svc := New(
		repo,
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithStreamClient(stream, false),
	)

	_, completeErr := svc.CompleteMomentUpload(context.Background(), CompleteMomentUploadInput{
		ActorID: "550e8400-e29b-41d4-a716-446655440000",
		PostID:  "22222222-2222-4222-8222-222222222222",
	})
	_, syncErr := svc.SyncMomentStreamStatus(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"22222222-2222-4222-8222-222222222222",
	)

	for _, err := range []error{completeErr, syncErr} {
		var appErr *apperrors.AppError
		if !errors.As(err, &appErr) || appErr.Status != http.StatusNotFound {
			t.Fatalf("expected not found app error, got %T %v", err, err)
		}
	}
	if repo.markMomentUploadedCalls != 0 || stream.getCalls != 0 {
		t.Fatalf("unauthorized moment should not be mutated or synced, uploadCalls=%d getCalls=%d", repo.markMomentUploadedCalls, stream.getCalls)
	}
}

func TestCompleteMomentUploadMarksReadyWhenStreamIsReady(t *testing.T) {
	stream := &fakeStreamClient{video: StreamVideo{
		UID:             "stream123",
		ReadyToStream:   true,
		StatusState:     "ready",
		DurationSeconds: 12.5,
		Width:           1080,
		Height:          1920,
		PlaybackHLS:     "https://videodelivery.net/stream123/manifest/video.m3u8",
		ThumbnailURL:    "https://videodelivery.net/stream123/thumbnails/thumbnail.jpg",
	}}
	activity := &fakeActivityPublisher{}
	svc := New(
		&fakeRepo{},
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithStreamClient(stream, false),
		WithActivityPublisher(activity),
	)

	result, err := svc.CompleteMomentUpload(context.Background(), CompleteMomentUploadInput{
		ActorID: "550e8400-e29b-41d4-a716-446655440000",
		PostID:  "22222222-2222-4222-8222-222222222222",
	})
	if err != nil {
		t.Fatalf("complete moment upload: %v", err)
	}
	if result.Status != "ready" || result.DurationMs == nil || *result.DurationMs != 12500 {
		t.Fatalf("expected ready moment status, got %+v", result)
	}
	if result.Playback == nil || result.Playback.HLSURL == nil || *result.Playback.HLSURL != "https://videodelivery.net/stream123/manifest/video.m3u8" {
		t.Fatalf("expected explicit HLS playback contract, got %+v", result.Playback)
	}
	if len(activity.items) != 1 || activity.items[0].Type != feedservice.ActivityMediaPostCreated {
		t.Fatalf("expected media activity publish, got %+v", activity.items)
	}
}

func TestCompleteMomentUploadIsIdempotentWhenAlreadyReady(t *testing.T) {
	streamUID := "stream123"
	playbackURL := "https://iframe.videodelivery.net/stream123"
	thumbnailURL := "https://videodelivery.net/stream123/thumbnails/thumbnail.jpg"
	durationMs := int32(12500)
	readyAt := time.Now().UTC()
	repo := &fakeRepo{momentItem: &mediarepo.MediaItem{
		ID:               "44444444-4444-4444-4444-444444444444",
		PostID:           "22222222-2222-4222-8222-222222222222",
		MediaObjectID:    "11111111-1111-1111-1111-111111111111",
		AuthorAppUserID:  "550e8400-e29b-41d4-a716-446655440000",
		Type:             "video",
		Status:           "active",
		Provider:         "cloudflare_stream",
		StreamUID:        &streamUID,
		ProcessingStatus: "ready",
		ModerationStatus: "approved",
		Width:            1080,
		Height:           1920,
		DurationMs:       &durationMs,
		PlaybackURL:      &playbackURL,
		ThumbnailURL:     &thumbnailURL,
		ReadyAt:          &readyAt,
		CreatedAt:        readyAt,
		UpdatedAt:        readyAt,
	}}
	stream := &fakeStreamClient{}
	svc := New(
		repo,
		nil,
		"bucket",
		"https://cdn.example.com",
		"secret-v1",
		1,
		WithStreamClient(stream, false),
	)

	result, err := svc.CompleteMomentUpload(context.Background(), CompleteMomentUploadInput{
		ActorID: "550e8400-e29b-41d4-a716-446655440000",
		PostID:  "22222222-2222-4222-8222-222222222222",
	})
	if err != nil {
		t.Fatalf("complete moment upload: %v", err)
	}
	if result.Status != "ready" || result.PlaybackURL != playbackURL {
		t.Fatalf("expected existing ready status, got %+v", result)
	}
	if repo.markMomentUploadedCalls != 0 {
		t.Fatalf("expected no upload state rewrite, got %d calls", repo.markMomentUploadedCalls)
	}
	if stream.getCalls != 0 {
		t.Fatalf("expected no stream sync for already ready moment, got %d calls", stream.getCalls)
	}
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func testJPEG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 92}); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	return buf.Bytes()
}

func appendFakeExif(jpegBytes []byte) []byte {
	if len(jpegBytes) < 2 || jpegBytes[0] != 0xff || jpegBytes[1] != 0xd8 {
		return jpegBytes
	}
	exif := []byte{
		0xff, 0xe1, // APP1 marker
		0x00, 0x12, // segment length
		'E', 'x', 'i', 'f', 0x00, 0x00,
		'F', 'A', 'K', 'E', '-', 'E', 'X', 'I', 'F',
	}
	out := make([]byte, 0, len(jpegBytes)+len(exif))
	out = append(out, jpegBytes[:2]...)
	out = append(out, exif...)
	out = append(out, jpegBytes[2:]...)
	return out
}

func testProfileMediaItem(id, itemType string, createdAt time.Time) mediarepo.ProfileMediaItem {
	streamUID := "stream123"
	playbackURL := "https://iframe.videodelivery.net/stream123"
	thumbnailURL := "https://videodelivery.net/stream123/thumbnails/thumbnail.jpg"
	status := "ready"
	if itemType == "photo" {
		streamUID = ""
		playbackURL = ""
		thumbnailURL = ""
		status = ""
	}
	return mediarepo.ProfileMediaItem{
		MediaItem: mediarepo.MediaItem{
			ID:               id,
			PostID:           "99999999-9999-4999-8999-999999999999",
			MediaObjectID:    "11111111-1111-4111-8111-111111111111",
			AuthorAppUserID:  "550e8400-e29b-41d4-a716-446655440000",
			UploadGroupID:    "33333333-3333-4333-8333-333333333333",
			Type:             itemType,
			StorageKey:       "media/profile/test.jpg",
			MimeType:         "image/jpeg",
			Width:            1080,
			Height:           1920,
			Status:           "active",
			Provider:         "cloudflare_stream",
			StreamUID:        &streamUID,
			PlaybackURL:      &playbackURL,
			ThumbnailURL:     &thumbnailURL,
			ProcessingStatus: status,
			ModerationStatus: "approved",
			CreatedAt:        createdAt,
			UpdatedAt:        createdAt,
		},
		LikeCount:    1,
		CommentCount: 0,
	}
}

func ptrString(value string) *string {
	return &value
}
