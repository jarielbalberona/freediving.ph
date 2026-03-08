package service

import "testing"

func TestPresentationForBuddySignalInNearbyMode(t *testing.T) {
	t.Parallel()

	got := presentationFor(ModeNearby, ItemTypeBuddySignal, []string{"nearby", "buddy_activity"})

	if got.TypeLabel != "Buddy call" {
		t.Fatalf("expected buddy label, got %q", got.TypeLabel)
	}
	if got.RankLabel != "Actionable now" {
		t.Fatalf("expected actionable rank label, got %q", got.RankLabel)
	}
	if got.Tone != "coordination" {
		t.Fatalf("expected coordination tone, got %q", got.Tone)
	}
}

func TestContextForMode(t *testing.T) {
	t.Parallel()

	got := contextForMode(ModeTraining, false)

	if got.Greeting == "" || got.Message == "" || got.SafetyBadge == "" {
		t.Fatalf("expected non-empty mode frame, got %#v", got)
	}
	if got.Greeting != "Training is the discipline lane" {
		t.Fatalf("unexpected training greeting %q", got.Greeting)
	}
}

func TestQuickActionsForMode(t *testing.T) {
	t.Parallel()

	got := quickActionsForMode(ModeSpotReports)
	if len(got) != 4 {
		t.Fatalf("expected 4 quick actions, got %d", len(got))
	}
	if got[0].Type != "report_conditions" {
		t.Fatalf("expected report_conditions first, got %q", got[0].Type)
	}
}
