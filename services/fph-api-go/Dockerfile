FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/fph-api-go ./cmd/api

FROM alpine:3.21
RUN adduser -D app
USER app

COPY --from=build /out/fph-api-go /usr/local/bin/fph-api-go

EXPOSE 4000
CMD ["fph-api-go"]
