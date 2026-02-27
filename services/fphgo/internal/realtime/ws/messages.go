package ws

type Envelope struct {
	Type      string `json:"type"`
	RequestID string `json:"requestId,omitempty"`
	Payload   any    `json:"payload,omitempty"`
}
