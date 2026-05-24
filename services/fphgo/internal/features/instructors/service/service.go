package service

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	instructorsrepo "fphgo/internal/features/instructors/repo"
	notificationsservice "fphgo/internal/features/notifications/service"
	apperrors "fphgo/internal/shared/errors"
	"fphgo/internal/shared/mediasign"
	"fphgo/internal/shared/validatex"
)

const (
	DefaultLimit = 20
	MaxLimit     = 100

	defaultCertificationProofURLTTL = 5 * time.Minute
)

type repository interface {
	GetByUserID(context.Context, string) (instructorsrepo.Profile, error)
	GetByID(context.Context, string) (instructorsrepo.Profile, error)
	GetPublicByUsername(context.Context, string) (instructorsrepo.Profile, error)
	UpsertProfile(context.Context, string, instructorsrepo.ProfileInput) (instructorsrepo.Profile, error)
	SubmitProfile(context.Context, string) (instructorsrepo.Profile, error)
	ListCertifications(context.Context, string) ([]instructorsrepo.Certification, error)
	CreateCertification(context.Context, string, instructorsrepo.CertificationInput) (instructorsrepo.Certification, error)
	UpdateCertification(context.Context, string, string, instructorsrepo.CertificationInput) (instructorsrepo.Certification, error)
	DeleteCertification(context.Context, string, string) error
	CountCertifications(context.Context, string) (int, error)
	ListProfiles(context.Context, instructorsrepo.ListInput) ([]instructorsrepo.Profile, int, error)
	VerifyProfile(context.Context, string, string) (instructorsrepo.Profile, error)
	RejectProfile(context.Context, string, string, string) (instructorsrepo.Profile, error)
	SuspendProfile(context.Context, string, string, string) (instructorsrepo.Profile, error)
	GetCertificationProof(context.Context, string) (instructorsrepo.CertificationProof, error)
}

type Service struct {
	repo          repository
	notifications notificationProcessor
	mediaSigner   *mediasign.Signer
	proofURLTTL   time.Duration
	nowFn         func() time.Time
}

type notificationProcessor interface {
	ProcessDueOutbox(ctx context.Context, limit int) (notificationsservice.OutboxProcessResult, error)
}

type ProfileInput struct {
	DisplayName, Bio, HomeLocationLabel, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName string
	CityCode, CityName, BarangayCode, BarangayName, LocationSource                                            string
	Specialties, SchoolAffiliation, WebsiteURL, SocialLinks, SafetyCredentials                                string
	TeachingSince                                                                                             *time.Time
}

type CertificationInput struct {
	Agency, AgencyOtherName, CertificationLevel, CertificationNumber, ProofMediaID, OfficialVerificationURL string
	IssuedAt, ExpiresAt                                                                                     *time.Time
}

type SubmitInput struct {
	AttestationAccepted bool
}

type ListInput struct {
	Status string
	Page   int
	Limit  int
}

type ListResult struct {
	Items []Application
	Total int
	Page  int
	Limit int
}

type Application struct {
	Profile        *instructorsrepo.Profile
	Certifications []instructorsrepo.Certification
}

type CertificationProofURL struct {
	CertificationID  string
	ProofMediaID     string
	ProofFileName    string
	ProofContentType string
	URL              string
	ExpiresAt        int64
}

type ValidationFailure struct {
	Issues []validatex.Issue
}

func (e ValidationFailure) Error() string { return "validation failed" }

type Option func(*Service)

func WithProofSigning(baseURL, signingSecret string, keyVersion int) Option {
	return func(s *Service) {
		s.mediaSigner = mediasign.New(baseURL, signingSecret, keyVersion, mediasign.WithNow(s.nowFn))
	}
}

func WithNow(nowFn func() time.Time) Option {
	return func(s *Service) {
		if nowFn != nil {
			s.nowFn = nowFn
		}
	}
}

func WithNotifications(notifications notificationProcessor) Option {
	return func(s *Service) {
		s.notifications = notifications
	}
}

