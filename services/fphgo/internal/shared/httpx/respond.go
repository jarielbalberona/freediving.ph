package httpx

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type errorPayload struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	RequestID string         `json:"requestId,omitempty"`
	Details   map[string]any `json:"details,omitempty"`
}

type validationErrorPayload struct {
	Error validationErrorDetail `json:"error"`
}

type validationErrorDetail struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Issues  []validatex.Issue `json:"issues"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes an error response, extracting status/code/message from AppError.
func Error(w http.ResponseWriter, requestID string, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "Internal server error"
	payload := errorPayload{}

	if appErr, ok := err.(*apperrors.AppError); ok {
		status = appErr.Status
		code = appErr.Code
		message = appErr.Message
		if len(appErr.Details) > 0 {
			payload.Error.Details = appErr.Details
		}
	}

	code = normalizeErrorCode(status, code)
	if status == http.StatusTooManyRequests && code == "rate_limited" {
		if retryAfter := retryAfterFromDetails(payload.Error.Details); retryAfter > 0 {
			w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
		}
	}

	payload.Error.Code = code
	payload.Error.Message = message
	payload.Error.RequestID = requestID
	JSON(w, status, payload)
}

func normalizeErrorCode(status int, code string) string {
	switch status {
	case http.StatusUnauthorized:
		return "unauthenticated"
	case http.StatusForbidden:
		if strings.EqualFold(strings.TrimSpace(code), "blocked") {
			return "blocked"
		}
		return "forbidden"
	case http.StatusNotFound:
		return "not_found"
	}
	if strings.TrimSpace(code) == "" {
		return "internal_error"
	}
	return strings.ToLower(code)
}

// WriteError writes a simple error response with explicit status, code, and message.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	payload := errorPayload{
		Error: errorDetail{
			Code:    code,
			Message: message,
		},
	}
	JSON(w, status, payload)
}

// WriteValidationError writes a 400 response with the standard validation error shape.
func WriteValidationError(w http.ResponseWriter, issues []validatex.Issue) {
	payload := validationErrorPayload{
		Error: validationErrorDetail{
			Code:    "validation_error",
			Message: "Invalid request",
			Issues:  issues,
		},
	}
	JSON(w, http.StatusBadRequest, payload)
}

func retryAfterFromDetails(details map[string]any) int {
	if len(details) == 0 {
		return 0
	}
	value, ok := details["retry_after_seconds"]
	if !ok {
		return 0
	}
	switch v := value.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}
