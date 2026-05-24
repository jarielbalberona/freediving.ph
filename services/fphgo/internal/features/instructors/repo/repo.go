package repo

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	notificationsrepo "fphgo/internal/features/notifications/repo"
)

type Repo struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

type Profile struct {
	ID                    string
	UserID                string
	Username              string
	UserDisplayName       string
	DisplayName           string
	Bio                   string
	TeachingSince         *time.Time
	HomeLocationLabel     string
	FormattedAddress      string
	RegionCode            string
	RegionName            string
	ProvinceCode          string
	ProvinceName          string
	CityCode              string
	CityName              string
	BarangayCode          string
	BarangayName          string
	LocationSource        string
	Specialties           string
	SchoolAffiliation     string
	WebsiteURL            string
	SocialLinks           string
	SafetyCredentials     string
	VerificationStatus    string
	VerifiedAt            *time.Time
	VerifiedBy            string
	RejectionReason       string
	AttestationAcceptedAt *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type Certification struct {
	ID                      string
	InstructorProfileID     string
	Agency                  string
	AgencyOtherName         string
	CertificationLevel      string
	CertificationNumber     string
	IssuedAt                *time.Time
	ExpiresAt               *time.Time
	ProofMediaID            string
	OfficialVerificationURL string
	VerificationStatus      string
	VerifiedAt              *time.Time
	VerifiedBy              string
	RejectionReason         string
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

type ProfileInput struct {
	DisplayName, Bio, HomeLocationLabel, FormattedAddress, RegionCode, RegionName, ProvinceCode, ProvinceName, CityCode, CityName, BarangayCode, BarangayName, LocationSource, Specialties, SchoolAffiliation, WebsiteURL, SocialLinks, SafetyCredentials string
	TeachingSince                                                                                                                                                                                                                                         *time.Time
}

type CertificationInput struct {
	Agency, AgencyOtherName, CertificationLevel, CertificationNumber, ProofMediaID, OfficialVerificationURL string
	IssuedAt, ExpiresAt                                                                                     *time.Time
}

type ListInput struct {
	Status string
	Limit  int
	Offset int
}

type CertificationProof struct {
	CertificationID string
	ProfileID       string
	UserID          string
	ProofMediaID    string
	ObjectKey       string
	FileName        string
	ContentType     string
}

type queryExecutor interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func (r *Repo) GetByUserID(ctx context.Context, userID string) (Profile, error) {
	row := r.pool.QueryRow(ctx, profileSelect()+` WHERE ip.user_id = $1`, userID)
	return scanProfile(row)
}

func (r *Repo) GetByID(ctx context.Context, profileID string) (Profile, error) {
	return getByIDWithExecutor(ctx, r.pool, profileID)
}

func (r *Repo) GetPublicByUsername(ctx context.Context, username string) (Profile, error) {
	row := r.pool.QueryRow(ctx, profileSelect()+` WHERE lower(u.username) = lower($1) AND ip.verification_status = 'verified'`, username)
	return scanProfile(row)
}

func (r *Repo) UpsertProfile(ctx context.Context, userID string, input ProfileInput) (Profile, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO instructor_profiles (user_id, display_name, bio, teaching_since, home_location_label, formatted_address, region_code, region_name, province_code, province_name, city_code, city_name, barangay_code, barangay_name, location_source, specialties, school_affiliation, website_url, social_links, safety_credentials, verification_status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'draft')
		ON CONFLICT (user_id) DO UPDATE SET
		  display_name = EXCLUDED.display_name,
		  bio = EXCLUDED.bio,
		  teaching_since = EXCLUDED.teaching_since,
		  home_location_label = EXCLUDED.home_location_label,
		  formatted_address = EXCLUDED.formatted_address,
		  region_code = EXCLUDED.region_code,
		  region_name = EXCLUDED.region_name,
		  province_code = EXCLUDED.province_code,
		  province_name = EXCLUDED.province_name,
		  city_code = EXCLUDED.city_code,
		  city_name = EXCLUDED.city_name,
		  barangay_code = EXCLUDED.barangay_code,
		  barangay_name = EXCLUDED.barangay_name,
		  location_source = EXCLUDED.location_source,
		  specialties = EXCLUDED.specialties,
		  school_affiliation = EXCLUDED.school_affiliation,
		  website_url = EXCLUDED.website_url,
		  social_links = EXCLUDED.social_links,
		  safety_credentials = EXCLUDED.safety_credentials,
		  verification_status = CASE
		    WHEN instructor_profiles.verification_status = 'rejected' THEN 'draft'
		    ELSE instructor_profiles.verification_status
		  END,
		  rejection_reason = CASE
		    WHEN instructor_profiles.verification_status = 'rejected' THEN NULL
		    ELSE instructor_profiles.rejection_reason
		  END,
		  updated_at = NOW()
		RETURNING id`,
		userID, input.DisplayName, input.Bio, input.TeachingSince, input.HomeLocationLabel, input.FormattedAddress, input.RegionCode, input.RegionName, input.ProvinceCode, input.ProvinceName, input.CityCode, input.CityName, input.BarangayCode, input.BarangayName, defaultString(input.LocationSource, "manual"), input.Specialties, input.SchoolAffiliation, input.WebsiteURL, input.SocialLinks, input.SafetyCredentials)
	var id string
	if err := row.Scan(&id); err != nil {
		return Profile{}, err
	}
	return r.GetByID(ctx, id)
}

func (r *Repo) SubmitProfile(ctx context.Context, userID string) (Profile, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Profile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	row := tx.QueryRow(ctx, `
		UPDATE instructor_profiles
		SET verification_status='pending', rejection_reason=NULL, attestation_accepted_at=NOW(), updated_at=NOW()
		WHERE user_id=$1 AND verification_status IN ('draft', 'rejected')
		RETURNING id`, userID)
	var id string
	if err := row.Scan(&id); err != nil {
		return Profile{}, err
	}
	profile, err := getByIDWithExecutor(ctx, tx, id)
	if err != nil {
		return Profile{}, err
	}
	if _, err := notificationsrepo.EnqueueOutboxWithExecutor(ctx, tx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventInstructorApplicationSubmitted,
		AggregateType: "instructor_application",
		AggregateID:   profile.ID,
		Payload: map[string]any{
			"profileId":            profile.ID,
			"applicantUserId":      profile.UserID,
			"applicantDisplayName": instructorNotificationDisplayName(profile),
			"status":               profile.VerificationStatus,
		},
		IdempotencyKey: "instructors:application:" + profile.ID + ":submitted",
	}); err != nil {
		return Profile{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Profile{}, err
	}
	return profile, nil
}

func (r *Repo) ListCertifications(ctx context.Context, profileID string) ([]Certification, error) {
	rows, err := r.pool.Query(ctx, certificationSelect()+` WHERE instructor_profile_id=$1 ORDER BY created_at DESC`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Certification
	for rows.Next() {
		item, err := scanCertification(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateCertification(ctx context.Context, profileID string, input CertificationInput) (Certification, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO instructor_certifications (instructor_profile_id, agency, agency_other_name, certification_level, certification_number, issued_at, expires_at, proof_media_id, official_verification_url, verification_status)
		VALUES ($1,$2,NULLIF($3,''),$4,NULLIF($5,''),$6,$7,NULLIF($8,'')::uuid,NULLIF($9,''),'pending')
		RETURNING `+certificationFields(),
		profileID, input.Agency, input.AgencyOtherName, input.CertificationLevel, input.CertificationNumber, input.IssuedAt, input.ExpiresAt, input.ProofMediaID, input.OfficialVerificationURL)
	return scanCertification(row)
}

func (r *Repo) UpdateCertification(ctx context.Context, profileID, certificationID string, input CertificationInput) (Certification, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE instructor_certifications
		SET agency=$3, agency_other_name=NULLIF($4,''), certification_level=$5, certification_number=NULLIF($6,''), issued_at=$7, expires_at=$8, proof_media_id=NULLIF($9,'')::uuid, official_verification_url=NULLIF($10,''), verification_status='pending', verified_at=NULL, verified_by=NULL, rejection_reason=NULL, updated_at=NOW()
		WHERE instructor_profile_id=$1 AND id=$2
		RETURNING `+certificationFields(),
		profileID, certificationID, input.Agency, input.AgencyOtherName, input.CertificationLevel, input.CertificationNumber, input.IssuedAt, input.ExpiresAt, input.ProofMediaID, input.OfficialVerificationURL)
	return scanCertification(row)
}

func (r *Repo) DeleteCertification(ctx context.Context, profileID, certificationID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM instructor_certifications WHERE instructor_profile_id=$1 AND id=$2`, profileID, certificationID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (r *Repo) GetCertificationProof(ctx context.Context, certificationID string) (CertificationProof, error) {
	const q = `
		SELECT ic.id::text, ip.id::text, ip.user_id::text,
			COALESCE(ic.proof_media_id::text, ''), mo.object_key,
			regexp_replace(mo.object_key, '^.*/', ''), mo.mime_type
		FROM instructor_certifications ic
		JOIN instructor_profiles ip ON ip.id = ic.instructor_profile_id
		JOIN media_objects mo ON mo.id = ic.proof_media_id
		WHERE ic.id = $1::uuid
			AND mo.context_type = 'instructor_certification_proof'
			AND mo.owner_app_user_id = ip.user_id
			AND mo.state = 'active'
	`
	var item CertificationProof
	err := r.pool.QueryRow(ctx, q, certificationID).Scan(
		&item.CertificationID, &item.ProfileID, &item.UserID,
		&item.ProofMediaID, &item.ObjectKey, &item.FileName, &item.ContentType,
	)
	return item, err
}

func (r *Repo) CountCertifications(ctx context.Context, profileID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM instructor_certifications WHERE instructor_profile_id=$1`, profileID).Scan(&count)
	return count, err
}

func (r *Repo) ListProfiles(ctx context.Context, input ListInput) ([]Profile, int, error) {
	status := input.Status
	if status == "" {
		status = "pending"
	}
	rows, err := r.pool.Query(ctx, profileSelect()+`
		WHERE ($1 = 'all' OR ip.verification_status = $1)
		ORDER BY ip.updated_at DESC
		LIMIT $2 OFFSET $3`, status, input.Limit, input.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var items []Profile
	for rows.Next() {
		item, err := scanProfile(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM instructor_profiles WHERE ($1 = 'all' OR verification_status = $1)`, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *Repo) VerifyProfile(ctx context.Context, profileID, reviewerID string) (Profile, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Profile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		UPDATE instructor_certifications
		SET verification_status='verified', verified_at=NOW(), verified_by=$2, rejection_reason=NULL, updated_at=NOW()
		WHERE instructor_profile_id=$1 AND verification_status = 'pending'`,
		profileID, reviewerID)
	if err != nil {
		return Profile{}, err
	}
	row := tx.QueryRow(ctx, `
		UPDATE instructor_profiles
		SET verification_status='verified', verified_at=NOW(), verified_by=$2, rejection_reason=NULL, updated_at=NOW()
		WHERE id=$1 AND verification_status <> 'verified'
		RETURNING id`, profileID, reviewerID)
	var id string
	if err := row.Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			profile, getErr := getByIDWithExecutor(ctx, tx, profileID)
			if getErr != nil {
				return Profile{}, getErr
			}
			if profile.VerificationStatus == "verified" {
				return profile, nil
			}
		}
		return Profile{}, err
	}
	profile, err := getByIDWithExecutor(ctx, tx, id)
	if err != nil {
		return Profile{}, err
	}
	if _, err := notificationsrepo.EnqueueOutboxWithExecutor(ctx, tx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventInstructorApplicationApproved,
		AggregateType: "instructor_application",
		AggregateID:   profile.ID,
		Payload: map[string]any{
			"profileId":       profile.ID,
			"applicantUserId": profile.UserID,
			"reviewerUserId":  reviewerID,
			"status":          profile.VerificationStatus,
		},
		IdempotencyKey: "instructors:application:" + profile.ID + ":approved",
	}); err != nil {
		return Profile{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Profile{}, err
	}
	return profile, nil
}

func (r *Repo) RejectProfile(ctx context.Context, profileID, reviewerID, reason string) (Profile, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Profile{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	row := tx.QueryRow(ctx, `
		UPDATE instructor_profiles
		SET verification_status='rejected', verified_at=NULL, verified_by=$2, rejection_reason=$3, updated_at=NOW()
		WHERE id=$1 AND verification_status <> 'rejected'
		RETURNING id`, profileID, reviewerID, reason)
	var id string
	if err := row.Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			profile, getErr := getByIDWithExecutor(ctx, tx, profileID)
			if getErr != nil {
				return Profile{}, getErr
			}
			if profile.VerificationStatus == "rejected" {
				return profile, nil
			}
		}
		return Profile{}, err
	}
	profile, err := getByIDWithExecutor(ctx, tx, id)
	if err != nil {
		return Profile{}, err
	}
	if _, err := notificationsrepo.EnqueueOutboxWithExecutor(ctx, tx, notificationsrepo.OutboxEnqueueInput{
		EventType:     notificationsrepo.OutboxEventInstructorApplicationRejected,
		AggregateType: "instructor_application",
		AggregateID:   profile.ID,
		Payload: map[string]any{
			"profileId":       profile.ID,
			"applicantUserId": profile.UserID,
			"reviewerUserId":  reviewerID,
			"status":          profile.VerificationStatus,
		},
		IdempotencyKey: "instructors:application:" + profile.ID + ":rejected",
	}); err != nil {
		return Profile{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Profile{}, err
	}
	return profile, nil
}

func (r *Repo) SuspendProfile(ctx context.Context, profileID, reviewerID, reason string) (Profile, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE instructor_profiles
		SET verification_status='suspended', verified_by=$2, rejection_reason=NULLIF($3,''), updated_at=NOW()
		WHERE id=$1
		RETURNING id`, profileID, reviewerID, reason)
	var id string
	if err := row.Scan(&id); err != nil {
		return Profile{}, err
	}
	return r.GetByID(ctx, id)
}

func profileSelect() string {
	return `SELECT ip.id, ip.user_id, COALESCE(u.username,''), COALESCE(u.display_name,''), ip.display_name, ip.bio, ip.teaching_since, ip.home_location_label, ip.formatted_address, ip.region_code, ip.region_name, ip.province_code, ip.province_name, ip.city_code, ip.city_name, ip.barangay_code, ip.barangay_name, ip.location_source, ip.specialties, ip.school_affiliation, ip.website_url, ip.social_links, ip.safety_credentials, ip.verification_status, ip.verified_at, COALESCE(ip.verified_by::text,''), COALESCE(ip.rejection_reason,''), ip.attestation_accepted_at, ip.created_at, ip.updated_at FROM instructor_profiles ip JOIN users u ON u.id=ip.user_id`
}

func getByIDWithExecutor(ctx context.Context, exec queryExecutor, profileID string) (Profile, error) {
	row := exec.QueryRow(ctx, profileSelect()+` WHERE ip.id = $1`, profileID)
	return scanProfile(row)
}

func instructorNotificationDisplayName(profile Profile) string {
	if profile.DisplayName != "" {
		return profile.DisplayName
	}
	if profile.UserDisplayName != "" {
		return profile.UserDisplayName
	}
	return profile.Username
}

func certificationSelect() string {
	return `SELECT ` + certificationFields() + ` FROM instructor_certifications`
}

func certificationFields() string {
	return `id, instructor_profile_id, agency, COALESCE(agency_other_name,''), certification_level, COALESCE(certification_number,''), issued_at, expires_at, COALESCE(proof_media_id::text,''), COALESCE(official_verification_url,''), verification_status, verified_at, COALESCE(verified_by::text,''), COALESCE(rejection_reason,''), created_at, updated_at`
}

type scanner interface {
	Scan(dest ...any) error
}

func scanProfile(s scanner) (Profile, error) {
	var item Profile
	err := s.Scan(&item.ID, &item.UserID, &item.Username, &item.UserDisplayName, &item.DisplayName, &item.Bio, &item.TeachingSince, &item.HomeLocationLabel, &item.FormattedAddress, &item.RegionCode, &item.RegionName, &item.ProvinceCode, &item.ProvinceName, &item.CityCode, &item.CityName, &item.BarangayCode, &item.BarangayName, &item.LocationSource, &item.Specialties, &item.SchoolAffiliation, &item.WebsiteURL, &item.SocialLinks, &item.SafetyCredentials, &item.VerificationStatus, &item.VerifiedAt, &item.VerifiedBy, &item.RejectionReason, &item.AttestationAcceptedAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func scanCertification(s scanner) (Certification, error) {
	var item Certification
	err := s.Scan(&item.ID, &item.InstructorProfileID, &item.Agency, &item.AgencyOtherName, &item.CertificationLevel, &item.CertificationNumber, &item.IssuedAt, &item.ExpiresAt, &item.ProofMediaID, &item.OfficialVerificationURL, &item.VerificationStatus, &item.VerifiedAt, &item.VerifiedBy, &item.RejectionReason, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
