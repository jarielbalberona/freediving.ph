package slug

import (
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const DefaultMaxLength = 80

var uuidPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

var reserved = map[string]struct{}{
	"admin":    {},
	"api":      {},
	"create":   {},
	"edit":     {},
	"new":      {},
	"settings": {},
}

var fillerWords = map[string]struct{}{
	"a":    {},
	"an":   {},
	"and":  {},
	"are":  {},
	"as":   {},
	"at":   {},
	"be":   {},
	"by":   {},
	"for":  {},
	"from": {},
	"in":   {},
	"is":   {},
	"it":   {},
	"of":   {},
	"on":   {},
	"or":   {},
	"that": {},
	"the":  {},
	"this": {},
	"to":   {},
	"with": {},
}

func Make(value, fallback string) string {
	return MakeWithMax(value, fallback, DefaultMaxLength)
}

func MakeWithMax(value, fallback string, maxLength int) string {
	if maxLength <= 0 {
		maxLength = DefaultMaxLength
	}
	safeFallback := sanitize(fallback, maxLength)
	if safeFallback == "" {
		safeFallback = "item"
	}
	candidate := sanitize(value, maxLength)
	if candidate == "" {
		candidate = safeFallback
	}
	if IsReserved(candidate) || IsUUIDLike(candidate) {
		candidate = Append(candidate, safeFallback, maxLength)
	}
	if candidate == "" {
		return safeFallback
	}
	return candidate
}

func Append(base, suffix string, maxLength int) string {
	if maxLength <= 0 {
		maxLength = DefaultMaxLength
	}
	cleanBase := sanitize(base, maxLength)
	cleanSuffix := sanitize(suffix, maxLength)
	if cleanBase == "" {
		return cleanSuffix
	}
	if cleanSuffix == "" {
		return cleanBase
	}
	maxBaseLength := maxLength - len(cleanSuffix) - 1
	if maxBaseLength < 1 {
		maxBaseLength = 1
	}
	if len(cleanBase) > maxBaseLength {
		cleanBase = strings.Trim(cleanBase[:maxBaseLength], "-")
	}
	if cleanBase == "" {
		return cleanSuffix
	}
	return cleanBase + "-" + cleanSuffix
}

func IsReserved(value string) bool {
	_, ok := reserved[strings.ToLower(strings.TrimSpace(value))]
	return ok
}

func IsUUIDLike(value string) bool {
	return uuidPattern.MatchString(strings.TrimSpace(value))
}

func FirstMeaningfulWords(value string, limit int) string {
	if limit <= 0 {
		return ""
	}
	normalized := sanitize(value, 240)
	if normalized == "" {
		return ""
	}
	parts := strings.Split(normalized, "-")
	words := make([]string, 0, limit)
	for _, part := range parts {
		if part == "" {
			continue
		}
		if _, skip := fillerWords[part]; skip {
			continue
		}
		words = append(words, part)
		if len(words) >= limit {
			break
		}
	}
	return strings.Join(words, "-")
}

func sanitize(value string, maxLength int) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}

	normalized := norm.NFD.String(value)
	var builder strings.Builder
	lastHyphen := false
	for _, r := range normalized {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			lastHyphen = false
			continue
		}
		if !lastHyphen {
			builder.WriteByte('-')
			lastHyphen = true
		}
	}

	slug := strings.Trim(builder.String(), "-")
	if maxLength > 0 && len(slug) > maxLength {
		slug = strings.Trim(slug[:maxLength], "-")
	}
	return slug
}
