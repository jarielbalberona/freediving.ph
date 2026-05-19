package mediasign

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	PresetCard   = "card"
	PresetDialog = "dialog"
)

type Signer struct {
	baseURL    string
	secret     string
	keyVersion int
	nowFn      func() time.Time
}

type Option func(*Signer)

func WithNow(nowFn func() time.Time) Option {
	return func(s *Signer) {
		if nowFn != nil {
			s.nowFn = nowFn
		}
	}
}

func New(baseURL, secret string, keyVersion int, opts ...Option) *Signer {
	if keyVersion <= 0 {
		keyVersion = 1
	}
	s := &Signer{
		baseURL:    strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		secret:     strings.TrimSpace(secret),
		keyVersion: keyVersion,
		nowFn: func() time.Time {
			return time.Now().UTC()
		},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

func (s *Signer) Configured() bool {
	return s != nil && s.baseURL != "" && s.secret != ""
}

func (s *Signer) URL(objectKey, preset string, ttl time.Duration) string {
	switch strings.TrimSpace(preset) {
	case PresetDialog:
		return s.URLWithTransform(objectKey, 1600, 82, "auto", ttl)
	default:
		return s.URLWithTransform(objectKey, 960, 78, "auto", ttl)
	}
}

func (s *Signer) URLWithTransform(objectKey string, width, quality int, format string, ttl time.Duration) string {
	if !s.Configured() {
		return ""
	}
	key := strings.TrimLeft(strings.TrimSpace(objectKey), "/")
	if key == "" || strings.Contains(key, "..") {
		return ""
	}
	if ttl <= 0 {
		ttl = time.Hour
	}
	requestPath := "/" + key
	query := make(url.Values)
	query.Set("exp", strconv.FormatInt(s.nowFn().Add(ttl).Unix(), 10))
	query.Set("k", strconv.Itoa(s.keyVersion))
	if width > 0 {
		query.Set("w", strconv.Itoa(width))
	}
	if quality > 0 {
		query.Set("q", strconv.Itoa(quality))
	}
	if strings.TrimSpace(format) != "" {
		query.Set("f", strings.TrimSpace(format))
	}

	canonical := canonicalString(requestPath, query)
	query.Set("sig", signCanonical(canonical, s.secret))
	return s.baseURL + requestPath + "?" + query.Encode()
}

func canonicalString(requestPath string, query url.Values) string {
	signedKeys := []string{"f", "q", "w", "exp", "k"}
	parts := make([]string, 0, len(signedKeys))
	for _, key := range signedKeys {
		value := strings.TrimSpace(query.Get(key))
		if value == "" {
			continue
		}
		parts = append(parts, key+"="+value)
	}
	return "GET\n" + requestPath + "\n" + strings.Join(parts, "&")
}

func signCanonical(canonical, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = io.Copy(h, bytes.NewBufferString(canonical))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}
