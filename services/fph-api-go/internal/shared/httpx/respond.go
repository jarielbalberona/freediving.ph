package httpx

import (
	"encoding/json"
	"net/http"

	apperrors "fph-api-go/internal/shared/errors"
)

type errorPayload struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"requestId,omitempty"`
	} `json:"error"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Error(w http.ResponseWriter, requestID string, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "Internal server error"

	if appErr, ok := err.(*apperrors.AppError); ok {
		status = appErr.Status
		code = appErr.Code
		message = appErr.Message
	}

	payload := errorPayload{}
	payload.Error.Code = code
	payload.Error.Message = message
	payload.Error.RequestID = requestID
	JSON(w, status, payload)
}
