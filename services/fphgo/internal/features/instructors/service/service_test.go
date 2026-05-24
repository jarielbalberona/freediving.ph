package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	instructorsrepo "fphgo/internal/features/instructors/repo"
)

type fakeRepo struct {
	profile instructorsrepo.Profile
	certs   []instructorsrepo.Certification
}

func (f *fakeRepo) GetByUserID(context.Context, string) (instructorsrepo.Profile, error) {
	if f.profile.ID == "" {
		return instructorsrepo.Profile{}, pgx.ErrNoRows
	}
	return f.profile, nil
}
func (f *fakeRepo) GetByID(context.Context, string) (instructorsrepo.Profile, error) {
	if f.profile.ID == "" {
		return instructorsrepo.Profile{}, pgx.ErrNoRows
	}
	return f.profile, nil
}
func (f *fakeRepo) GetPublicByUsername(context.Context, string) (instructorsrepo.Profile, error) {
	if f.profile.VerificationStatus != "verified" {
		return instructorsrepo.Profile{}, pgx.ErrNoRows
	}
	return f.profile, nil
}
func (f *fakeRepo) UpsertProfile(_ context.Context, userID string, input instructorsrepo.ProfileInput) (instructorsrepo.Profile, error) {
	f.profile = instructorsrepo.Profile{
		ID:                 "profile-1",
		UserID:             userID,
		Username:           "buddy",
		UserDisplayName:    "Buddy",
		DisplayName:        input.DisplayName,
		Bio:                input.Bio,
		TeachingSince:      input.TeachingSince,
		HomeLocationLabel:  input.HomeLocationLabel,
		FormattedAddress:   input.FormattedAddress,
		RegionCode:         input.RegionCode,
		RegionName:         input.RegionName,
		ProvinceCode:       input.ProvinceCode,
		ProvinceName:       input.ProvinceName,
		CityCode:           input.CityCode,
		CityName:           input.CityName,
		BarangayCode:       input.BarangayCode,
		BarangayName:       input.BarangayName,
		LocationSource:     input.LocationSource,
		Specialties:        input.Specialties,
		SchoolAffiliation:  input.SchoolAffiliation,
		WebsiteURL:         input.WebsiteURL,
		SocialLinks:        input.SocialLinks,
		SafetyCredentials:  input.SafetyCredentials,
		VerificationStatus: "draft",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
	return f.profile, nil
}
func (f *fakeRepo) SubmitProfile(context.Context, string) (instructorsrepo.Profile, error) {
	f.profile.VerificationStatus = "pending"
	now := time.Now()
	f.profile.AttestationAcceptedAt = &now
	return f.profile, nil
}
func (f *fakeRepo) ListCertifications(context.Context, string) ([]instructorsrepo.Certification, error) {
	return f.certs, nil
}
func (f *fakeRepo) CreateCertification(_ context.Context, profileID string, input instructorsrepo.CertificationInput) (instructorsrepo.Certification, error) {
	item := instructorsrepo.Certification{ID: "cert-1", InstructorProfileID: profileID, Agency: input.Agency, AgencyOtherName: input.AgencyOtherName, CertificationLevel: input.CertificationLevel, ProofMediaID: input.ProofMediaID, OfficialVerificationURL: input.OfficialVerificationURL, VerificationStatus: "pending", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	f.certs = append(f.certs, item)
	return item, nil
}
func (f *fakeRepo) UpdateCertification(_ context.Context, _ string, certificationID string, input instructorsrepo.CertificationInput) (instructorsrepo.Certification, error) {
	if certificationID != "cert-1" {
		return instructorsrepo.Certification{}, pgx.ErrNoRows
	}
	f.certs[0].Agency = input.Agency
	f.certs[0].CertificationLevel = input.CertificationLevel
	f.certs[0].ProofMediaID = input.ProofMediaID
	f.certs[0].OfficialVerificationURL = input.OfficialVerificationURL
	return f.certs[0], nil
}
func (f *fakeRepo) DeleteCertification(context.Context, string, string) error { return nil }
func (f *fakeRepo) CountCertifications(context.Context, string) (int, error) {
	return len(f.certs), nil
}
func (f *fakeRepo) ListProfiles(context.Context, instructorsrepo.ListInput) ([]instructorsrepo.Profile, int, error) {
	return []instructorsrepo.Profile{f.profile}, 1, nil
}
func (f *fakeRepo) VerifyProfile(context.Context, string, string) (instructorsrepo.Profile, error) {
	f.profile.VerificationStatus = "verified"
	now := time.Now()
	f.profile.VerifiedAt = &now
	for idx := range f.certs {
		f.certs[idx].VerificationStatus = "verified"
	}
	return f.profile, nil
}
func (f *fakeRepo) RejectProfile(_ context.Context, _, _, reason string) (instructorsrepo.Profile, error) {
	f.profile.VerificationStatus = "rejected"
	f.profile.RejectionReason = reason
	return f.profile, nil
}
func (f *fakeRepo) SuspendProfile(_ context.Context, _, _, reason string) (instructorsrepo.Profile, error) {
	f.profile.VerificationStatus = "suspended"
	f.profile.RejectionReason = reason
	return f.profile, nil
}
func (f *fakeRepo) GetCertificationProof(context.Context, string) (instructorsrepo.CertificationProof, error) {
	return instructorsrepo.CertificationProof{}, pgx.ErrNoRows
}

func TestInstructorCanCreateAndSubmitOwnProfile(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo)
	input := structuredProfileInput()
	input.DisplayName = " Instructor "
	input.Bio = " Bio "
	_, err := svc.SaveProfile(context.Background(), "user-1", input)
	if err != nil {
		t.Fatalf("save profile failed: %v", err)
	}
	if repo.profile.DisplayName != "Instructor" {
		t.Fatalf("expected normalized display name, got %q", repo.profile.DisplayName)
	}
	_, err = svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:                  "padi",
		CertificationLevel:      "Freediver Instructor",
		OfficialVerificationURL: "https://verify.example.com/member/123",
	})
	if err != nil {
		t.Fatalf("create certification failed: %v", err)
	}
	app, err := svc.SubmitProfile(context.Background(), "user-1", SubmitInput{AttestationAccepted: true})
	if err != nil {
		t.Fatalf("submit profile failed: %v", err)
	}
	if app.Profile == nil || app.Profile.VerificationStatus != "pending" {
		t.Fatalf("expected pending application, got %#v", app.Profile)
	}
}

