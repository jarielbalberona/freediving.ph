package ws

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var channelPattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

type PostgresFanoutBus struct {
	logger  *slog.Logger
	pool    *pgxpool.Pool
	dsn     string
	channel string
}

func NewPostgresFanoutBus(logger *slog.Logger, pool *pgxpool.Pool, dsn, channel string) (*PostgresFanoutBus, error) {
	if pool == nil {
		return nil, fmt.Errorf("pool is required")
	}
	if !channelPattern.MatchString(channel) {
		return nil, fmt.Errorf("invalid channel name %q", channel)
	}
	return &PostgresFanoutBus{
		logger:  logger,
		pool:    pool,
		dsn:     dsn,
		channel: channel,
	}, nil
}

func (b *PostgresFanoutBus) Publish(ctx context.Context, payload []byte) error {
	_, err := b.pool.Exec(ctx, "select pg_notify($1, $2)", b.channel, string(payload))
	return err
}

func (b *PostgresFanoutBus) Subscribe(ctx context.Context, handler func([]byte)) error {
	conn, err := pgx.Connect(ctx, b.dsn)
	if err != nil {
		return fmt.Errorf("connect listen bus: %w", err)
	}
	defer conn.Close(context.Background())

	if _, err := conn.Exec(ctx, fmt.Sprintf("listen %s", b.channel)); err != nil {
		return fmt.Errorf("listen %s: %w", b.channel, err)
	}
	b.logger.Info("ws fanout listen active", "channel", b.channel)

	for {
		notification, waitErr := conn.WaitForNotification(ctx)
		if waitErr != nil {
			if ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("wait for notification: %w", waitErr)
		}
		if handler != nil {
			handler([]byte(notification.Payload))
		}
	}
}
