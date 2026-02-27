package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
)

type Hub struct {
	logger     *slog.Logger
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	clients    map[*Client]struct{}
	mu         sync.RWMutex
}

func NewHub(logger *slog.Logger) *Hub {
	return &Hub{
		logger:     logger,
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
		clients:    map[*Client]struct{}{},
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					h.mu.RUnlock()
					h.unregister <- c
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Register(c *Client) {
	h.register <- c
}

func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

func (h *Hub) BroadcastEnvelope(env Envelope) {
	data, err := json.Marshal(env)
	if err != nil {
		h.logger.Error("ws marshal failed", "error", err)
		return
	}
	select {
	case h.broadcast <- data:
	default:
		h.logger.Warn("ws broadcast queue full; dropping message")
	}
}