func TestSubmitRequiresCertification(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo)
	input := structuredProfileInput()
	input.Bio = "Bio"
	_, _ = svc.SaveProfile(context.Background(), "user-1", input)
	_, err := svc.SubmitProfile(context.Background(), "user-1", SubmitInput{AttestationAccepted: true})
	var validationErr ValidationFailure
	if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != "certifications" {
		t.Fatalf("expected certification validation error, got %v", err)
	}
}

func TestSubmitRequiresProfileBasicsAndAttestation(t *testing.T) {
	tests := []struct {
		name   string
		input  ProfileInput
		submit SubmitInput
		want   string
	}{
		{name: "bio", input: structuredProfileInputWithoutBio(), submit: SubmitInput{AttestationAccepted: true}, want: "bio"},
		{name: "home", input: ProfileInput{Bio: "Bio"}, submit: SubmitInput{AttestationAccepted: true}, want: "homeLocationLabel"},
		{name: "structured location", input: ProfileInput{Bio: "Bio", HomeLocationLabel: "Cebu"}, submit: SubmitInput{AttestationAccepted: true}, want: "homeLocation"},
		{name: "attestation", input: structuredProfileInput(), submit: SubmitInput{}, want: "attestationAccepted"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{}
			svc := New(repo)
			_, _ = svc.SaveProfile(context.Background(), "user-1", tt.input)
			repo.certs = []instructorsrepo.Certification{{ID: "cert-1", OfficialVerificationURL: "https://verify.example.com/member/123"}}
			_, err := svc.SubmitProfile(context.Background(), "user-1", tt.submit)
			var validationErr ValidationFailure
			if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != tt.want {
				t.Fatalf("expected %s validation error, got %v", tt.want, err)
			}
		})
	}
}

