FROM golang:1.26-alpine AS build
WORKDIR /src
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildTime=${BUILD_TIME}" -o /out/fphgo ./cmd/api

FROM alpine:3.21
RUN adduser -D app
USER app

COPY --from=build /out/fphgo /usr/local/bin/fphgo

ENV PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 CMD wget -q -O- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
CMD ["fphgo"]
