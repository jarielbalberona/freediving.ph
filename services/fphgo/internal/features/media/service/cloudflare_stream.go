package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type streamClient interface {
	CreateDirectUpload(ctx context.Context, input StreamDirectUploadInput) (StreamDirectUploadResult, error)
	GetVideo(ctx context.Context, uid string) (StreamVideo, error)
}

type StreamDirectUploadInput struct {
	CreatorID          string
	MaxDurationSeconds int
	Expiry             time.Time
	RequireSignedURLs  bool
	Meta               map[string]string
}

type StreamDirectUploadResult struct {
	UID       string
	UploadURL string
}

type StreamVideo struct {
	UID              string
	ReadyToStream    bool
	StatusState      string
	ErrorReasonText  string
	DurationSeconds  float64
	Width            int
	Height           int
	PlaybackHLS      string
	ThumbnailURL     string
	PreviewURL       string
	RequireSignedURL bool
}

type CloudflareStreamClient struct {
	accountID  string
	apiToken   string
	httpClient *http.Client
	baseURL    string
}

func NewCloudflareStreamClient(accountID, apiToken string) *CloudflareStreamClient {
	return &CloudflareStreamClient{
		accountID:  strings.TrimSpace(accountID),
		apiToken:   strings.TrimSpace(apiToken),
		httpClient: http.DefaultClient,
		baseURL:    "https://api.cloudflare.com/client/v4",
	}
}

func (c *CloudflareStreamClient) CreateDirectUpload(ctx context.Context, input StreamDirectUploadInput) (StreamDirectUploadResult, error) {
	if strings.TrimSpace(c.accountID) == "" || strings.TrimSpace(c.apiToken) == "" {
		return StreamDirectUploadResult{}, fmt.Errorf("cloudflare stream is not configured")
	}
	body := map[string]any{
		"maxDurationSeconds":    input.MaxDurationSeconds,
		"expiry":                input.Expiry.UTC().Format(time.RFC3339),
		"creator":               strings.TrimSpace(input.CreatorID),
		"requireSignedURLs":     input.RequireSignedURLs,
		"thumbnailTimestampPct": 0.05,
	}
	if len(input.Meta) > 0 {
		body["meta"] = input.Meta
	}
	var response struct {
		Success bool `json:"success"`
		Result  struct {
			UID       string `json:"uid"`
			UploadURL string `json:"uploadURL"`
		} `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := c.doJSON(ctx, http.MethodPost, "/accounts/"+c.accountID+"/stream/direct_upload", body, &response); err != nil {
		return StreamDirectUploadResult{}, err
	}
	if !response.Success || strings.TrimSpace(response.Result.UID) == "" || strings.TrimSpace(response.Result.UploadURL) == "" {
		return StreamDirectUploadResult{}, fmt.Errorf("cloudflare direct upload failed: %s", firstCloudflareError(response.Errors))
	}
	return StreamDirectUploadResult{UID: response.Result.UID, UploadURL: response.Result.UploadURL}, nil
}

func (c *CloudflareStreamClient) GetVideo(ctx context.Context, uid string) (StreamVideo, error) {
	if strings.TrimSpace(c.accountID) == "" || strings.TrimSpace(c.apiToken) == "" {
		return StreamVideo{}, fmt.Errorf("cloudflare stream is not configured")
	}
	var response struct {
		Success bool `json:"success"`
		Result  struct {
			UID               string  `json:"uid"`
			ReadyToStream     bool    `json:"readyToStream"`
			Duration          float64 `json:"duration"`
			Thumbnail         string  `json:"thumbnail"`
			Preview           string  `json:"preview"`
			RequireSignedURLs bool    `json:"requireSignedURLs"`
			Input             struct {
				Width  int `json:"width"`
				Height int `json:"height"`
			} `json:"input"`
			Playback struct {
				HLS string `json:"hls"`
			} `json:"playback"`
			Status struct {
				State           string `json:"state"`
				ErrorReasonText string `json:"errorReasonText"`
			} `json:"status"`
		} `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := c.doJSON(ctx, http.MethodGet, "/accounts/"+c.accountID+"/stream/"+strings.TrimSpace(uid), nil, &response); err != nil {
		return StreamVideo{}, err
	}
	if !response.Success {
		return StreamVideo{}, fmt.Errorf("cloudflare video lookup failed: %s", firstCloudflareError(response.Errors))
	}
	return StreamVideo{
		UID:              response.Result.UID,
		ReadyToStream:    response.Result.ReadyToStream,
		StatusState:      response.Result.Status.State,
		ErrorReasonText:  response.Result.Status.ErrorReasonText,
		DurationSeconds:  response.Result.Duration,
		Width:            response.Result.Input.Width,
		Height:           response.Result.Input.Height,
		PlaybackHLS:      response.Result.Playback.HLS,
		ThumbnailURL:     response.Result.Thumbnail,
		PreviewURL:       response.Result.Preview,
		RequireSignedURL: response.Result.RequireSignedURLs,
	}, nil
}

func (c *CloudflareStreamClient) doJSON(ctx context.Context, method, path string, body any, out any) error {
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(c.baseURL, "/")+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("cloudflare stream returned status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func firstCloudflareError(errors []struct {
	Message string `json:"message"`
}) string {
	for _, item := range errors {
		if strings.TrimSpace(item.Message) != "" {
			return item.Message
		}
	}
	return "unknown error"
}