func TestCertificationAcceptsProofMedia(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo)
	_, err := svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:             "padi",
		CertificationLevel: "Instructor",
		ProofMediaID:       "00000000-0000-0000-0000-000000000123",
	})
	if err != nil {
		t.Fatalf("expected proof media to be accepted, got %v", err)
	}
}

func TestCertificationAgencyValidation(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo)
	_, err := svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:                  "made_up",
		CertificationLevel:      "Instructor",
		OfficialVerificationURL: "https://verify.example.com/member/123",
	})
	var validationErr ValidationFailure
	if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != "agency" {
		t.Fatalf("expected agency validation error, got %v", err)
	}
	_, err = svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:                  "other",
		CertificationLevel:      "Instructor",
		OfficialVerificationURL: "https://verify.example.com/member/123",
	})
	if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != "agencyOtherName" {
		t.Fatalf("expected other agency validation error, got %v", err)
	}
}

func structuredProfileInput() ProfileInput {
	return ProfileInput{
		Bio:               "Bio",
		HomeLocationLabel: "Cebu City, Cebu",
		FormattedAddress:  "Cebu City, Cebu",
		RegionCode:        "07",
		RegionName:        "Central Visayas",
		ProvinceCode:      "0722",
		ProvinceName:      "Cebu",
		CityCode:          "072217",
		CityName:          "Cebu City",
		LocationSource:    "psgc_mapped",
	}
}

func structuredProfileInputWithoutBio() ProfileInput {
	input := structuredProfileInput()
	input.Bio = ""
	return input
}

func TestCertificationRequiresProofAndValidVerificationURL(t *testing.T) {
	repo := &fakeRepo{}
	svc := New(repo)
	_, err := svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:             "padi",
		CertificationLevel: "Instructor",
	})
	var validationErr ValidationFailure
	if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != "certificationProof" {
		t.Fatalf("expected proof validation error, got %v", err)
	}
	_, err = svc.CreateCertification(context.Background(), "user-1", CertificationInput{
		Agency:                  "padi",
		CertificationLevel:      "Instructor",
		OfficialVerificationURL: "verify.example.com/member/123",
	})
	if err == nil || !errors.As(err, &validationErr) || validationErr.Issues[0].Path[0] != "officialVerificationUrl" {
		t.Fatalf("expected url validation error, got %v", err)
	}
}

func TestAdminCanVerifyAndRejectInstructor(t *testing.T) {
	repo := &fakeRepo{profile: instructorsrepo.Profile{ID: "profile-1", UserID: "user-1", VerificationStatus: "pending"}, certs: []instructorsrepo.Certification{{ID: "cert-1", VerificationStatus: "pending", OfficialVerificationURL: "https://verify.example.com/member/123"}}}
	svc := New(repo)
	app, err := svc.VerifyApplication(context.Background(), "profile-1", "admin-1")
	if err != nil {
		t.Fatalf("verify failed: %v", err)
	}
	if app.Profile == nil || app.Profile.VerificationStatus != "verified" || app.Certifications[0].VerificationStatus != "verified" {
		t.Fatalf("expected verified profile and certification, got %#v", app)
	}
	app, err = svc.RejectApplication(context.Background(), "profile-1", "admin-1", "Needs proof")
	if err != nil {
		t.Fatalf("reject failed: %v", err)
	}
	if app.Profile == nil || app.Profile.VerificationStatus != "rejected" || app.Profile.RejectionReason != "Needs proof" {
		t.Fatalf("expected rejected profile, got %#v", app.Profile)
	}
}
