package httpx

import (
	"strings"

	"github.com/google/uuid"

	"fphgo/internal/shared/validatex"
)

func ParseUUIDParam(value, field string) (string, []validatex.Issue, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", []validatex.Issue{{
			Path:    []any{field},
			Code:    "required",
			Message: "This field is required",
		}}, false
	}
	if _, err := uuid.Parse(trimmed); err != nil {
		return "", []validatex.Issue{{
			Path:    []any{field},
			Code:    "invalid_uuid",
			Message: "Must be a valid UUID",
		}}, false
	}
	return trimmed, nil, true
}
