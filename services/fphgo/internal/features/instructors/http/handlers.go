package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	instructorsrepo "fphgo/internal/features/instructors/repo"
	instructorsservice "fphgo/internal/features/instructors/service"
	"fphgo/internal/middleware"
	"fphgo/internal/shared/httpx"
	"fphgo/internal/shared/validatex"
)

type Handlers struct {
	service   *instructorsservice.Service
	validator httpx.Validator
}

func New(service *instructorsservice.Service, validator httpx.Validator) *Handlers {
	return &Handlers{service: service, validator: validator}
}

type ProfileRequest struct {
	DisplayName       string `json:"displayName"`
	Bio               string `json:"bio"`
	TeachingSince     string `json:"teachingSince"`
	HomeLocationLabel string `json:"homeLocationLabel"`
	FormattedAddress  string `json:"formattedAddress"`
	RegionCode        string `json:"regionCode"`
	RegionName        string `json:"regionName"`
	ProvinceCode      string `json:"provinceCode"`
	ProvinceName      string `json:"provinceName"`
	CityCode          string `json:"cityCode"`
	CityName          string `json:"cityName"`
	BarangayCode      string `json:"barangayCode"`
	BarangayName      string `json:"barangayName"`
	LocationSource    string `json:"locationSource"`
	Specialties       string `json:"specialties"`
	SchoolAffiliation string `json:"schoolAffiliation"`
	WebsiteURL        string `json:"websiteUrl"`
	SocialLinks       string `json:"socialLinks"`
	SafetyCredentials string `json:"safetyCredentials"`
}

type CertificationRequest struct {
	Agency                  string `json:"agency"`
	AgencyOtherName         string `json:"agencyOtherName"`
	CertificationLevel      string `json:"certificationLevel"`
	CertificationNumber     string `json:"certificationNumber"`
	IssuedAt                string `json:"issuedAt"`
	ExpiresAt               string `json:"expiresAt"`
	ProofMediaID            string `json:"proofMediaId"`
	OfficialVerificationURL string `json:"officialVerificationUrl"`
}

type SubmitRequest struct {
	AttestationAccepted bool `json:"attestationAccepted"`
}

type ReviewRequest struct {
	Reason string `json:"reason"`
}

