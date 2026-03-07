package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Hub struct {
	logger     *slog.Logger
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	clients    map[*Client]struct{}
	byUserID   map[string]map[*Client]struct{}
	mu         sync.RWMutex
	instanceID string
	bus        fanoutBus
}

type fanoutBus interface {
	Publish(ctx context.Context, payload []byte) error
	Subscribe(ctx context.Context, handler func([]byte)) error
}

type HubOption func(*Hub)

func WithFanoutBus(bus fanoutBus) HubOption {
	return func(h *Hub) {
		h.bus = bus
	}
}

func NewHub(logger *slog.Logger, opts ...HubOption) *Hub {
	hub := &Hub{
		logger:     logger,
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 256),
		clients:    map[*Client]struct{}{},
		byUserID:   map[string]map[*Client]struct{}{},
		instanceID: uuid.NewString(),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(hub)
		}
	}
	return hub
}

type fanoutMessage struct {
	Source  string          `json:"source"`
	UserIDs []string        `json:"userIds,omitempty"`
	Data    json.RawMessage `json:"data"`
}

func (h *Hub) Run(ctx context.Context) {
	if h.bus != nil {
		go func() {
			if err := h.bus.Subscribe(ctx, h.handleFanoutMessage); err != nil && ctx.Err() == nil {
				h.logger.Error("ws fanout subscribe failed", "error", err)
			}
		}()
	}

	for {
		select {
		case <-ctx.Done():
			return
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			if c.localUserID != "" {
				if _, ok := h.byUserID[c.localUserID]; !ok {
					h.byUserID[c.localUserID] = map[*Client]struct{}{}
				}
				h.byUserID[c.localUserID][c] = struct{}{}
			}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				if c.localUserID != "" {
					if userClients, ok := h.byUserID[c.localUserID]; ok {
						delete(userClients, c)
						if len(userClients) == 0 {
							delete(h.byUserID, c.localUserID)
						}
					}
				}
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
	data, ok := h.marshalEnvelope(env)
	if !ok {
		return
	}
	h.enqueueGlobal(data)
	h.publishFanout(data, nil)
}

func (h *Hub) BroadcastEnvelopeToUsers(userIDs []string, env Envelope) {
	if len(userIDs) == 0 {
		return
	}
	data, ok := h.marshalEnvelope(env)
	if !ok {
		return
	}
	h.sendToUsers(userIDs, data)
	h.publishFanout(data, userIDs)
}

func (h *Hub) marshalEnvelope(env Envelope) ([]byte, bool) {
	if env.Version == 0 {
		env.Version = 1
	}
	if env.TS == "" {
		env.TS = time.Now().UTC().Format(time.RFC3339)
	}
	data, err := json.Marshal(env)
	if err != nil {
		h.logger.Error("ws marshal failed", "error", err)
		return nil, false
	}
	return data, true
}

func (h *Hub) enqueueGlobal(data []byte) {
	select {
	case h.broadcast <- data:
	default:
		h.logger.Warn("ws broadcast queue full; dropping message")
	}
}

func (h *Hub) sendToUsers(userIDs []string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, userID := range userIDs {
		clients, ok := h.byUserID[userID]
		if !ok {
			continue
		}
		for client := range clients {
			select {
			case client.send <- data:
			default:
			}
		}
	}
}

func (h *Hub) publishFanout(data []byte, userIDs []string) {
	if h.bus == nil {
		return
	}
	message := fanoutMessage{
		Source:  h.instanceID,
		UserIDs: userIDs,
		Data:    data,
	}
	payload, err := json.Marshal(message)
	if err != nil {
		h.logger.Error("ws fanout marshal failed", "error", err)
		return
	}
	if err := h.bus.Publish(context.Background(), payload); err != nil {
		h.logger.Error("ws fanout publish failed", "error", err)
	}
}

func (h *Hub) handleFanoutMessage(payload []byte) {
	var message fanoutMessage
	if err := json.Unmarshal(payload, &message); err != nil {
		h.logger.Error("ws fanout unmarshal failed", "error", err)
		return
	}
	if message.Source == h.instanceID {
		return
	}
	if len(message.Data) == 0 {
		return
	}
	if len(message.UserIDs) == 0 {
		h.enqueueGlobal(message.Data)
		return
	}
	h.sendToUsers(message.UserIDs, message.Data)
}
