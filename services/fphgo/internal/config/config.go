package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env                               string
	LogLevel                          string
	DBDSN                             string
	DBMaxConns                        int32
	DBMinConns                        int32
	DBConnMaxLife                     time.Duration
	Port                              string
	APIBaseURL                        string
	CORSOrigins                       []string
	RateLimitPerMin                   int
	DevAuth                           bool
	ClerkSecretKey                    string
	ClerkJWTKey                       string
	ClerkJWTIssuer                    string
	ClerkJWTAudience                  []string
	GoogleMapsAPIKey                  string
	R2AccountID                       string
	R2AccessKeyID                     string
	R2SecretAccessKey                 string
	R2BucketName                      string
	R2Region                          string
	MediaCDNBaseURL                   string
	MediaSigningSecretV1              string
	MediaSigningKeyVersion            int
	CloudflareAccountID               string
	CloudflareStreamAPIToken          string
	CloudflareStreamRequireSignedURLs bool
	ChikaPseudonymSecret              string
	WSFanoutChannel                   string
}

func Load() (Config, error) {
	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		return Config{}, fmt.Errorf("DB_DSN is required")
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "4000"
	}

	originsRaw := firstNonEmptyEnv("CORS_ORIGINS", "CORS_ORIGIN")
	origins := []string{"*"}
	if originsRaw != "" {
		parts := strings.Split(originsRaw, ",")
		origins = make([]string, 0, len(parts))
		for _, part := range parts {
			origin := strings.TrimSpace(part)
			if origin != "" {
				origins = append(origins, origin)
			}
		}
		if len(origins) == 0 {
			origins = []string{"*"}
		}
	}

	env := firstNonEmptyEnv("APP_ENV", "NODE_ENV")
	if env == "" {
		env = "development"
	}
	if !strings.EqualFold(env, "production") {
		origins = expandDevelopmentLoopbackOrigins(origins)
	}
	logLevel := strings.TrimSpace(strings.ToLower(os.Getenv("LOG_LEVEL")))

	switch logLevel {
	case "", "debug", "info", "warn", "error":
	default:
		return Config{}, fmt.Errorf("LOG_LEVEL must be one of: debug, info, warn, error")
	}

	devAuth := parseBoolEnv(os.Getenv("DEV_AUTH"))
	rateLimitPerMin, err := parsePositiveIntEnv("RATE_LIMIT_PER_MINUTE", 300)
	if err != nil {
		return Config{}, err
	}
	dbMaxConns, err := parsePositiveIntEnv("DB_MAX_CONNS", 20)
	if err != nil {
		return Config{}, err
	}
	dbMinConns, err := parsePositiveIntEnv("DB_MIN_CONNS", 2)
	if err != nil {
		return Config{}, err
	}
	dbConnMaxLife, err := parseDurationEnv("DB_CONN_MAX_LIFETIME", 30*time.Minute)
	if err != nil {
		return Config{}, err
	}
	apiBaseURL := firstNonEmptyEnv("API_BASE_URL", "API_URL")
	clerkSecretKey := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	clerkJWTKey := strings.TrimSpace(os.Getenv("CLERK_JWT_KEY"))
	clerkJWTIssuer := strings.TrimSpace(os.Getenv("CLERK_JWT_ISSUER"))
	clerkJWTAudience := splitCSV(os.Getenv("CLERK_JWT_AUDIENCE"))
	googleMapsAPIKey := strings.TrimSpace(os.Getenv("GOOGLE_MAPS_API_KEY"))
	r2AccountID := strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID"))
	r2AccessKeyID := strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID"))
	r2SecretAccessKey := strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY"))
	r2BucketName := strings.TrimSpace(os.Getenv("R2_BUCKET_NAME"))
	r2Region := strings.TrimSpace(os.Getenv("R2_REGION"))
	mediaCDNBaseURL := strings.TrimSpace(os.Getenv("CDN_BASE_URL"))
	mediaSigningSecretV1 := strings.TrimSpace(os.Getenv("MEDIA_SIGNING_SECRET_V1"))
	mediaSigningKeyVersion, err := parsePositiveIntEnv("MEDIA_SIGNING_KEY_VERSION", 1)
	if err != nil {
		return Config{}, err
	}
	cloudflareAccountID := strings.TrimSpace(os.Getenv("CLOUDFLARE_ACCOUNT_ID"))
	cloudflareStreamAPIToken := strings.TrimSpace(os.Getenv("CLOUDFLARE_STREAM_API_TOKEN"))
	cloudflareStreamRequireSignedURLs := parseBoolEnv(os.Getenv("CLOUDFLARE_STREAM_REQUIRE_SIGNED_URLS"))
	if cloudflareStreamRequireSignedURLs {
		// Moments currently persist public Stream iframe URLs. Do not enable signed
		// Stream playback until the media service mints per-viewer playback tokens.
		return Config{}, fmt.Errorf("CLOUDFLARE_STREAM_REQUIRE_SIGNED_URLS cannot be enabled until signed Moment playback is implemented")
	}
	chikaPseudonymSecret := strings.TrimSpace(os.Getenv("CHIKA_PSEUDONYM_SECRET"))
	wsFanoutChannel := strings.TrimSpace(os.Getenv("WS_FANOUT_CHANNEL"))

	if strings.EqualFold(env, "production") {
		if clerkSecretKey == "" {
			return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required in production")
		}
		if devAuth {
			return Config{}, fmt.Errorf("DEV_AUTH cannot be enabled in production")
		}
		if containsWildcardOrigin(origins) {
			return Config{}, fmt.Errorf("CORS_ORIGINS cannot include '*' in production")
		}
		if chikaPseudonymSecret == "" {
			return Config{}, fmt.Errorf("CHIKA_PSEUDONYM_SECRET is required in production")
		}
		if r2AccountID == "" {
			return Config{}, fmt.Errorf("R2_ACCOUNT_ID is required in production")
		}
		if r2AccessKeyID == "" {
			return Config{}, fmt.Errorf("R2_ACCESS_KEY_ID is required in production")
		}
		if r2SecretAccessKey == "" {
			return Config{}, fmt.Errorf("R2_SECRET_ACCESS_KEY is required in production")
		}
		if r2BucketName == "" {
			return Config{}, fmt.Errorf("R2_BUCKET_NAME is required in production")
		}
		if mediaCDNBaseURL == "" {
			return Config{}, fmt.Errorf("CDN_BASE_URL is required in production")
		}
		if mediaSigningSecretV1 == "" {
			return Config{}, fmt.Errorf("MEDIA_SIGNING_SECRET_V1 is required in production")
		}
		if cloudflareAccountID == "" {
			return Config{}, fmt.Errorf("CLOUDFLARE_ACCOUNT_ID is required in production")
		}
		if cloudflareStreamAPIToken == "" {
			return Config{}, fmt.Errorf("CLOUDFLARE_STREAM_API_TOKEN is required in production")
		}
	}
	if clerkSecretKey == "" && !devAuth {
		return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required unless DEV_AUTH=true")
	}
	if dbMinConns > dbMaxConns {
		return Config{}, fmt.Errorf("DB_MIN_CONNS cannot be greater than DB_MAX_CONNS")
	}

	return Config{
		Env:                               env,
		LogLevel:                          logLevel,
		DBDSN:                             dsn,
		DBMaxConns:                        int32(dbMaxConns),
		DBMinConns:                        int32(dbMinConns),
		DBConnMaxLife:                     dbConnMaxLife,
		Port:                              port,
		APIBaseURL:                        apiBaseURL,
		CORSOrigins:                       origins,
		RateLimitPerMin:                   rateLimitPerMin,
		DevAuth:                           devAuth,
		ClerkSecretKey:                    clerkSecretKey,
		ClerkJWTKey:                       clerkJWTKey,
		ClerkJWTIssuer:                    clerkJWTIssuer,
		ClerkJWTAudience:                  clerkJWTAudience,
		GoogleMapsAPIKey:                  googleMapsAPIKey,
		R2AccountID:                       r2AccountID,
		R2AccessKeyID:                     r2AccessKeyID,
		R2SecretAccessKey:                 r2SecretAccessKey,
		R2BucketName:                      r2BucketName,
		R2Region:                          r2Region,
		MediaCDNBaseURL:                   mediaCDNBaseURL,
		MediaSigningSecretV1:              mediaSigningSecretV1,
		MediaSigningKeyVersion:            mediaSigningKeyVersion,
		CloudflareAccountID:               cloudflareAccountID,
		CloudflareStreamAPIToken:          cloudflareStreamAPIToken,
		CloudflareStreamRequireSignedURLs: cloudflareStreamRequireSignedURLs,
		ChikaPseudonymSecret:              chikaPseudonymSecret,
		WSFanoutChannel:                   wsFanoutChannel,
	}, nil
}