func (h *Handlers) GetMe(w http.ResponseWriter, r *http.Request) {
	app, err := h.service.GetMe(r.Context(), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) SaveMe(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[ProfileRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input, err := profileInput(req)
	if err != nil {
		handleError(w, r, err)
		return
	}
	app, err := h.service.SaveProfile(r.Context(), actorID(r), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) SubmitMe(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[SubmitRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	app, err := h.service.SubmitProfile(r.Context(), actorID(r), instructorsservice.SubmitInput{
		AttestationAccepted: req.AttestationAccepted,
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) CreateCertification(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[CertificationRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input, err := certificationInput(req)
	if err != nil {
		handleError(w, r, err)
		return
	}
	item, err := h.service.CreateCertification(r.Context(), actorID(r), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"certification": mapCertification(item, true)})
}

func (h *Handlers) UpdateCertification(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[CertificationRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	input, err := certificationInput(req)
	if err != nil {
		handleError(w, r, err)
		return
	}
	item, err := h.service.UpdateCertification(r.Context(), actorID(r), chi.URLParam(r, "certificationId"), input)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"certification": mapCertification(item, true)})
}

func (h *Handlers) DeleteCertification(w http.ResponseWriter, r *http.Request) {
	if err := h.service.DeleteCertification(r.Context(), actorID(r), chi.URLParam(r, "certificationId")); err != nil {
		handleError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) GetMyCertificationProofURL(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.GetCertificationProofURL(r.Context(), chi.URLParam(r, "certificationId"), actorID(r), false)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"proof": mapCertificationProofURL(result)})
}

func (h *Handlers) GetPublicInstructor(w http.ResponseWriter, r *http.Request) {
	app, err := h.service.GetPublicByUsername(r.Context(), chi.URLParam(r, "username"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, false)
}

func (h *Handlers) ListAdminInstructors(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.ListApplications(r.Context(), instructorsservice.ListInput{
		Status: q(r, "status"),
		Page:   parseInt(q(r, "page"), 1),
		Limit:  parseInt(q(r, "limit"), instructorsservice.DefaultLimit),
	})
	if err != nil {
		handleError(w, r, err)
		return
	}
	items := make([]map[string]any, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, mapApplication(item, true))
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"items":      items,
		"pagination": pagination(result.Page, result.Limit, result.Total),
	})
}

func (h *Handlers) GetAdminInstructor(w http.ResponseWriter, r *http.Request) {
	app, err := h.service.GetApplication(r.Context(), chi.URLParam(r, "instructorId"))
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) VerifyInstructor(w http.ResponseWriter, r *http.Request) {
	app, err := h.service.VerifyApplication(r.Context(), chi.URLParam(r, "instructorId"), actorID(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) RejectInstructor(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[ReviewRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	app, err := h.service.RejectApplication(r.Context(), chi.URLParam(r, "instructorId"), actorID(r), req.Reason)
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) SuspendInstructor(w http.ResponseWriter, r *http.Request) {
	req, issues, ok := httpx.DecodeAndValidate[ReviewRequest](r, h.validator)
	if !ok {
		httpx.WriteValidationError(w, issues)
		return
	}
	app, err := h.service.SuspendApplication(r.Context(), chi.URLParam(r, "instructorId"), actorID(r), req.Reason)
	if err != nil {
		handleError(w, r, err)
		return
	}
	writeApplication(w, http.StatusOK, app, true)
}

func (h *Handlers) GetAdminCertificationProofURL(w http.ResponseWriter, r *http.Request) {
	result, err := h.service.GetCertificationProofURL(r.Context(), chi.URLParam(r, "certificationId"), actorID(r), true)
	if err != nil {
		handleError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"proof": mapCertificationProofURL(result)})
}

func writeApplication(w http.ResponseWriter, status int, app instructorsservice.Application, includePrivate bool) {
	httpx.JSON(w, status, map[string]any{"application": mapApplication(app, includePrivate)})
}

func mapCertificationProofURL(result instructorsservice.CertificationProofURL) map[string]any {
	return map[string]any{
		"certificationId":  result.CertificationID,
		"proofMediaId":     result.ProofMediaID,
		"proofFileName":    result.ProofFileName,
		"proofContentType": result.ProofContentType,
		"url":              result.URL,
		"expiresAt":        result.ExpiresAt,
	}
}

func mapApplication(app instructorsservice.Application, includePrivate bool) map[string]any {
	return map[string]any{
		"profile":                mapProfile(app.Profile, includePrivate),
		"certifications":         mapCertifications(app.Certifications, includePrivate),
		"viewerInstructorStatus": viewerStatus(app.Profile, app.Certifications),
	}
}

func mapProfile(item *instructorsrepo.Profile, includePrivate bool) map[string]any {
	if item == nil {
		return nil
	}
	displayName := item.DisplayName
	if displayName == "" {
		displayName = item.UserDisplayName
	}
	out := map[string]any{
		"id":                 item.ID,
		"userId":             item.UserID,
		"username":           item.Username,
		"displayName":        displayName,
		"bio":                item.Bio,
		"teachingSince":      formatDate(item.TeachingSince),
		"homeLocationLabel":  item.HomeLocationLabel,
		"formattedAddress":   item.FormattedAddress,
		"regionCode":         item.RegionCode,
		"regionName":         item.RegionName,
		"provinceCode":       item.ProvinceCode,
		"provinceName":       item.ProvinceName,
		"cityCode":           item.CityCode,
		"cityName":           item.CityName,
		"barangayCode":       item.BarangayCode,
		"barangayName":       item.BarangayName,
		"locationSource":     item.LocationSource,
		"specialties":        item.Specialties,
		"schoolAffiliation":  item.SchoolAffiliation,
		"websiteUrl":         item.WebsiteURL,
		"socialLinks":        item.SocialLinks,
		"safetyCredentials":  item.SafetyCredentials,
		"verificationStatus": item.VerificationStatus,
		"verifiedAt":         formatTime(item.VerifiedAt),
		"createdAt":          item.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":          item.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if includePrivate {
		out["verifiedBy"] = item.VerifiedBy
		out["rejectionReason"] = item.RejectionReason
		out["attestationAcceptedAt"] = formatTime(item.AttestationAcceptedAt)
	} else {
		out["regionCode"] = ""
		out["provinceCode"] = ""
		out["cityCode"] = ""
		out["barangayCode"] = ""
	}
	return out
}

func mapCertifications(items []instructorsrepo.Certification, includePrivate bool) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if !includePrivate && item.VerificationStatus != "verified" {
			continue
		}
		out = append(out, mapCertification(item, includePrivate))
	}
	return out
}

func mapCertification(item instructorsrepo.Certification, includePrivate bool) map[string]any {
	out := map[string]any{
		"id":                  item.ID,
		"instructorProfileId": item.InstructorProfileID,
		"agency":              item.Agency,
		"agencyOtherName":     item.AgencyOtherName,
		"certificationLevel":  item.CertificationLevel,
		"certificationNumber": item.CertificationNumber,
		"issuedAt":            formatDate(item.IssuedAt),
		"expiresAt":           formatDate(item.ExpiresAt),
		"verificationStatus":  item.VerificationStatus,
		"verifiedAt":          formatTime(item.VerifiedAt),
		"createdAt":           item.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":           item.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if includePrivate {
		out["proofMediaId"] = item.ProofMediaID
		out["officialVerificationUrl"] = item.OfficialVerificationURL
		out["verifiedBy"] = item.VerifiedBy
		out["rejectionReason"] = item.RejectionReason
	}
	return out
}

func viewerStatus(profile *instructorsrepo.Profile, certifications []instructorsrepo.Certification) map[string]any {
	status := "none"
	canCreate := false
	reason := "Create/complete your instructor profile before creating a school."
	rejectionReason := ""
	hasCertifications := len(certifications) > 0
	if profile != nil {
		status = profile.VerificationStatus
		rejectionReason = profile.RejectionReason
		switch status {
		case "draft":
			reason = "Create or complete your instructor profile and add at least one certification before creating a school."
		case "pending":
			reason = "Your instructor profile is complete. You can now create and manage schools."
		case "verified":
			reason = "Your instructor profile is complete. You can now create and manage schools."
		case "rejected":
			reason = "Your instructor application needs changes."
		case "suspended":
			reason = "Your instructor privileges are suspended."
		}
	}
	canCreate = profile != nil && hasCertifications && status != "rejected" && status != "suspended"
	if status == "none" {
		canCreate = false
	}
	if profile != nil && !hasCertifications {
		reason = "Add at least one certification before creating a school."
	}
	return map[string]any{
		"status":          status,
		"canCreateSchool": canCreate,
		"message":         reason,
		"rejectionReason": rejectionReason,
	}
}

func profileInput(req ProfileRequest) (instructorsservice.ProfileInput, error) {
	teachingSince, err := parseDatePtr(req.TeachingSince, "teachingSince")
	if err != nil {
		return instructorsservice.ProfileInput{}, err
	}
	return instructorsservice.ProfileInput{
		DisplayName:       req.DisplayName,
		Bio:               req.Bio,
		TeachingSince:     teachingSince,
		HomeLocationLabel: req.HomeLocationLabel,
		FormattedAddress:  req.FormattedAddress,
		RegionCode:        req.RegionCode,
		RegionName:        req.RegionName,
		ProvinceCode:      req.ProvinceCode,
		ProvinceName:      req.ProvinceName,
		CityCode:          req.CityCode,
		CityName:          req.CityName,
		BarangayCode:      req.BarangayCode,
		BarangayName:      req.BarangayName,
		LocationSource:    req.LocationSource,
		Specialties:       req.Specialties,
		SchoolAffiliation: req.SchoolAffiliation,
		WebsiteURL:        req.WebsiteURL,
		SocialLinks:       req.SocialLinks,
		SafetyCredentials: req.SafetyCredentials,
	}, nil
}

func certificationInput(req CertificationRequest) (instructorsservice.CertificationInput, error) {
	issuedAt, err := parseDatePtr(req.IssuedAt, "issuedAt")
	if err != nil {
		return instructorsservice.CertificationInput{}, err
	}
	expiresAt, err := parseDatePtr(req.ExpiresAt, "expiresAt")
	if err != nil {
		return instructorsservice.CertificationInput{}, err
	}
	return instructorsservice.CertificationInput{
		Agency:                  req.Agency,
		AgencyOtherName:         req.AgencyOtherName,
		CertificationLevel:      req.CertificationLevel,
		CertificationNumber:     req.CertificationNumber,
		IssuedAt:                issuedAt,
		ExpiresAt:               expiresAt,
		ProofMediaID:            req.ProofMediaID,
		OfficialVerificationURL: req.OfficialVerificationURL,
	}, nil
}

func parseDatePtr(value, field string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, instructorsservice.ValidationFailure{Issues: []validatex.Issue{{Path: []any{field}, Code: "invalid_date", Message: "Must be a valid date"}}}
	}
	return &parsed, nil
}

func formatDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format("2006-01-02")
}

func formatTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func pagination(page, limit, total int) map[string]any {
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return map[string]any{
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": totalPages,
		"hasNext":    page < totalPages,
		"hasPrev":    page > 1,
	}
}

func actorID(r *http.Request) string {
	identity, ok := middleware.CurrentIdentity(r.Context())
	if !ok || identity.UserID == "" {
		return ""
	}
	return identity.UserID
}

func q(r *http.Request, key string) string { return strings.TrimSpace(r.URL.Query().Get(key)) }

func parseInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	var validationErr instructorsservice.ValidationFailure
	if errors.As(err, &validationErr) {
		httpx.WriteValidationError(w, validationErr.Issues)
		return
	}
	httpx.Error(w, middleware.RequestIDFromContext(r.Context()), err)
}
