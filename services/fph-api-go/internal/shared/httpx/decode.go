package httpx

import (
	"encoding/json"
	"io"
	"net/http"

	apperrors "fph-api-go/internal/shared/errors"
)

func DecodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()

	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return apperrors.New(http.StatusBadRequest, "invalid_json", "invalid request body", err)
	}
	return nil
}
