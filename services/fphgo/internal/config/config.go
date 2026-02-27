package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Env              string
	DBDSN            string
	Port             string
	APIBaseURL       string
	CORSOrigins      []string
	DevAuth          bool
	ClerkSecretKey   string
	ClerkJWTKey      string
	ClerkJWTIssuer   string
	ClerkJWTAudience []string
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

	originsRaw := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
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

	env := strings.TrimSpace(os.Getenv("APP_ENV"))
	if env == "" {
		env = "development"
	}

	devAuth := parseBoolEnv(os.Getenv("DEV_AUTH"))
	apiBaseURL := strings.TrimSpace(os.Getenv("API_BASE_URL"))
	clerkSecretKey := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	clerkJWTKey := strings.TrimSpace(os.Getenv("CLERK_JWT_KEY"))
	clerkJWTIssuer := strings.TrimSpace(os.Getenv("CLERK_JWT_ISSUER"))
	clerkJWTAudience := splitCSV(os.Getenv("CLERK_JWT_AUDIENCE"))

	if strings.EqualFold(env, "production") && clerkSecretKey == "" {
		return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required in production")
	}
	if clerkSecretKey == "" && !devAuth {
		return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required unless DEV_AUTH=true")
	}

	return Config{
		Env:              env,
		DBDSN:            dsn,
		Port:             port,
		APIBaseURL:       apiBaseURL,
		CORSOrigins:      origins,
		DevAuth:          devAuth,
		ClerkSecretKey:   clerkSecretKey,
		ClerkJWTKey:      clerkJWTKey,
		ClerkJWTIssuer:   clerkJWTIssuer,
		ClerkJWTAudience: clerkJWTAudience,
	}, nil
}

func parseBoolEnv(raw string) bool {
	value := strings.TrimSpace(strings.ToLower(raw))
	return value == "1" || value == "true" || value == "yes" || value == "on"
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
