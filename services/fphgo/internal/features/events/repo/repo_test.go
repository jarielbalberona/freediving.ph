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

func TestEventPassQueriesUseScopedRandomTokenLookup(t *testing.T) {
	const passLookup = `
		SELECT ep.event_id::text, ep.user_id::text
		FROM event_participations ep
		JOIN events e ON e.id = ep.event_id
		WHERE e.slug = $1
			AND ep.qr_token = $2
			AND ep.qr_revoked_at IS NULL
	`
	if !strings.Contains(passLookup, "e.slug = $1") {
		t.Fatalf("pass lookup must scope token to event slug")
	}
	if !strings.Contains(passLookup, "ep.qr_token = $2") {
		t.Fatalf("pass lookup must use qr_token, not raw ids")
	}
	if !strings.Contains(passLookup, "ep.qr_revoked_at IS NULL") {
		t.Fatalf("pass lookup must reject revoked tokens")
	}
}
