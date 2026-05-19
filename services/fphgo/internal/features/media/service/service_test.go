package service

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"sort"
	"strings"
	"testing"
	"time"

	feedservice "fphgo/internal/features/feed/service"
	mediarepo "fphgo/internal/features/media/repo"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
)

type fakeRepo struct {
	created       []mediarepo.CreateMediaObjectInput
	mediaByID     map[string]mediarepo.MediaObject
	publishedPost *mediarepo.PublishMediaPostInput
	likeState     mediarepo.LikeState
	likedPostID   string
	unlikedPostID string
	likeUserID    string
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
		DiveSiteID:      input.DiveSiteID,
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

func (f *fakeRepo) ListProfileMediaByUsername(_ context.Context, _ mediarepo.ListProfileMediaInput) ([]mediarepo.ProfileMediaItem, error) {
	return nil, nil
}

func (f *fakeRepo) GetVisibleMediaPostLikeState(_ context.Context, postID, _ string) (mediarepo.LikeState, error) {
	if f.likeState.TargetID == "" {
		return mediarepo.LikeState{TargetID: postID}, nil
	}
	return f.likeState, nil
}

func (f *fakeRepo) LikeMediaPost(_ context.Context, postID, userID string) error {
	f.likedPostID = postID
	f.likeUserID = userID
	f.likeState = mediarepo.LikeState{TargetID: postID, LikeCount: 1, ViewerHasLiked: true}
	return nil
}

func (f *fakeRepo) UnlikeMediaPost(_ context.Context, postID, userID string) error {
	f.unlikedPostID = postID
	f.likeUserID = userID
	f.likeState = mediarepo.LikeState{TargetID: postID, LikeCount: 0, ViewerHasLiked: false}
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
		SizeBytes:   6 * 1024 * 1024,
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
	if result.TargetID != "22222222-2222-4222-8222-222222222222" || result.LikeCount != 1 || !result.ViewerHasLiked {
		t.Fatalf("unexpected like result: %+v", result)
	}
}

func TestUnlikeMediaPostUpdatesState(t *testing.T) {
	repo := &fakeRepo{likeState: mediarepo.LikeState{
		TargetID:       "22222222-2222-4222-8222-222222222222",
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
	if result.TargetID != "22222222-2222-4222-8222-222222222222" || result.LikeCount != 0 || result.ViewerHasLiked {
		t.Fatalf("unexpected unlike result: %+v", result)
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

func ptrString(value string) *string {
	return &value
}
