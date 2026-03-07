package errors

import "fmt"

type AppError struct {
	Code    string
	Message string
	Status  int
	Details map[string]any
	Err     error
}

func (e *AppError) Error() string {
	if e.Err == nil {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}
	return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
}

func (e *AppError) Unwrap() error { return e.Err }

func New(status int, code, message string, err error) *AppError {
	return &AppError{Status: status, Code: code, Message: message, Err: err}
}

func NewWithDetails(status int, code, message string, details map[string]any, err error) *AppError {
	return &AppError{Status: status, Code: code, Message: message, Details: details, Err: err}
}

func NewRateLimited(message string, windowSeconds, retryAfterSeconds int) *AppError {
	if windowSeconds < 1 {
		windowSeconds = 1
	}
	if retryAfterSeconds < 1 {
		retryAfterSeconds = 1
	}
	return NewWithDetails(
		429,
		"rate_limited",
		message,
		map[string]any{
			"window_seconds":      windowSeconds,
			"retry_after_seconds": retryAfterSeconds,
		},
		nil,
	)
}
