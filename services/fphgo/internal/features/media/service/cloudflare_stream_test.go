package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCloudflareStreamCreateDirectUploadRequestAndResponse(t *testing.T) {
	expiresAt := time.Date(2026, 5, 25, 12, 0, 0, 0, time.UTC)
	var authorization string
	var requestBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/accounts/account123/stream/direct_upload" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		authorization = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"result":{"uid":"stream123","uploadURL":"https://upload.videodelivery.net/direct"}}`))
	}))
	defer server.Close()

	client := NewCloudflareStreamClient("account123", "secret-token")
	client.baseURL = server.URL
	client.httpClient = server.Client()

	result, err := client.CreateDirectUpload(context.Background(), StreamDirectUploadInput{
		CreatorID:          "550e8400-e29b-41d4-a716-446655440000",
		MaxDurationSeconds: 30,
		Expiry:             expiresAt,
		RequireSignedURLs:  false,
		Meta: map[string]string{
			"feature":  "moments",
			"filename": "moment.mp4",
		},
	})
	if err != nil {
		t.Fatalf("create direct upload: %v", err)
	}
	if result.UID != "stream123" || result.UploadURL != "https://upload.videodelivery.net/direct" {
		t.Fatalf("unexpected direct upload result: %+v", result)
	}
	if authorization != "Bearer secret-token" {
		t.Fatalf("expected bearer token server-side, got %q", authorization)
	}
	if requestBody["maxDurationSeconds"] != float64(30) {
		t.Fatalf("expected maxDurationSeconds 30, got %#v", requestBody["maxDurationSeconds"])
	}
	if requestBody["expiry"] != expiresAt.Format(time.RFC3339) {
		t.Fatalf("expected expiry %s, got %#v", expiresAt.Format(time.RFC3339), requestBody["expiry"])
	}
	if requestBody["creator"] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("expected creator in request, got %#v", requestBody["creator"])
	}
	if requestBody["requireSignedURLs"] != false {
		t.Fatalf("expected requireSignedURLs=false, got %#v", requestBody["requireSignedURLs"])
	}
	meta, ok := requestBody["meta"].(map[string]any)
	if !ok || meta["feature"] != "moments" || meta["filename"] != "moment.mp4" {
		t.Fatalf("expected Moment metadata, got %#v", requestBody["meta"])
	}
}

func TestCloudflareStreamGetVideoParsesReadyProcessingAndFailed(t *testing.T) {
	tests := []struct {
		name      string
		response  string
		wantReady bool
		wantState string
		wantErr   bool
	}{
		{
			name:      "ready",
			response:  `{"success":true,"result":{"uid":"stream123","readyToStream":true,"duration":12.5,"thumbnail":"https://videodelivery.net/stream123/thumbnails/thumbnail.jpg","preview":"https://videodelivery.net/stream123/watch","requireSignedURLs":false,"input":{"width":1080,"height":1920},"playback":{"hls":"https://videodelivery.net/stream123/manifest/video.m3u8"},"status":{"state":"ready"}}}`,
			wantReady: true,
			wantState: "ready",
		},
		{
			name:      "processing",
			response:  `{"success":true,"result":{"uid":"stream123","readyToStream":false,"status":{"state":"inprogress"}}}`,
			wantState: "inprogress",
		},
		{
			name:      "failed",
			response:  `{"success":true,"result":{"uid":"stream123","readyToStream":false,"status":{"state":"error","errorReasonText":"encoding failed"}}}`,
			wantState: "error",
		},
		{
			name:     "malformed",
			response: `{`,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet || r.URL.Path != "/accounts/account123/stream/stream123" {
					t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(tt.response))
			}))
			defer server.Close()

			client := NewCloudflareStreamClient("account123", "secret-token")
			client.baseURL = server.URL
			client.httpClient = server.Client()

			video, err := client.GetVideo(context.Background(), "stream123")
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected malformed response error")
				}
				return
			}
			if err != nil {
				t.Fatalf("get video: %v", err)
			}
			if video.ReadyToStream != tt.wantReady || video.StatusState != tt.wantState {
				t.Fatalf("unexpected video state: %+v", video)
			}
			if strings.Contains(video.PlaybackHLS, "secret-token") {
				t.Fatalf("playback response should not contain API token: %q", video.PlaybackHLS)
			}
		})
	}
}
