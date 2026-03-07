package service

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/url"
	"sort"
	"strings"
	"testing"
	"time"

	mediarepo "fphgo/internal/features/media/repo"
)

type fakeRepo struct {
	created   []mediarepo.CreateMediaObjectInput
	mediaByID map[string]mediarepo.MediaObject
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

func TestCanonicalStringStable(t *testing.T) {
	q := mapToValues(map[string]string{
		"exp": "1700000000",
		"k":   "1",
		"f":   "auto",
		"q":   "75",
		"w":   "640",
	})
	canonical := canonicalString("/i/feed/user_123/2026/02/1700000123456-ab12cd.jpg", q)
	want := "GET\n/i/feed/user_123/2026/02/1700000123456-ab12cd.jpg\nf=auto&q=75&w=640&exp=1700000000&k=1"
	if canonical != want {
		t.Fatalf("canonical mismatch\nwant: %s\ngot:  %s", want, canonical)
	}
	sig := signCanonical(canonical, "secret")
	if sig == "" {
		t.Fatal("expected signature")
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

func mapToValues(values map[string]string) url.Values {
	out := make(url.Values, len(values))
	for k, v := range values {
		out[k] = []string{v}
	}
	return out
}

func ptrString(value string) *string {
	return &value
}