func parseBoolEnv(raw string) bool {
	value := strings.TrimSpace(strings.ToLower(raw))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func firstNonEmptyEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func splitCSV(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	parts := strings.Split(trimmed, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func containsWildcardOrigin(origins []string) bool {
	for _, origin := range origins {
		if strings.TrimSpace(origin) == "*" {
			return true
		}
	}
	return false
}

func expandDevelopmentLoopbackOrigins(origins []string) []string {
	seen := make(map[string]struct{}, len(origins))
	expanded := make([]string, 0, len(origins)+4)
	add := func(origin string) {
		if _, ok := seen[origin]; ok {
			return
		}
		seen[origin] = struct{}{}
		expanded = append(expanded, origin)
	}

	for _, origin := range origins {
		add(origin)
		if strings.TrimSpace(origin) == "*" {
			continue
		}

		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			continue
		}
		host := parsed.Hostname()
		if host != "localhost" && host != "127.0.0.1" && host != "::1" {
			continue
		}

		for _, loopbackHost := range []string{"localhost", "127.0.0.1", "[::1]"} {
			next := *parsed
			next.Host = loopbackHost
			if port := parsed.Port(); port != "" {
				next.Host += ":" + port
			}
			add(next.String())
		}
	}

	return expanded
}

func parsePositiveIntEnv(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", key)
	}
	return value, nil
}

func parseDurationEnv(key string, fallback time.Duration) (time.Duration, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}

	value, err := time.ParseDuration(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration (e.g. 30m)", key)
	}
	return value, nil
}
