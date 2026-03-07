package service

import "testing"

func TestValidateCreateInputRejectsInvalidValues(t *testing.T) {
	issues := validateCreateInput(CreateInput{
		UserID:   "not-a-uuid",
		Type:     "INVALID",
		Title:    "",
		Message:  "",
		Priority: "BAD",
	})
	if len(issues) < 5 {
		t.Fatalf("expected multiple validation issues, got %d", len(issues))
	}
}

func TestValidateListInputRejectsOutOfRangePaging(t *testing.T) {
	issues := validateListInput(ListInput{
		Limit:    0,
		Offset:   -1,
		Status:   ptr("NOPE"),
		Type:     ptr("NOPE"),
		Priority: ptr("NOPE"),
	})
	if len(issues) != 5 {
		t.Fatalf("expected 5 issues, got %d", len(issues))
	}
}

func TestValidateSettingsInputRejectsDigestFrequency(t *testing.T) {
	issues := validateSettingsInput(UpdateSettingsInput{
		DigestFrequency: ptr("YEARLY"),
	})
	if len(issues) != 1 {
		t.Fatalf("expected 1 issue, got %d", len(issues))
	}
}

func ptr[T any](v T) *T { return &v }
