package httpx

import (
	"encoding/json"
	"io"
	"net/http"
)

// DecodeJSON reads the request body as JSON into dst.
// Returns raw json decode errors (not wrapped in AppError) so callers
// can inspect error types for structured validation responses.
func DecodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
