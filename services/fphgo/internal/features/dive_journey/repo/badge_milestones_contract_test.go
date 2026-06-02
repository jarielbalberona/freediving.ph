package repo

import (
	"os"
	"strings"
	"testing"
)

func TestSyntheticBadgeMilestonesUseEarnedDateForOccurredAtAndOrdering(t *testing.T) {
	raw, err := os.ReadFile("repo.go")
	if err != nil {
		t.Fatalf("read repo.go: %v", err)
	}
	source := string(raw)
	if !strings.Contains(source, "COALESCE(ub.earned_date::timestamp, ub.earned_at, ub.created_at)") {
		t.Fatal("synthetic badge milestones must use earned_date first, with legacy earned_at/created_at fallback")
	}
	if !strings.Contains(source, "ORDER BY COALESCE(ub.earned_date::timestamp, ub.earned_at, ub.created_at) DESC, ub.id DESC") {
		t.Fatal("synthetic badge milestones must order by earned_date before legacy timestamp fallbacks")
	}
}