func New(repo repository, opts ...Option) *Service {
	svc := &Service{
		repo:        repo,
		proofURLTTL: defaultCertificationProofURLTTL,
		nowFn:       time.Now,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) GetMe(ctx context.Context, userID string) (Application, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		if instructorsrepo.IsNoRows(err) {
			return Application{Certifications: []instructorsrepo.Certification{}}, nil
		}
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_profile_get_failed", "failed to fetch instructor profile", err)
	}
	certs, err := s.repo.ListCertifications(ctx, profile.ID)
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_certifications_list_failed", "failed to fetch instructor certifications", err)
	}
	return Application{Profile: &profile, Certifications: certs}, nil
}

func (s *Service) SaveProfile(ctx context.Context, userID string, input ProfileInput) (Application, error) {
	normalized := normalizeProfile(input)
	profile, err := s.repo.UpsertProfile(ctx, userID, instructorsrepo.ProfileInput{
		DisplayName:       normalized.DisplayName,
		Bio:               normalized.Bio,
		TeachingSince:     normalized.TeachingSince,
		HomeLocationLabel: normalized.HomeLocationLabel,
		FormattedAddress:  normalized.FormattedAddress,
		RegionCode:        normalized.RegionCode,
		RegionName:        normalized.RegionName,
		ProvinceCode:      normalized.ProvinceCode,
		ProvinceName:      normalized.ProvinceName,
		CityCode:          normalized.CityCode,
		CityName:          normalized.CityName,
		BarangayCode:      normalized.BarangayCode,
		BarangayName:      normalized.BarangayName,
		LocationSource:    normalized.LocationSource,
		Specialties:       normalized.Specialties,
		SchoolAffiliation: normalized.SchoolAffiliation,
		WebsiteURL:        normalized.WebsiteURL,
		SocialLinks:       normalized.SocialLinks,
		SafetyCredentials: normalized.SafetyCredentials,
	})
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_profile_save_failed", "failed to save instructor profile", err)
	}
	return s.application(ctx, profile)
}

func (s *Service) SubmitProfile(ctx context.Context, userID string, input SubmitInput) (Application, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		if instructorsrepo.IsNoRows(err) {
			return Application{}, validation("profile", "required", "Create an instructor profile before submitting")
		}
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_profile_get_failed", "failed to fetch instructor profile", err)
	}
	if profile.VerificationStatus == "pending" || profile.VerificationStatus == "verified" {
		return s.application(ctx, profile)
	}
	if profile.VerificationStatus == "suspended" {
		return Application{}, apperrors.New(http.StatusForbidden, "instructor_suspended", "suspended instructors cannot resubmit", nil)
	}
	if strings.TrimSpace(profile.Bio) == "" {
		return Application{}, validation("bio", "required", "Instructor profile bio is required")
	}
	if strings.TrimSpace(profile.HomeLocationLabel) == "" {
		return Application{}, validation("homeLocationLabel", "required", "Base/home location is required")
	}
	if !hasStructuredLocation(profile) {
		return Application{}, validation("homeLocation", "required", "Choose your base/home location before submitting")
	}
	if !input.AttestationAccepted {
		return Application{}, validation("attestationAccepted", "required", "You must accept the instructor verification attestation before submitting")
	}
	certs, err := s.repo.ListCertifications(ctx, profile.ID)
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_certifications_list_failed", "failed to fetch instructor certifications", err)
	}
	if len(certs) == 0 {
		return Application{}, validation("certifications", "required", "Add at least one instructor certification before submitting")
	}
	if !hasCertificationProof(certs) {
		return Application{}, validation("certificationProof", "required", "Add proof of certification or an official verification/profile URL before submitting")
	}
	profile, err = s.repo.SubmitProfile(ctx, userID)
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_profile_not_found")
	}
	s.processNotificationOutbox(ctx, "submitted", profile)
	return s.application(ctx, profile)
}

func (s *Service) CreateCertification(ctx context.Context, userID string, input CertificationInput) (instructorsrepo.Certification, error) {
	profile, err := s.ensureProfile(ctx, userID)
	if err != nil {
		return instructorsrepo.Certification{}, err
	}
	normalized, err := normalizeCertification(input)
	if err != nil {
		return instructorsrepo.Certification{}, err
	}
	item, err := s.repo.CreateCertification(ctx, profile.ID, normalized)
	if err != nil {
		return instructorsrepo.Certification{}, apperrors.New(http.StatusInternalServerError, "instructor_certification_create_failed", "failed to add instructor certification", err)
	}
	return item, nil
}

