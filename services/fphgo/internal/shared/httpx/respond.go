package httpx

import (
	"encoding/json"
	"net/http"
	"strings"

	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/validatex"
)

type errorPayload struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
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

	if appErr, ok := err.(*apperrors.AppError); ok {
		status = appErr.Status
		code = appErr.Code
		message = appErr.Message
	}

	code = normalizeErrorCode(status, code)

	payload := errorPayload{
		Error: errorDetail{
			Code:      code,
			Message:   message,
			RequestID: requestID,
		},
	}
	JSON(w, status, payload)
}

func normalizeErrorCode(status int, code string) string {
	switch status {
	case http.StatusUnauthorized:
		return "unauthenticated"
	case http.StatusForbidden:
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
