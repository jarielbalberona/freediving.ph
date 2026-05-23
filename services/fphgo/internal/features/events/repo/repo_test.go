package repo

import (
	"strings"
	"testing"
)

func TestEventListOrderByClauseShowsNewestEventsFirst(t *testing.T) {
	clause := eventListOrderByClause()

	if !strings.Contains(clause, "e.created_at DESC") {
		t.Fatalf("event list should default to newest events first, got %q", clause)
	}
	if strings.Contains(clause, "e.starts_at ASC") {
		t.Fatalf("event list should not default to upcoming start-time order, got %q", clause)
	}
}

func TestEventSelectColumnsCoalescesMissingViewerAccessRows(t *testing.T) {
	columns := eventSelectColumns()

	if !strings.Contains(columns, "coalesce(e.organizer_user_id = NULLIF($1, '')::uuid, false)") {
		t.Fatalf("viewer owner check must not scan NULL when viewer is anonymous, got %q", columns)
	}
	if !strings.Contains(columns, "coalesce((vp.id IS NOT NULL AND vp.status IN ('pending_approval', 'confirmed', 'attended')), false)") {
		t.Fatalf("viewer joined check must not scan NULL when participation row is missing, got %q", columns)
	}
	if !strings.Contains(columns, "coalesce((vei.id IS NOT NULL AND (vp.id IS NULL OR vp.status NOT IN ('pending_approval', 'confirmed', 'attended'))), false)") {
		t.Fatalf("viewer interest check must not scan NULL when participation row is missing, got %q", columns)
	}
	if !strings.Contains(columns, "coalesce(vp.role IN ('organizer', 'staff') AND vp.status IN ('confirmed', 'pending_approval'), false)") {
		t.Fatalf("viewer manage check must not scan NULL when participation row is missing, got %q", columns)
	}
	if !strings.Contains(columns, "coalesce(vp.role = 'participant' AND vp.status = 'confirmed', false)") {
		t.Fatalf("viewer private-detail check must not scan NULL when participation row is missing, got %q", columns)
	}
}