func (s *Service) UpdateCertification(ctx context.Context, userID, certificationID string, input CertificationInput) (instructorsrepo.Certification, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return instructorsrepo.Certification{}, mapNotFound(err, "instructor_profile_not_found")
	}
	normalized, err := normalizeCertification(input)
	if err != nil {
		return instructorsrepo.Certification{}, err
	}
	item, err := s.repo.UpdateCertification(ctx, profile.ID, strings.TrimSpace(certificationID), normalized)
	if err != nil {
		return instructorsrepo.Certification{}, mapNotFound(err, "instructor_certification_not_found")
	}
	return item, nil
}

func (s *Service) DeleteCertification(ctx context.Context, userID, certificationID string) error {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return mapNotFound(err, "instructor_profile_not_found")
	}
	return mapNotFound(s.repo.DeleteCertification(ctx, profile.ID, strings.TrimSpace(certificationID)), "instructor_certification_not_found")
}

func (s *Service) GetPublicByUsername(ctx context.Context, username string) (Application, error) {
	profile, err := s.repo.GetPublicByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_not_found")
	}
	return s.application(ctx, profile)
}

func (s *Service) ListApplications(ctx context.Context, input ListInput) (ListResult, error) {
	normalized := normalizeList(input)
	status := normalizeStatusFilter(normalized.Status)
	if status == "" {
		return ListResult{}, validation("status", "invalid", "Invalid instructor status")
	}
	items, total, err := s.repo.ListProfiles(ctx, instructorsrepo.ListInput{
		Status: status,
		Limit:  normalized.Limit,
		Offset: (normalized.Page - 1) * normalized.Limit,
	})
	if err != nil {
		return ListResult{}, apperrors.New(http.StatusInternalServerError, "admin_instructors_list_failed", "failed to list instructor applications", err)
	}
	applications := make([]Application, 0, len(items))
	for _, profile := range items {
		application, err := s.application(ctx, profile)
		if err != nil {
			return ListResult{}, err
		}
		applications = append(applications, application)
	}
	return ListResult{Items: applications, Total: total, Page: normalized.Page, Limit: normalized.Limit}, nil
}

func (s *Service) GetApplication(ctx context.Context, profileID string) (Application, error) {
	profile, err := s.repo.GetByID(ctx, strings.TrimSpace(profileID))
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_profile_not_found")
	}
	return s.application(ctx, profile)
}

func (s *Service) VerifyApplication(ctx context.Context, profileID, reviewerID string) (Application, error) {
	profile, err := s.repo.GetByID(ctx, strings.TrimSpace(profileID))
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_profile_not_found")
	}
	certs, err := s.repo.ListCertifications(ctx, profile.ID)
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_certifications_list_failed", "failed to fetch instructor certifications", err)
	}
	if len(certs) == 0 {
		return Application{}, validation("certifications", "required", "At least one certification is required before verification")
	}
	if !hasCertificationProof(certs) {
		return Application{}, validation("certificationProof", "required", "At least one certification needs readable proof or an official verification/profile URL before verification")
	}
	profile, err = s.repo.VerifyProfile(ctx, profile.ID, reviewerID)
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "admin_instructor_verify_failed", "failed to verify instructor", err)
	}
	s.processNotificationOutbox(ctx, "approved", profile)
	return s.application(ctx, profile)
}

func (s *Service) RejectApplication(ctx context.Context, profileID, reviewerID, reason string) (Application, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return Application{}, validation("reason", "required", "Rejection reason is required")
	}
	profile, err := s.repo.RejectProfile(ctx, strings.TrimSpace(profileID), reviewerID, reason)
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_profile_not_found")
	}
	s.processNotificationOutbox(ctx, "rejected", profile)
	return s.application(ctx, profile)
}

func (s *Service) SuspendApplication(ctx context.Context, profileID, reviewerID, reason string) (Application, error) {
	profile, err := s.repo.SuspendProfile(ctx, strings.TrimSpace(profileID), reviewerID, strings.TrimSpace(reason))
	if err != nil {
		return Application{}, mapNotFound(err, "instructor_profile_not_found")
	}
	return s.application(ctx, profile)
}

