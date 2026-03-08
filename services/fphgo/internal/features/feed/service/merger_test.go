package service

import "testing"

func TestModePriorityOrder(t *testing.T) {
	t.Parallel()

	tests := []struct {
		mode Mode
		want ItemType
	}{
		{mode: ModeFollowing, want: ItemTypePost},
		{mode: ModeNearby, want: ItemTypeBuddySignal},
		{mode: ModeTraining, want: ItemTypePost},
		{mode: ModeSpotReports, want: ItemTypePost},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(string(tt.mode), func(t *testing.T) {
			t.Parallel()
			got := modePriorityOrder(tt.mode)
			if len(got) == 0 {
				t.Fatalf("expected non-empty priority order for %s", tt.mode)
			}
			if got[0] != tt.want {
				t.Fatalf("expected first type %s, got %s", tt.want, got[0])
			}
		})
	}
}

func TestTargetMixBiasesCoordinationInNearbyMode(t *testing.T) {
	t.Parallel()

	mix := targetMix(10, ModeNearby)
	if mix[ItemTypeBuddySignal] <= mix[ItemTypeCommunityHot] {
		t.Fatalf("expected buddy signals to outrank community threads in nearby mode: %#v", mix)
	}
	if mix[ItemTypeBuddySignal] <= mix[ItemTypeEvent] {
		t.Fatalf("expected buddy signals to outrank events in nearby mode: %#v", mix)
	}
}
