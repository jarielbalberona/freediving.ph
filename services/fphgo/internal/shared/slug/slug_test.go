package slug

import "testing"

func TestMakeNormalizesAndProtectsUnsafeSlugs(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		fallback string
		want     string
	}{
		{
			name:     "normalizes accents and punctuation",
			value:    "Mabini Línea Training 🇵🇭!",
			fallback: "event",
			want:     "mabini-linea-training",
		},
		{
			name:     "uses fallback for emoji only",
			value:    "🤿🌊",
			fallback: "chika",
			want:     "chika",
		},
		{
			name:     "protects reserved words",
			value:    "create",
			fallback: "group",
			want:     "create-group",
		},
		{
			name:     "protects uuid looking values",
			value:    "550e8400-e29b-41d4-a716-446655440000",
			fallback: "event",
			want:     "550e8400-e29b-41d4-a716-446655440000-event",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Make(tt.value, tt.fallback); got != tt.want {
				t.Fatalf("Make(%q, %q) = %q, want %q", tt.value, tt.fallback, got, tt.want)
			}
		})
	}
}

func TestFirstMeaningfulWords(t *testing.T) {
	got := FirstMeaningfulWords("This is the community plan for Apo Reef.", 3)
	if got != "community-plan-apo" {
		t.Fatalf("FirstMeaningfulWords() = %q, want community-plan-apo", got)
	}
}
