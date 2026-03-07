package service

import "testing"

func TestCoarseLocation(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty", input: "", want: ""},
		{name: "already coarse", input: "Cebu", want: "Cebu"},
		{name: "trimmed coarse", input: "  Batangas  ", want: "Batangas"},
		{name: "detailed city country", input: "Makati, Metro Manila, Philippines", want: "Makati"},
		{name: "detailed with spaces", input: "  Dauin , Negros Oriental ", want: "Dauin"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := coarseLocation(tt.input); got != tt.want {
				t.Fatalf("coarseLocation(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
