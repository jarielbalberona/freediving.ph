package ws

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"
)

const (
	sendBufferSize = 64
	writeTimeout   = 10 * time.Second
	pingInterval   = 25 * time.Second
)

type Client struct {
	logger       *slog.Logger
	hub          *Hub
	conn         *websocket.Conn
	send         chan []byte
	connectionID string
	userID       string
	localUserID  string
}

func NewClient(logger *slog.Logger, hub *Hub, conn *websocket.Conn, userID, localUserID string) *Client {
	return &Client{
		logger:       logger,
		hub:          hub,
		conn:         conn,
		send:         make(chan []byte, sendBufferSize),
		connectionID: uuid.NewString(),
		userID:       userID,
		localUserID:  localUserID,
	}
}

func (c *Client) Run(ctx context.Context) {
	c.logger.Info("ws connected", "connection_id", c.connectionID, "user_id", c.userID, "local_user_id", c.localUserID)
	c.hub.Register(c)
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close(websocket.StatusNormalClosure, "closing")
		c.logger.Info("ws disconnected", "connection_id", c.connectionID, "user_id", c.userID, "local_user_id", c.localUserID)
	}()

	go c.writeLoop(ctx)
	c.readLoop(ctx)
}

func (c *Client) readLoop(ctx context.Context) {
	for {
		var in Envelope
		readCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
		err := wsjson.Read(readCtx, c.conn, &in)
		cancel()
		if err != nil {
			return
		}
		c.hub.BroadcastEnvelope(Envelope{Type: "echo", RequestID: in.RequestID, Payload: in.Payload})
	}
}

func (c *Client) writeLoop(ctx context.Context) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			writeCtx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Write(writeCtx, websocket.MessageText, msg)
			cancel()
			if err != nil {
				return
			}
		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Ping(pingCtx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}
