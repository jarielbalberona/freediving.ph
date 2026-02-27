package validatex

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type Issue struct {
	Path    []any  `json:"path"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ValidationError struct {
	Issues []Issue
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation error: %d issue(s)", len(e.Issues))
}

// FromValidator converts a go-playground/validator error into a ValidationError.
func FromValidator(err error) (ValidationError, bool) {
	var ve validator.ValidationErrors
	if !errors.As(err, &ve) {
		return ValidationError{}, false
	}
	issues := make([]Issue, 0, len(ve))
	for _, fe := range ve {
		issues = append(issues, mapTagToIssue(fe))
	}
	return ValidationError{Issues: issues}, true
}

// FromJSONDecodeError converts json decode errors (unknown field, type mismatch)
// into a ValidationError. Returns false for syntax errors or EOF.
func FromJSONDecodeError(err error) (ValidationError, bool) {
	if err == nil {
		return ValidationError{}, false
	}

	var unmarshalErr *json.UnmarshalTypeError
	if errors.As(err, &unmarshalErr) {
		path := make([]any, 0)
		if unmarshalErr.Field != "" {
			for _, p := range strings.Split(unmarshalErr.Field, ".") {
				path = append(path, p)
			}
		}
		return ValidationError{
			Issues: []Issue{{
				Path:    path,
				Code:    "invalid_type",
				Message: fmt.Sprintf("Expected %s", unmarshalErr.Type.String()),
			}},
		}, true
	}

	msg := err.Error()
	if strings.HasPrefix(msg, "json: unknown field ") {
		field := strings.TrimPrefix(msg, "json: unknown field ")
		field = strings.Trim(field, "\"")
		return ValidationError{
			Issues: []Issue{{
				Path:    []any{field},
				Code:    "unrecognized_key",
				Message: fmt.Sprintf("Unknown field: %s", field),
			}},
		}, true
	}

	return ValidationError{}, false
}

// namespaceToPath converts a validator namespace like "Struct.profile.items[0].name"
// into a path slice like ["profile", "items", "0", "name"].
func namespaceToPath(ns string) []any {
	dot := strings.IndexByte(ns, '.')
	if dot < 0 {
		return []any{}
	}
	rest := ns[dot+1:]

	var path []any
	for _, seg := range strings.Split(rest, ".") {
		bracket := strings.IndexByte(seg, '[')
		if bracket >= 0 {
			path = append(path, seg[:bracket])
			idxPart := seg[bracket:]
			for len(idxPart) > 0 && idxPart[0] == '[' {
				end := strings.IndexByte(idxPart, ']')
				if end < 0 {
					break
				}
				path = append(path, idxPart[1:end])
				idxPart = idxPart[end+1:]
			}
		} else {
			path = append(path, seg)
		}
	}
	return path
}

func mapTagToIssue(fe validator.FieldError) Issue {
	code, message := tagToCodeAndMessage(fe.Tag(), fe.Param())
	return Issue{
		Path:    namespaceToPath(fe.Namespace()),
		Code:    code,
		Message: message,
	}
}

func tagToCodeAndMessage(tag, param string) (string, string) {
	switch tag {
	case "required":
		return "required", "This field is required"
	case "email":
		return "invalid_email", "Must be a valid email address"
	case "uuid":
		return "invalid_uuid", "Must be a valid UUID"
	case "min":
		return "too_small", fmt.Sprintf("Must be at least %s", param)
	case "max":
		return "too_big", fmt.Sprintf("Must be at most %s", param)
	case "oneof":
		return "invalid_enum", fmt.Sprintf("Must be one of: %s", param)
	case "url":
		return "invalid_url", "Must be a valid URL"
	case "datetime":
		return "invalid_datetime", "Must be a valid datetime"
	default:
		return "custom", fmt.Sprintf("Failed validation: %s", tag)
	}
}
