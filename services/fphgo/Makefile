.PHONY: dev dev-deps test sqlc migrate-up migrate-down lint

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
