package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExpoPushSenderSendsAuthorizedMessage(t *testing.T) {
	var received map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer expo-token" {
			t.Fatalf("expected authorization header, got %q", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"status":"ok","id":"ticket-1"}}`))
	}))
	defer server.Close()

	sender := NewExpoPushSender("expo-token", server.Client())
	sender.endpoint = server.URL

	result, err := sender.Send(context.Background(), PushMessage{
		To:    "ExponentPushToken[valid]",
		Title: "Title",
		Body:  "Body",
		Data:  map[string]any{"actionUrl": "/notifications"},
	})
	if err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	if result.StaleToken {
		t.Fatal("successful ticket should not be stale")
	}
	if received["to"] != "ExponentPushToken[valid]" {
		t.Fatalf("unexpected recipient: %#v", received["to"])
	}
}

func TestExpoPushSenderClassifiesDeviceNotRegisteredAsStaleToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"status":"error","message":"Device not registered","details":{"error":"DeviceNotRegistered"}}}`))
	}))
	defer server.Close()

	sender := NewExpoPushSender("", server.Client())
	sender.endpoint = server.URL

	result, err := sender.Send(context.Background(), PushMessage{
		To:    "ExponentPushToken[stale]",
		Title: "Title",
		Body:  "Body",
	})
	if err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	if !result.StaleToken {
		t.Fatal("expected DeviceNotRegistered to be classified as stale")
	}
}

func TestExpoPushSenderReturnsDeliveryError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"status":"error","message":"rate limited","details":{"error":"MessageRateExceeded"}}}`))
	}))
	defer server.Close()

	sender := NewExpoPushSender("", server.Client())
	sender.endpoint = server.URL

	_, err := sender.Send(context.Background(), PushMessage{
		To:    "ExponentPushToken[valid]",
		Title: "Title",
		Body:  "Body",
	})
	if err == nil {
		t.Fatal("expected non-stale Expo error to fail delivery")
	}
}
