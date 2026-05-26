package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send"

type ExpoPushSender struct {
	client      *http.Client
	accessToken string
	endpoint    string
}

func NewExpoPushSender(accessToken string, client *http.Client) *ExpoPushSender {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &ExpoPushSender{
		client:      client,
		accessToken: strings.TrimSpace(accessToken),
		endpoint:    expoPushEndpoint,
	}
}

func (s *ExpoPushSender) Send(ctx context.Context, message PushMessage) (PushSendResult, error) {
	if strings.TrimSpace(message.To) == "" {
		return PushSendResult{}, fmt.Errorf("push token is required")
	}
	body := map[string]any{
		"to":    strings.TrimSpace(message.To),
		"title": strings.TrimSpace(message.Title),
		"body":  strings.TrimSpace(message.Body),
		"data":  message.Data,
		"sound": "default",
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return PushSendResult{}, fmt.Errorf("marshal expo push request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(raw))
	if err != nil {
		return PushSendResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.accessToken)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return PushSendResult{}, err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return PushSendResult{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return PushSendResult{}, fmt.Errorf("expo push returned %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var parsed expoPushResponse
	if err := json.Unmarshal(responseBody, &parsed); err != nil {
		return PushSendResult{}, fmt.Errorf("decode expo push response: %w", err)
	}
	if len(parsed.Errors) > 0 {
		return PushSendResult{}, fmt.Errorf("expo push request error: %s", parsed.Errors[0].Message)
	}
	if parsed.Data.Status == "ok" {
		return PushSendResult{}, nil
	}
	if parsed.Data.Status == "error" {
		if strings.EqualFold(parsed.Data.Details["error"], "DeviceNotRegistered") {
			return PushSendResult{StaleToken: true}, nil
		}
		if parsed.Data.Message != "" {
			return PushSendResult{}, fmt.Errorf("expo push delivery error: %s", parsed.Data.Message)
		}
	}
	return PushSendResult{}, fmt.Errorf("expo push returned unexpected response")
}

type expoPushResponse struct {
	Data   expoPushTicket  `json:"data"`
	Errors []expoPushError `json:"errors"`
}

type expoPushTicket struct {
	Status  string            `json:"status"`
	ID      string            `json:"id"`
	Message string            `json:"message"`
	Details map[string]string `json:"details"`
}

type expoPushError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
