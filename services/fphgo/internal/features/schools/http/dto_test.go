package http

import (
	"net/http/httptest"
	"strings"
	"testing"

	schoolsrepo "fphgo/internal/features/schools/repo"
	"fphgo/internal/shared/httpx"
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

func TestPaymentMethodRequestAcceptsLegacyQRImageURL(t *testing.T) {
	r := httptest.NewRequest(
		"POST",
		"/",
		strings.NewReader(`{"type":"manual_qr","qrMediaId":"36f12a48-ff51-4cd5-92aa-6b679181f3ec","qrImageUrl":"payment-methods/school/qr.png","isActive":true}`),
	)
	req, issues, ok := httpx.DecodeAndValidate[PaymentMethodRequest](r, noopValidator{})
	if !ok {
		t.Fatalf("expected qrImageUrl to be accepted, got issues: %+v", issues)
	}
	if req.QRImageURL != "payment-methods/school/qr.png" {
		t.Fatalf("expected qrImageUrl to decode, got %q", req.QRImageURL)
	}
}

type noopValidator struct{}

func (noopValidator) Struct(any) error { return nil }
