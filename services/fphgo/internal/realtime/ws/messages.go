package ws

type Envelope struct {
	Version   int    `json:"v"`
	Type      string `json:"type"`
	TS        string `json:"ts"`
	EventID   string `json:"eventId,omitempty"`
	RequestID string `json:"requestId,omitempty"`
	Payload   any    `json:"payload,omitempty"`
}
