package config

import "testing"

func TestLoadRejectsProductionDevAuth(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("DEV_AUTH", "true")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")
	t.Setenv("CHIKA_PSEUDONYM_SECRET", "secret")

	_, err := Load()
	if err == nil || err.Error() != "DEV_AUTH cannot be enabled in production" {
		t.Fatalf("expected production DEV_AUTH guard error, got %v", err)
	}
}

func TestLoadRejectsProductionWildcardCors(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("CORS_ORIGINS", "*")
	t.Setenv("CHIKA_PSEUDONYM_SECRET", "secret")

	_, err := Load()
	if err == nil || err.Error() != "CORS_ORIGINS cannot include '*' in production" {
		t.Fatalf("expected production CORS wildcard guard error, got %v", err)
	}
}

func TestLoadReadsTuningEnv(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "development")
	t.Setenv("DEV_AUTH", "true")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")
	t.Setenv("RATE_LIMIT_PER_MINUTE", "500")
	t.Setenv("DB_MAX_CONNS", "25")
	t.Setenv("DB_MIN_CONNS", "5")
	t.Setenv("DB_CONN_MAX_LIFETIME", "45m")
	t.Setenv("LOG_LEVEL", "warn")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load, got %v", err)
	}

	if cfg.RateLimitPerMin != 500 {
		t.Fatalf("expected rate limit 500, got %d", cfg.RateLimitPerMin)
	}
	if cfg.DBMaxConns != 25 {
		t.Fatalf("expected DBMaxConns 25, got %d", cfg.DBMaxConns)
	}
	if cfg.DBMinConns != 5 {
		t.Fatalf("expected DBMinConns 5, got %d", cfg.DBMinConns)
	}
	if cfg.DBConnMaxLife.String() != "45m0s" {
		t.Fatalf("expected DBConnMaxLife 45m0s, got %s", cfg.DBConnMaxLife)
	}
	if cfg.LogLevel != "warn" {
		t.Fatalf("expected log level warn, got %s", cfg.LogLevel)
	}
}

func TestLoadReadsRenderCompatEnv(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("NODE_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("CORS_ORIGIN", "https://app.example.com")
	t.Setenv("API_URL", "https://api.example.com")
	t.Setenv("CHIKA_PSEUDONYM_SECRET", "secret")
	t.Setenv("R2_ACCOUNT_ID", "account")
	t.Setenv("R2_ACCESS_KEY_ID", "access")
	t.Setenv("R2_SECRET_ACCESS_KEY", "secret-key")
	t.Setenv("R2_BUCKET_NAME", "bucket")
	t.Setenv("CDN_BASE_URL", "https://cdn.example.com")
	t.Setenv("MEDIA_SIGNING_SECRET_V1", "signing-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load from Render-compatible env vars, got %v", err)
	}

	if cfg.Env != "production" {
		t.Fatalf("expected env production, got %s", cfg.Env)
	}
	if len(cfg.CORSOrigins) != 1 || cfg.CORSOrigins[0] != "https://app.example.com" {
		t.Fatalf("expected CORS origin fallback to load, got %#v", cfg.CORSOrigins)
	}
	if cfg.APIBaseURL != "https://api.example.com" {
		t.Fatalf("expected API base URL fallback to load, got %s", cfg.APIBaseURL)
	}
}

func TestLoadRejectsMissingChikaPseudonymSecretInProduction(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")

	_, err := Load()
	if err == nil || err.Error() != "CHIKA_PSEUDONYM_SECRET is required in production" {
		t.Fatalf("expected missing CHIKA_PSEUDONYM_SECRET error, got %v", err)
	}
}

func TestLoadRejectsMissingMediaConfigInProduction(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")
	t.Setenv("CHIKA_PSEUDONYM_SECRET", "secret")

	_, err := Load()
	if err == nil || err.Error() != "R2_ACCOUNT_ID is required in production" {
		t.Fatalf("expected missing R2_ACCOUNT_ID error, got %v", err)
	}
}

func TestLoadAcceptsProductionMediaConfig(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")
	t.Setenv("CHIKA_PSEUDONYM_SECRET", "secret")
	t.Setenv("R2_ACCOUNT_ID", "account")
	t.Setenv("R2_ACCESS_KEY_ID", "access")
	t.Setenv("R2_SECRET_ACCESS_KEY", "secret-key")
	t.Setenv("R2_BUCKET_NAME", "bucket")
	t.Setenv("CDN_BASE_URL", "https://cdn.example.com")
	t.Setenv("MEDIA_SIGNING_SECRET_V1", "signing-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected production media config to load, got %v", err)
	}
	if cfg.R2BucketName != "bucket" {
		t.Fatalf("expected bucket to load, got %s", cfg.R2BucketName)
	}
	if cfg.MediaCDNBaseURL != "https://cdn.example.com" {
		t.Fatalf("expected CDN base URL to load, got %s", cfg.MediaCDNBaseURL)
	}
}