func (s *Service) GetCertificationProofURL(ctx context.Context, certificationID, actorID string, admin bool) (CertificationProofURL, error) {
	actorID = strings.TrimSpace(actorID)
	certificationID = strings.TrimSpace(certificationID)
	if actorID == "" {
		return CertificationProofURL{}, apperrors.New(http.StatusUnauthorized, "unauthenticated", "authentication required", nil)
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return CertificationProofURL{}, apperrors.New(http.StatusUnauthorized, "unauthenticated", "authentication required", err)
	}
	if _, err := uuid.Parse(certificationID); err != nil {
		return CertificationProofURL{}, validation("certificationId", "invalid", "Invalid certification")
	}
	proof, err := s.repo.GetCertificationProof(ctx, certificationID)
	if err != nil {
		if instructorsrepo.IsNoRows(err) {
			return CertificationProofURL{}, apperrors.New(http.StatusNotFound, "certification_proof_not_found", "certification proof not found", err)
		}
		return CertificationProofURL{}, apperrors.New(http.StatusInternalServerError, "certification_proof_get_failed", "failed to load certification proof", err)
	}
	if !admin && strings.TrimSpace(proof.UserID) != actorID {
		return CertificationProofURL{}, apperrors.New(http.StatusForbidden, "forbidden", "only the applicant or an admin reviewer can view this proof", nil)
	}
	if s.mediaSigner == nil || !s.mediaSigner.Configured() {
		return CertificationProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	url := s.mediaSigner.URLWithTransform(proof.ObjectKey, 0, 0, "", s.proofURLTTL)
	if url == "" {
		return CertificationProofURL{}, apperrors.New(http.StatusInternalServerError, "media_signing_unavailable", "media signing is not configured", nil)
	}
	return CertificationProofURL{
		CertificationID:  proof.CertificationID,
		ProofMediaID:     proof.ProofMediaID,
		ProofFileName:    proof.FileName,
		ProofContentType: proof.ContentType,
		URL:              url,
		ExpiresAt:        s.nowFn().Add(s.proofURLTTL).Unix(),
	}, nil
}

func (s *Service) ensureProfile(ctx context.Context, userID string) (instructorsrepo.Profile, error) {
	profile, err := s.repo.GetByUserID(ctx, userID)
	if err == nil {
		return profile, nil
	}
	if !instructorsrepo.IsNoRows(err) {
		return instructorsrepo.Profile{}, apperrors.New(http.StatusInternalServerError, "instructor_profile_get_failed", "failed to fetch instructor profile", err)
	}
	return s.repo.UpsertProfile(ctx, userID, instructorsrepo.ProfileInput{})
}

func (s *Service) application(ctx context.Context, profile instructorsrepo.Profile) (Application, error) {
	certs, err := s.repo.ListCertifications(ctx, profile.ID)
	if err != nil {
		return Application{}, apperrors.New(http.StatusInternalServerError, "instructor_certifications_list_failed", "failed to fetch instructor certifications", err)
	}
	return Application{Profile: &profile, Certifications: certs}, nil
}

func (s *Service) processNotificationOutbox(ctx context.Context, transition string, profile instructorsrepo.Profile) {
	if s.notifications == nil {
		return
	}
	if _, err := s.notifications.ProcessDueOutbox(ctx, 10); err != nil {
		slog.Default().Warn("instructors.notification_outbox_process_failed",
			slog.String("transition", transition),
			slog.String("profile_id", profile.ID),
			slog.String("applicant_user_id", profile.UserID),
			slog.Any("error", err),
		)
	}
}

func normalizeProfile(input ProfileInput) ProfileInput {
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Bio = strings.TrimSpace(input.Bio)
	input.HomeLocationLabel = strings.TrimSpace(input.HomeLocationLabel)
	input.FormattedAddress = strings.TrimSpace(input.FormattedAddress)
	input.RegionCode = strings.TrimSpace(input.RegionCode)
	input.RegionName = strings.TrimSpace(input.RegionName)
	input.ProvinceCode = strings.TrimSpace(input.ProvinceCode)
	input.ProvinceName = strings.TrimSpace(input.ProvinceName)
	input.CityCode = strings.TrimSpace(input.CityCode)
	input.CityName = strings.TrimSpace(input.CityName)
	input.BarangayCode = strings.TrimSpace(input.BarangayCode)
	input.BarangayName = strings.TrimSpace(input.BarangayName)
	input.LocationSource = strings.TrimSpace(input.LocationSource)
	if input.LocationSource == "" {
		input.LocationSource = "manual"
	}
	input.Specialties = strings.TrimSpace(input.Specialties)
	input.SchoolAffiliation = strings.TrimSpace(input.SchoolAffiliation)
	input.WebsiteURL = strings.TrimSpace(input.WebsiteURL)
	input.SocialLinks = strings.TrimSpace(input.SocialLinks)
	input.SafetyCredentials = strings.TrimSpace(input.SafetyCredentials)
	return input
}

func normalizeCertification(input CertificationInput) (instructorsrepo.CertificationInput, error) {
	agency := strings.ToLower(strings.TrimSpace(input.Agency))
	otherName := strings.TrimSpace(input.AgencyOtherName)
	level := strings.TrimSpace(input.CertificationLevel)
	proofMediaID := strings.TrimSpace(input.ProofMediaID)
	verificationURL := strings.TrimSpace(input.OfficialVerificationURL)
	if !oneOf(agency, "molchanovs", "padi", "aida", "ssi", "raid", "apnea_academy", "other") {
		return instructorsrepo.CertificationInput{}, validation("agency", "invalid", "Invalid certification agency")
	}
	if agency == "other" && otherName == "" {
		return instructorsrepo.CertificationInput{}, validation("agencyOtherName", "required", "Other agency name is required")
	}
	if level == "" {
		return instructorsrepo.CertificationInput{}, validation("certificationLevel", "required", "Certification level is required")
	}
	if proofMediaID == "" && verificationURL == "" {
		return instructorsrepo.CertificationInput{}, validation("certificationProof", "required", "Proof of certification or an official verification/profile URL is required")
	}
	if verificationURL != "" && !validHTTPURL(verificationURL) {
		return instructorsrepo.CertificationInput{}, validation("officialVerificationUrl", "invalid", "Official verification URL must start with http:// or https://")
	}
	if input.IssuedAt != nil && input.ExpiresAt != nil && input.ExpiresAt.Before(*input.IssuedAt) {
		return instructorsrepo.CertificationInput{}, validation("expiresAt", "invalid", "Expiry date cannot be before issue date")
	}
	return instructorsrepo.CertificationInput{
		Agency:                  agency,
		AgencyOtherName:         otherName,
		CertificationLevel:      level,
		CertificationNumber:     strings.TrimSpace(input.CertificationNumber),
		IssuedAt:                input.IssuedAt,
		ExpiresAt:               input.ExpiresAt,
		ProofMediaID:            proofMediaID,
		OfficialVerificationURL: verificationURL,
	}, nil
}

func hasCertificationProof(items []instructorsrepo.Certification) bool {
	for _, item := range items {
		if strings.TrimSpace(item.ProofMediaID) != "" || strings.TrimSpace(item.OfficialVerificationURL) != "" {
			return true
		}
	}
	return false
}

func hasStructuredLocation(profile instructorsrepo.Profile) bool {
	return strings.TrimSpace(profile.RegionCode) != "" ||
		strings.TrimSpace(profile.ProvinceCode) != "" ||
		strings.TrimSpace(profile.CityCode) != "" ||
		strings.TrimSpace(profile.BarangayCode) != ""
}

func validHTTPURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func normalizeList(input ListInput) ListInput {
	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return ListInput{Status: input.Status, Page: page, Limit: limit}
}

func normalizeStatusFilter(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "" {
		return "pending"
	}
	if oneOf(status, "all", "draft", "pending", "verified", "rejected", "suspended") {
		return status
	}
	return ""
}

func mapNotFound(err error, code string) error {
	if err == nil {
		return nil
	}
	if instructorsrepo.IsNoRows(err) {
		return apperrors.New(http.StatusNotFound, code, "not found", err)
	}
	return apperrors.New(http.StatusInternalServerError, code, "request failed", err)
}

func validation(path, code, message string) ValidationFailure {
	return ValidationFailure{Issues: []validatex.Issue{{Path: []any{path}, Code: code, Message: message}}}
}

func oneOf(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}
