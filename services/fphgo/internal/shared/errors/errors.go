package errors

import "fmt"

type AppError struct {
	Code    string
	Message string
	Status  int
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
