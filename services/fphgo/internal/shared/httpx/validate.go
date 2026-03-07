package httpx

import (
	"net/http"

	"fphgo/internal/shared/validatex"
)

// Validator abstracts struct validation (satisfied by *validator.Validate).
type Validator interface {
	Struct(any) error
}

// DecodeAndValidate decodes JSON from r into T, then validates. Returns the
// decoded value, any validation issues, and whether decoding+validation succeeded.
// On failure the caller should respond with WriteValidationError(w, issues).
func DecodeAndValidate[T any](r *http.Request, v Validator) (T, []validatex.Issue, bool) {
	var dst T
	if err := DecodeJSON(r, &dst); err != nil {
		if ve, ok := validatex.FromJSONDecodeError(err); ok {
			return dst, ve.Issues, false
		}
		return dst, []validatex.Issue{{
			Path:    []any{},
			Code:    "invalid_json",
			Message: err.Error(),
		}}, false
	}

	if err := v.Struct(dst); err != nil {
		if ve, ok := validatex.FromValidator(err); ok {
			return dst, ve.Issues, false
		}
		return dst, []validatex.Issue{{
			Path:    []any{},
			Code:    "validation_failed",
			Message: err.Error(),
		}}, false
	}

	return dst, nil, true
}
