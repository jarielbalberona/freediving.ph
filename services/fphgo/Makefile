.PHONY: dev dev-deps test sqlc migrate-up migrate-down lint psgc-import psgc-import-2025-2q

GOOSE := go run github.com/pressly/goose/v3/cmd/goose@v3.24.1

dev-deps:
	go install github.com/air-verse/air@latest

dev:
	air

test:
	go test ./...

sqlc:
	sqlc generate

migrate-up:
	$(GOOSE) -dir db/migrations postgres "$$DB_DSN" up

migrate-down:
	$(GOOSE) -dir db/migrations postgres "$$DB_DSN" down

lint:
	gofmt -w .
	go vet ./...

psgc-import:
	go run ./cmd/psgc-import -data-dir "$(DATA_DIR)" -source-version "$(SOURCE_VERSION)" -published-at "$(PUBLISHED_AT)"

psgc-import-2025-2q:
	go run ./cmd/psgc-import -data-dir "db/seeds/psgc/2025-2Q" -source-version "2025-2Q" -published-at "2025-06-30" -skip-if-current
