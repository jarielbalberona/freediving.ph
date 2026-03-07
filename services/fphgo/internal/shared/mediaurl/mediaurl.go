package mediaurl

import (
	"net/url"
	"os"
	"path"
	"strings"
)

func DefaultBaseURL() string {
	return strings.TrimRight(strings.TrimSpace(os.Getenv("CDN_BASE_URL")), "/")
}

func NormalizeReference(value string) string {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		parsed, err := url.Parse(raw)
		if err != nil {
			return raw
		}
		return normalizeObjectKeyPath(parsed.Path)
	}
	return normalizeObjectKeyPath(raw)
}

func Materialize(value, baseURL string) string {
	key := NormalizeReference(value)
	if key == "" {
		return ""
	}
	trimmedBase := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if trimmedBase == "" {
		if strings.HasPrefix(strings.TrimSpace(value), "http://") || strings.HasPrefix(strings.TrimSpace(value), "https://") {
			return strings.TrimSpace(value)
		}
		return key
	}
	return trimmedBase + "/" + path.Clean("/" + key)[1:]
}

func MaterializeWithDefault(value string) string {
	return Materialize(value, DefaultBaseURL())
}

func normalizeObjectKeyPath(raw string) string {
	key := strings.TrimSpace(raw)
	key = strings.TrimPrefix(key, "/")
	key = strings.TrimPrefix(key, "i/")
	return strings.TrimPrefix(key, "/")
}
