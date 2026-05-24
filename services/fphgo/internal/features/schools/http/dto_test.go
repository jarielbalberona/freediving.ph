package http

import (
	"testing"

	schoolsrepo "fphgo/internal/features/schools/repo"
)

func TestPublicSchoolDTOHidesManageOnlyFields(t *testing.T) {
	dto := mapPublicSchool(schoolsrepo.School{
		ID:           "school-1",
		Slug:         "school",
		Name:         "School",
		ContactEmail: "owner@example.com",
		ContactPhone: "+639000000000",
		OwnerUserID:  "owner-1",
		Status:       "published",
	})
	if _, ok := dto["ownerUserId"]; ok {
		t.Fatal("public school dto exposed ownerUserId")
	}
	if _, ok := dto["contactEmail"]; ok {
		t.Fatal("public school dto exposed contactEmail")
	}
	if _, ok := dto["contactPhone"]; ok {
		t.Fatal("public school dto exposed contactPhone")
	}
	if _, ok := dto["status"]; ok {
		t.Fatal("public school dto exposed internal status")
	}
}

func TestMyBookingDTOHidesAdminOnlyFields(t *testing.T) {
	dto := mapMyBooking(schoolsrepo.Booking{
		ID:         "booking-1",
		AdminNotes: "private admin note",
		Payment: &schoolsrepo.BookingPayment{
			ID:          "payment-1",
			ReviewedBy:  "admin-1",
			ReviewNotes: "private review note",
			Status:      "verified",
		},
	})
	if _, ok := dto["adminNotes"]; ok {
		t.Fatal("student booking dto exposed adminNotes")
	}
	payment, ok := dto["payment"].(map[string]any)
	if !ok {
		t.Fatal("expected student payment dto")
	}
	if _, ok := payment["reviewedBy"]; ok {
		t.Fatal("student payment dto exposed reviewedBy")
	}
	if _, ok := payment["reviewNotes"]; ok {
		t.Fatal("student payment dto exposed reviewNotes")
	}
}
