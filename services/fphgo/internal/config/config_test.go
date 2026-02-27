package config

import "testing"

func TestLoadRejectsProductionDevAuth(t *testing.T) {
	t.Setenv("DB_DSN", "postgres://example")
	t.Setenv("APP_ENV", "production")
	t.Setenv("CLERK_SECRET_KEY", "sk_test")
	t.Setenv("DEV_AUTH", "true")
	t.Setenv("CORS_ORIGINS", "https://app.example.com")

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
