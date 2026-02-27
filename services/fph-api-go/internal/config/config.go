package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Env            string
	DBDSN          string
	Port           string
	CORSOrigins    []string
	DevAuth        bool
	ClerkSecretKey string
	ClerkJWTKey    string
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
	clerkSecretKey := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	clerkJWTKey := strings.TrimSpace(os.Getenv("CLERK_JWT_KEY"))

	if strings.EqualFold(env, "production") && clerkSecretKey == "" {
		return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required in production")
	}
	if clerkSecretKey == "" && !devAuth {
		return Config{}, fmt.Errorf("CLERK_SECRET_KEY is required unless DEV_AUTH=true")
	}

	return Config{
		Env:            env,
		DBDSN:          dsn,
		Port:           port,
		CORSOrigins:    origins,
		DevAuth:        devAuth,
		ClerkSecretKey: clerkSecretKey,
		ClerkJWTKey:    clerkJWTKey,
	}, nil
}

func parseBoolEnv(raw string) bool {
	value := strings.TrimSpace(strings.ToLower(raw))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}
