package pagination

import (
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	DefaultLimit int32 = 20
	MaxLimit     int32 = 100
)

func ParseLimit(raw string, defaultLimit, maxLimit int32) (int32, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return defaultLimit, nil
	}
	parsed, err := strconv.ParseInt(trimmed, 10, 32)
	if err != nil || parsed <= 0 {
		return 0, errors.New("limit must be a positive integer")
	}
	if int32(parsed) > maxLimit {
		return maxLimit, nil
	}
	return int32(parsed), nil
}

func Encode(createdAt time.Time, tieID string) string {
	payload := fmt.Sprintf("%d|%s", createdAt.UTC().UnixNano(), tieID)
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func Decode(cursor string) (time.Time, string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(cursor))
	if err != nil {
		return time.Time{}, "", err
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 2 {
		return time.Time{}, "", errors.New("invalid cursor format")
	}
	nanos, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return time.Time{}, "", err
	}
	if strings.TrimSpace(parts[1]) == "" {
		return time.Time{}, "", errors.New("invalid cursor tie id")
	}
	return time.Unix(0, nanos).UTC(), parts[1], nil
}

func DecodeUUID(cursor string) (time.Time, string, error) {
	createdAt, id, err := Decode(cursor)
	if err != nil {
		return time.Time{}, "", err
	}
	if _, err := uuid.Parse(id); err != nil {
		return time.Time{}, "", err
	}
	return createdAt, id, nil
}

func DecodeInt64(cursor string) (time.Time, int64, error) {
	createdAt, id, err := Decode(cursor)
	if err != nil {
		return time.Time{}, 0, err
	}
	parsed, err := strconv.ParseInt(id, 10, 64)
	if err != nil || parsed <= 0 {
		return time.Time{}, 0, errors.New("invalid int64 cursor id")
	}
	return createdAt, parsed, nil
}

func DefaultUUIDCursor() (time.Time, string) {
	return time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC), "ffffffff-ffff-ffff-ffff-ffffffffffff"
}

func DefaultInt64Cursor() (time.Time, int64) {
	return time.Date(9999, 12, 31, 23, 59, 59, 0, time.UTC), math.MaxInt64
}
