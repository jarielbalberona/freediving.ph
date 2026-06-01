package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	confirmEnv        = "CONFIRM_DEV_SEED_MOBILE_ROLE_QA"
	defaultUsersJSON  = "/tmp/fph-clerk-test-users.json"
	qaLabel           = "QA Mobile Parity"
	memberAID         = "41000000-0000-4000-8000-000000000001"
	memberBID         = "41000000-0000-4000-8000-000000000002"
	applicantID       = "41000000-0000-4000-8000-000000000003"
	instructorID      = "41000000-0000-4000-8000-000000000004"
	schoolOwnerID     = "41000000-0000-4000-8000-000000000005"
	eventOrganizerID  = "41000000-0000-4000-8000-000000000006"
	groupOwnerID      = "41000000-0000-4000-8000-000000000007"
	moderatorID       = "41000000-0000-4000-8000-000000000008"
	superAdminID      = "41000000-0000-4000-8000-000000000009"
	targetUserID      = "41000000-0000-4000-8000-000000000010"
	mediaObjectID     = "42000000-0000-4000-8000-000000000001"
	mediaGroupID      = "42000000-0000-4000-8000-000000000002"
	mediaPostID       = "42000000-0000-4000-8000-000000000003"
	mediaItemID       = "42000000-0000-4000-8000-000000000004"
	chikaThreadID     = "43000000-0000-4000-8000-000000000001"
	messageThreadID   = "44000000-0000-4000-8000-000000000001"
	buddyRequestID    = "45000000-0000-4000-8000-000000000001"
	groupID           = "46000000-0000-4000-8000-000000000001"
	groupPostID       = "46000000-0000-4000-8000-000000000002"
	eventID           = "47000000-0000-4000-8000-000000000001"
	eventParticipant  = "47000000-0000-4000-8000-000000000002"
	eventProofMediaID = "47000000-0000-4000-8000-000000000003"
	eventPaymentID    = "47000000-0000-4000-8000-000000000004"
	eventPayMethodID  = "47000000-0000-4000-8000-000000000005"
	schoolID          = "48000000-0000-4000-8000-000000000001"
	courseID          = "48000000-0000-4000-8000-000000000002"
	sessionID         = "48000000-0000-4000-8000-000000000003"
	bookingID         = "48000000-0000-4000-8000-000000000004"
	bookingProofID    = "48000000-0000-4000-8000-000000000005"
	bookingPaymentID  = "48000000-0000-4000-8000-000000000006"
	schoolPayMethodID = "48000000-0000-4000-8000-000000000007"
	applicantProfile  = "49000000-0000-4000-8000-000000000001"
	instructorProfile = "49000000-0000-4000-8000-000000000002"
	applicantCertID   = "49000000-0000-4000-8000-000000000003"
	instructorCertID  = "49000000-0000-4000-8000-000000000004"
	applicantProofID  = "49000000-0000-4000-8000-000000000005"
	instructorProofID = "49000000-0000-4000-8000-000000000006"
	diveUpdateID      = "4a000000-0000-4000-8000-000000000001"
	reportUserID      = "4b000000-0000-4000-8000-000000000001"
	reportThreadID    = "4b000000-0000-4000-8000-000000000002"
	reportUpdateID    = "4b000000-0000-4000-8000-000000000003"
	reportMessageID   = "4b000000-0000-4000-8000-000000000004"
	reportCommentID   = "4b000000-0000-4000-8000-000000000005"
)

type clerkUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Action   string `json:"action"`
}

type qaUser struct {
	Key         string
	ID          string
	Email       string
	Username    string
	DisplayName string
	GlobalRole  string
	ClerkID     string
}

func main() {
	var usersPath string
	var inspectOnly bool
	flag.StringVar(&usersPath, "users-json", defaultUsersJSON, "path to Clerk test user summary JSON")
	flag.BoolVar(&inspectOnly, "inspect", false, "inspect QA mobile role fixture state without changing data")
	flag.Parse()

	if err := loadDotEnv(".env"); err != nil {
		die("load .env: %v", err)
	}

	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		die("DB_DSN is required")
	}
	if err := ensureLocalDevTarget(dsn, strings.TrimSpace(os.Getenv("APP_ENV"))); err != nil {
		die("%v", err)
	}
	if !inspectOnly && os.Getenv(confirmEnv) != "1" {
		die("%s=1 is required to seed mobile role QA fixtures", confirmEnv)
	}

	users, err := loadQAUsers(usersPath)
	if err != nil {
		die("load qa users: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		die("connect db: %v", err)
	}
	defer pool.Close()

	if inspectOnly {
		if err := inspect(ctx, pool, users); err != nil {
			die("inspect: %v", err)
		}
		return
	}

	if err := seed(ctx, pool, users); err != nil {
		die("seed: %v", err)
	}
	if err := inspect(ctx, pool, users); err != nil {
		die("inspect after seed: %v", err)
	}
}

func loadQAUsers(path string) (map[string]qaUser, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var clerkUsers []clerkUser
	if err := json.Unmarshal(data, &clerkUsers); err != nil {
		return nil, err
	}
	byEmail := make(map[string]clerkUser, len(clerkUsers))
	for _, user := range clerkUsers {
		byEmail[strings.ToLower(strings.TrimSpace(user.Email))] = user
	}

	specs := []qaUser{
		{Key: "memberA", ID: memberAID, Email: "fph-member-a+clerk_test@clerk.com", Username: "fph_member_a", DisplayName: qaLabel + " Member A", GlobalRole: "member"},
		{Key: "memberB", ID: memberBID, Email: "fph-member-b+clerk_test@clerk.com", Username: "fph_member_b", DisplayName: qaLabel + " Member B", GlobalRole: "member"},
		{Key: "instructorApplicant", ID: applicantID, Email: "fph-instructor-applicant+clerk_test@clerk.com", Username: "fph_instructor_applicant", DisplayName: qaLabel + " Instructor Applicant", GlobalRole: "member"},
		{Key: "approvedInstructor", ID: instructorID, Email: "fph-approved-instructor+clerk_test@clerk.com", Username: "fph_approved_instructor", DisplayName: qaLabel + " Approved Instructor", GlobalRole: "member"},
		{Key: "schoolOwner", ID: schoolOwnerID, Email: "fph-school-owner+clerk_test@clerk.com", Username: "fph_school_owner", DisplayName: qaLabel + " School Owner", GlobalRole: "member"},
		{Key: "eventOrganizer", ID: eventOrganizerID, Email: "fph-event-organizer+clerk_test@clerk.com", Username: "fph_event_organizer", DisplayName: qaLabel + " Event Organizer", GlobalRole: "member"},
		{Key: "groupOwner", ID: groupOwnerID, Email: "fph-group-owner+clerk_test@clerk.com", Username: "fph_group_owner", DisplayName: qaLabel + " Group Owner", GlobalRole: "member"},
		{Key: "moderator", ID: moderatorID, Email: "fph-moderator+clerk_test@clerk.com", Username: "fph_moderator", DisplayName: qaLabel + " Moderator", GlobalRole: "moderator"},
		{Key: "superAdmin", ID: superAdminID, Email: "fph-super-admin+clerk_test@clerk.com", Username: "fph_super_admin", DisplayName: qaLabel + " Super Admin", GlobalRole: "super_admin"},
		{Key: "targetUser", ID: targetUserID, Email: "fph-target-user+clerk_test@clerk.com", Username: "fph_target_user", DisplayName: qaLabel + " Target User", GlobalRole: "member"},
	}

	result := make(map[string]qaUser, len(specs))
	for _, spec := range specs {
		clerk, ok := byEmail[strings.ToLower(spec.Email)]
		if !ok || strings.TrimSpace(clerk.ID) == "" {
			return nil, fmt.Errorf("missing Clerk user for %s", spec.Email)
		}
		spec.ClerkID = strings.TrimSpace(clerk.ID)
		result[spec.Key] = spec
	}
	return result, nil
}

func seed(ctx context.Context, pool *pgxpool.Pool, users map[string]qaUser) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := seedUsers(ctx, tx, users); err != nil {
		return err
	}
	if err := seedSocial(ctx, tx, users); err != nil {
		return err
	}
	if err := seedGroups(ctx, tx, users); err != nil {
		return err
	}
	if err := seedEvents(ctx, tx, users); err != nil {
		return err
	}
	if err := seedSchools(ctx, tx, users); err != nil {
		return err
	}
	if err := seedInstructors(ctx, tx, users); err != nil {
		return err
	}
	if err := seedReports(ctx, tx, users); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func seedUsers(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	keys := make([]string, 0, len(users))
	for key := range users {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		user := users[key]
		if _, err := tx.Exec(ctx, `
			INSERT INTO users (id, username, display_name, auth_provider, auth_provider_user_id, global_role, account_status, email_verified, phone_verified)
			VALUES ($1, $2, $3, 'clerk', $4, $5, 'active', true, false)
			ON CONFLICT (auth_provider, auth_provider_user_id)
			DO UPDATE SET
				username = EXCLUDED.username,
				display_name = EXCLUDED.display_name,
				global_role = EXCLUDED.global_role,
				account_status = 'active',
				email_verified = true
		`, user.ID, user.Username, user.DisplayName, user.ClerkID, user.GlobalRole); err != nil {
			return fmt.Errorf("upsert user %s: %w", user.Email, err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO profiles (user_id, bio, home_area, interests, cert_level)
			VALUES ($1, $2, 'Anilao QA', ARRAY['qa-mobile-parity'], 'QA')
			ON CONFLICT (user_id)
			DO UPDATE SET
				bio = EXCLUDED.bio,
				home_area = EXCLUDED.home_area,
				interests = EXCLUDED.interests,
				cert_level = EXCLUDED.cert_level,
				updated_at = now()
		`, user.ID, user.DisplayName+" local test profile."); err != nil {
			return fmt.Errorf("upsert profile %s: %w", user.Email, err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_permission_overrides (user_id, overrides)
			VALUES ($1, '{}'::jsonb)
			ON CONFLICT (user_id) DO NOTHING
		`, user.ID); err != nil {
			return fmt.Errorf("upsert overrides %s: %w", user.Email, err)
		}
	}
	return nil
}

func seedSocial(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	memberA := users["memberA"].ID
	memberB := users["memberB"].ID
	target := users["targetUser"].ID
	diveSiteID := "10000000-0000-0000-0000-000000000002"
	chikaCategoryID := "44e81403-f930-428f-95a3-f5828089fbee"

	if _, err := tx.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'profile_feed', 'qa-mobile-parity/member-a-proof.jpg', 'image/jpeg', 1024, 1200, 900, 'active')
		ON CONFLICT (id) DO UPDATE SET owner_app_user_id = EXCLUDED.owner_app_user_id, object_key = EXCLUDED.object_key, state = 'active'
	`, mediaObjectID, memberA); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_upload_groups (id, author_app_user_id, source, item_count)
		VALUES ($1, $2, 'create_post', 1)
		ON CONFLICT (id) DO UPDATE SET author_app_user_id = EXCLUDED.author_app_user_id, item_count = 1
	`, mediaGroupID, memberA); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_posts (id, author_app_user_id, upload_group_id, dive_site_id, post_caption, deleted_at)
		VALUES ($1, $2, $3, $4, $5, NULL)
		ON CONFLICT (id) DO UPDATE SET post_caption = EXCLUDED.post_caption, deleted_at = NULL, updated_at = now()
	`, mediaPostID, memberA, mediaGroupID, diveSiteID, qaLabel+" media post owned by member A."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_items (id, post_id, media_object_id, author_app_user_id, upload_group_id, dive_site_id, type, storage_key, mime_type, width, height, caption, status, provider, processing_status, moderation_status, ready_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'photo', 'qa-mobile-parity/member-a-proof.jpg', 'image/jpeg', 1200, 900, $7, 'active', 'r2', 'ready', 'approved', now())
		ON CONFLICT (id) DO UPDATE SET caption = EXCLUDED.caption, status = 'active', processing_status = 'ready', moderation_status = 'approved', deleted_at = NULL
	`, mediaItemID, mediaPostID, mediaObjectID, memberA, mediaGroupID, diveSiteID, qaLabel+" media item."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_post_comments (media_post_id, author_user_id, body)
		SELECT $1, $2, $3
		WHERE NOT EXISTS (
			SELECT 1 FROM media_post_comments WHERE media_post_id = $1 AND author_user_id = $2 AND body = $3 AND deleted_at IS NULL
		)
	`, mediaPostID, memberB, qaLabel+" seeded media comment from member B."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO chika_threads (id, title, mode, created_by_user_id, category_id, slug, deleted_at, hidden_at)
		VALUES ($1, $2, 'normal', $3, $4, 'qa-mobile-parity-thread', NULL, NULL)
		ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, deleted_at = NULL, hidden_at = NULL, updated_at = now()
	`, chikaThreadID, qaLabel+" Chika Thread", memberA, chikaCategoryID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO chika_comments (thread_id, author_user_id, pseudonym, content)
		SELECT $1, $2, 'QA Diver', $3
		WHERE NOT EXISTS (
			SELECT 1 FROM chika_comments WHERE thread_id = $1 AND author_user_id = $2 AND content = $3 AND deleted_at IS NULL
		)
	`, chikaThreadID, memberB, qaLabel+" seeded Chika reply from member B."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO buddy_requests (id, requester_app_user_id, target_app_user_id, status)
		VALUES ($1, $2, $3, 'pending')
		ON CONFLICT (id) DO UPDATE SET requester_app_user_id = EXCLUDED.requester_app_user_id, target_app_user_id = EXCLUDED.target_app_user_id, status = 'pending', updated_at = now()
	`, buddyRequestID, memberA, memberB); err != nil {
		return err
	}
	low, high := memberA, memberB
	if low > high {
		low, high = high, low
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO message_threads (id, created_by_user_id, direct_user_low, direct_user_high)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (type, direct_user_low, direct_user_high)
		DO UPDATE SET updated_at = now(), last_message_at = now()
	`, messageThreadID, memberA, low, high); err != nil {
		return err
	}
	for _, userID := range []string{memberA, memberB} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO message_thread_members (thread_id, user_id, inbox_category)
			VALUES ($1, $2, 'primary')
			ON CONFLICT (thread_id, user_id) DO UPDATE SET left_at = NULL, inbox_category = 'primary'
		`, messageThreadID, userID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO thread_messages (thread_id, sender_user_id, client_id, body)
		VALUES ($1, $2, 'qa-mobile-parity-seeded-message', $3)
		ON CONFLICT (thread_id, sender_user_id, client_id) WHERE client_id IS NOT NULL DO NOTHING
	`, messageThreadID, memberA, qaLabel+" seeded message from member A."); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `DELETE FROM user_blocks WHERE blocker_app_user_id = $1 AND blocked_app_user_id = $2`, memberA, target)
	return err
}

func seedGroups(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	owner := users["groupOwner"].ID
	memberA := users["memberA"].ID
	if _, err := tx.Exec(ctx, `
		INSERT INTO groups (id, name, slug, description, visibility, status, join_policy, location, member_count, post_count, created_by)
		VALUES ($1, $2, 'qa-mobile-parity-group', $3, 'public', 'active', 'open', 'Anilao QA', 2, 1, $4)
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = 'active', member_count = 2, post_count = 1, updated_at = now()
	`, groupID, qaLabel+" Group", qaLabel+" disposable group for mobile parity QA.", owner); err != nil {
		return err
	}
	for _, member := range []struct {
		userID string
		role   string
	}{{owner, "owner"}, {memberA, "member"}} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO group_memberships (group_id, user_id, role, status)
			VALUES ($1, $2, $3, 'active')
			ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now()
		`, groupID, member.userID, member.role); err != nil {
			return err
		}
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO group_posts (id, group_id, author_user_id, title, content, status)
		VALUES ($1, $2, $3, $4, $5, 'active')
		ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, status = 'active', deleted_at = NULL, updated_at = now()
	`, groupPostID, groupID, owner, qaLabel+" Group Post", qaLabel+" seeded group post.")
	return err
}

func seedEvents(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	organizer := users["eventOrganizer"].ID
	memberA := users["memberA"].ID
	if _, err := tx.Exec(ctx, `
		INSERT INTO events (id, title, slug, description, location, starts_at, ends_at, status, visibility, event_type, difficulty, current_attendees, organizer_user_id, short_description, description_markdown, timezone, capacity, requires_approval, is_paid, price_amount, currency, payment_instructions, beginner_friendly, published_at, payment_mode, payment_enabled)
		VALUES ($1, $2, 'qa-mobile-parity-event', $3, 'Anilao QA', now() + interval '14 days', now() + interval '14 days 4 hours', 'published', 'public', 'fun_dive', 'beginner', 1, $4, $5, $3, 'Asia/Manila', 12, false, true, 500.00, 'PHP', 'QA Mobile Parity payment instructions.', true, now(), 'required', true)
		ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = 'published', organizer_user_id = EXCLUDED.organizer_user_id, payment_enabled = true, payment_mode = 'required', updated_at = now()
	`, eventID, qaLabel+" Event", qaLabel+" disposable event for mobile parity QA.", organizer, qaLabel+" event."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_participations (id, event_id, user_id, role, status, participant_note, emergency_contact_name, emergency_contact_phone)
		VALUES ($1, $2, $3, 'participant', 'confirmed', $4, 'QA Contact', '+639170000000')
		ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed', role = 'participant', updated_at = now()
	`, eventParticipant, eventID, memberA, qaLabel+" participant."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_memberships (event_id, user_id, role, status, joined_at)
		VALUES ($1, $2, 'organizer', 'active', now())
		ON CONFLICT (event_id, user_id) DO UPDATE SET role = 'organizer', status = 'active', updated_at = now()
	`, eventID, organizer); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_payment_methods (id, event_id, type, name, instructions, bank_name, account_name, account_number, is_active)
		VALUES ($1, $2, 'bank_transfer', 'QA Mobile Parity Event Bank', 'Disposable event payment method for mobile parity QA.', 'QA Bank', 'QA Mobile Parity Event', '0000000000', true)
		ON CONFLICT (id) DO UPDATE SET is_active = true, updated_at = now()
	`, eventPayMethodID, eventID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'event_attachment', 'qa-mobile-parity/event-payment-proof.jpg', 'image/jpeg', 2048, 1000, 700, 'active')
		ON CONFLICT (id) DO UPDATE SET owner_app_user_id = EXCLUDED.owner_app_user_id, state = 'active'
	`, eventProofMediaID, memberA); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO event_participant_payments (id, event_id, event_participation_id, user_id, amount, currency, payment_method_id, proof_media_id, reference_number, status)
		VALUES ($1, $2, $3, $4, 500.00, 'PHP', $5, $6, 'QA-EVENT-REF', 'submitted')
		ON CONFLICT (event_participation_id) DO UPDATE SET payment_method_id = EXCLUDED.payment_method_id, proof_media_id = EXCLUDED.proof_media_id, reference_number = EXCLUDED.reference_number, status = 'submitted', updated_at = now()
	`, eventPaymentID, eventID, eventParticipant, memberA, eventPayMethodID, eventProofMediaID)
	return err
}

func seedSchools(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	owner := users["schoolOwner"].ID
	instructor := users["approvedInstructor"].ID
	memberA := users["memberA"].ID
	if _, err := tx.Exec(ctx, `
		INSERT INTO schools (id, slug, name, short_description, description_markdown, base_location, contact_email, status, owner_user_id, location_source)
		VALUES ($1, 'qa-mobile-parity-school', $2, $3, $4, 'Anilao QA', 'qa-mobile-parity-school@example.test', 'published', $5, 'manual')
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'published', owner_user_id = EXCLUDED.owner_user_id, updated_at = now()
	`, schoolID, qaLabel+" School", qaLabel+" school.", qaLabel+" disposable school for mobile parity QA.", owner); err != nil {
		return err
	}
	for _, member := range []struct {
		userID string
		role   string
	}{{owner, "owner"}, {instructor, "instructor"}} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO school_members (school_id, user_id, role, status)
			VALUES ($1, $2, $3, 'active')
			ON CONFLICT (school_id, user_id) WHERE deleted_at IS NULL DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now()
		`, schoolID, member.userID, member.role); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO courses (id, school_id, slug, title, short_description, description_markdown, course_type, level, duration_label, price_amount, currency, payment_required, approval_required, location_label, status, location_mode, allow_session_booking)
		VALUES ($1, $2, 'qa-mobile-parity-course', $3, $4, $5, 'intro', 'beginner', '1 day', 1200.00, 'PHP', true, true, 'Anilao QA', 'published', 'inherit_school', true)
		ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = 'published', payment_required = true, updated_at = now()
	`, courseID, schoolID, qaLabel+" Course", qaLabel+" course.", qaLabel+" disposable course for mobile parity QA."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO school_payment_methods (id, school_id, type, name, instructions, bank_name, account_name, account_number, is_active)
		VALUES ($1, $2, 'bank_transfer', 'QA Mobile Parity School Bank', 'Disposable school payment method for mobile parity QA.', 'QA Bank', 'QA Mobile Parity School', '1111111111', true)
		ON CONFLICT (id) DO UPDATE SET is_active = true, deleted_at = NULL, updated_at = now()
	`, schoolPayMethodID, schoolID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO course_sessions (id, school_id, course_id, slug, title, starts_at, ends_at, location_label, instructor_user_id, capacity, status, notes_markdown, location_mode)
		VALUES ($1, $2, $3, 'qa-mobile-parity-session', $4, now() + interval '21 days', now() + interval '21 days 6 hours', 'Anilao QA', $5, 8, 'scheduled', $6, 'inherit_course')
		ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = 'scheduled', instructor_user_id = EXCLUDED.instructor_user_id, updated_at = now()
	`, sessionID, schoolID, courseID, qaLabel+" Session", instructor, qaLabel+" session."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO course_booking_requests (id, course_id, school_id, session_id, student_user_id, student_name, student_email, status, student_note, experience_level, answers_json, booking_mode)
		VALUES ($1, $2, $3, $4, $5, $6, 'fph-member-a+clerk_test@clerk.com', 'pending_review', $7, 'beginner', '{}'::jsonb, 'session')
		ON CONFLICT (id) DO UPDATE SET status = 'pending_review', student_user_id = EXCLUDED.student_user_id, updated_at = now()
	`, bookingID, courseID, schoolID, sessionID, memberA, qaLabel+" Member A", qaLabel+" booking."); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
		VALUES ($1, $2, 'course_booking_receipt', 'qa-mobile-parity/course-booking-proof.jpg', 'image/jpeg', 2048, 1000, 700, 'active')
		ON CONFLICT (id) DO UPDATE SET owner_app_user_id = EXCLUDED.owner_app_user_id, state = 'active'
	`, bookingProofID, memberA); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO course_booking_payments (id, booking_id, course_id, school_id, student_user_id, amount, currency, payment_method_id, proof_media_id, reference_number, status)
		VALUES ($1, $2, $3, $4, $5, 1200.00, 'PHP', $6, $7, 'QA-COURSE-REF', 'submitted')
		ON CONFLICT (booking_id) DO UPDATE SET payment_method_id = EXCLUDED.payment_method_id, proof_media_id = EXCLUDED.proof_media_id, reference_number = EXCLUDED.reference_number, status = 'submitted', updated_at = now()
	`, bookingPaymentID, bookingID, courseID, schoolID, memberA, schoolPayMethodID, bookingProofID)
	return err
}

func seedInstructors(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	applicant := users["instructorApplicant"].ID
	instructor := users["approvedInstructor"].ID
	moderator := users["moderator"].ID
	profiles := []struct {
		id       string
		userID   string
		name     string
		status   string
		verifier any
		verified any
	}{
		{applicantProfile, applicant, qaLabel + " Instructor Applicant", "pending", nil, nil},
		{instructorProfile, instructor, qaLabel + " Approved Instructor", "verified", moderator, time.Now()},
	}
	for _, profile := range profiles {
		if _, err := tx.Exec(ctx, `
			INSERT INTO instructor_profiles (id, user_id, display_name, bio, home_location_label, verification_status, verified_at, verified_by, specialties, school_affiliation, safety_credentials, attestation_accepted_at, location_source)
			VALUES ($1, $2, $3, $4, 'Anilao QA', $5, $6, $7, 'QA line training', 'QA Mobile Parity School', 'QA safety credentials', now(), 'manual')
			ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio, verification_status = EXCLUDED.verification_status, verified_at = EXCLUDED.verified_at, verified_by = EXCLUDED.verified_by, updated_at = now()
		`, profile.id, profile.userID, profile.name, profile.name+" local test instructor profile.", profile.status, profile.verified, profile.verifier); err != nil {
			return err
		}
	}
	certs := []struct {
		id        string
		profileID string
		ownerID   string
		proofID   string
		level     string
		status    string
		verifier  any
		verified  any
	}{
		{applicantCertID, applicantProfile, applicant, applicantProofID, qaLabel + " Applicant Certification", "pending", nil, nil},
		{instructorCertID, instructorProfile, instructor, instructorProofID, qaLabel + " Approved Certification", "verified", moderator, time.Now()},
	}
	for _, cert := range certs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO media_objects (id, owner_app_user_id, context_type, object_key, mime_type, size_bytes, width, height, state)
			VALUES ($1, $2, 'instructor_certification_proof', $3, 'image/jpeg', 2048, 1000, 700, 'active')
			ON CONFLICT (id) DO UPDATE SET owner_app_user_id = EXCLUDED.owner_app_user_id, state = 'active'
		`, cert.proofID, cert.ownerID, "qa-mobile-parity/instructor-proof-"+cert.id+".jpg"); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO instructor_certifications (id, instructor_profile_id, agency, certification_level, certification_number, proof_media_id, verification_status, verified_at, verified_by, official_verification_url)
			VALUES ($1, $2, 'other', $3, 'QA-MOBILE-PARITY', $4, $5, $6, $7, 'https://example.test/qa-mobile-parity-cert')
			ON CONFLICT (id) DO UPDATE SET certification_level = EXCLUDED.certification_level, proof_media_id = EXCLUDED.proof_media_id, verification_status = EXCLUDED.verification_status, verified_at = EXCLUDED.verified_at, verified_by = EXCLUDED.verified_by, updated_at = now()
		`, cert.id, cert.profileID, cert.level, cert.proofID, cert.status, cert.verified, cert.verifier); err != nil {
			return err
		}
	}
	return nil
}

func seedReports(ctx context.Context, tx pgx.Tx, users map[string]qaUser) error {
	memberA := users["memberA"].ID
	target := users["targetUser"].ID
	if _, err := tx.Exec(ctx, `
		INSERT INTO dive_site_updates (id, dive_site_id, author_app_user_id, note, condition_visibility_m, condition_current, condition_waves, occurred_at, state)
		VALUES ($1, '10000000-0000-0000-0000-000000000002', $2, $3, 12, 'mild', 'calm', now(), 'active')
		ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note, state = 'active'
	`, diveUpdateID, memberA, qaLabel+" dive-site update."); err != nil {
		return err
	}
	var commentID int64
	if err := tx.QueryRow(ctx, `
		SELECT id FROM chika_comments
		WHERE thread_id = $1 AND content = $2 AND deleted_at IS NULL
		ORDER BY created_at DESC LIMIT 1
	`, chikaThreadID, qaLabel+" seeded Chika reply from member B.").Scan(&commentID); err != nil {
		return err
	}
	var messageID int64
	if err := tx.QueryRow(ctx, `
		SELECT id FROM thread_messages
		WHERE thread_id = $1 AND client_id = 'qa-mobile-parity-seeded-message'
		LIMIT 1
	`, messageThreadID).Scan(&messageID); err != nil {
		return err
	}
	reports := []struct {
		id            string
		targetType    string
		targetUUID    any
		targetBigint  any
		targetAppUser any
		reason        string
	}{
		{reportUserID, "user", target, nil, target, "spam"},
		{reportThreadID, "chika_thread", chikaThreadID, nil, memberA, "other"},
		{reportUpdateID, "dive_site_update", diveUpdateID, nil, memberA, "unsafe"},
		{reportMessageID, "message", nil, messageID, memberA, "harassment"},
		{reportCommentID, "chika_comment", nil, commentID, users["memberB"].ID, "other"},
	}
	for _, report := range reports {
		if _, err := tx.Exec(ctx, `
			INSERT INTO reports (id, reporter_app_user_id, target_type, target_uuid, target_bigint, target_app_user_id, reason_code, details, evidence_urls, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, 'open')
			ON CONFLICT (id) DO UPDATE SET status = 'open', details = EXCLUDED.details, updated_at = now()
		`, report.id, memberA, report.targetType, report.targetUUID, report.targetBigint, report.targetAppUser, report.reason, qaLabel+" disposable report for "+report.targetType); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO report_events (report_id, actor_app_user_id, event_type, to_status, note)
			SELECT $1, $2, 'created', 'open', $3
			WHERE NOT EXISTS (SELECT 1 FROM report_events WHERE report_id = $1 AND event_type = 'created')
		`, report.id, memberA, qaLabel+" report created."); err != nil {
			return err
		}
	}
	return nil
}

func inspect(ctx context.Context, pool *pgxpool.Pool, users map[string]qaUser) error {
	fmt.Println("Mobile role QA local DB target accepted.")
	keys := make([]string, 0, len(users))
	for key := range users {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		user := users[key]
		var dbID, username, role, status string
		if err := pool.QueryRow(ctx, `
			SELECT id::text, username, global_role, account_status
			FROM users
			WHERE auth_provider = 'clerk' AND auth_provider_user_id = $1
		`, user.ClerkID).Scan(&dbID, &username, &role, &status); err != nil {
			return fmt.Errorf("inspect user %s: %w", user.Email, err)
		}
		fmt.Printf("user.%s=%s username=%s role=%s status=%s clerk=%s\n", key, dbID, username, role, status, user.ClerkID)
	}
	counts := map[string]string{
		"media_posts":             "SELECT COUNT(*) FROM media_posts WHERE post_caption LIKE 'QA Mobile Parity%'",
		"chika_threads":           "SELECT COUNT(*) FROM chika_threads WHERE title LIKE 'QA Mobile Parity%'",
		"buddy_requests":          "SELECT COUNT(*) FROM buddy_requests WHERE id = '" + buddyRequestID + "'",
		"message_threads":         "SELECT COUNT(*) FROM message_threads WHERE id = '" + messageThreadID + "'",
		"groups":                  "SELECT COUNT(*) FROM groups WHERE slug = 'qa-mobile-parity-group'",
		"events":                  "SELECT COUNT(*) FROM events WHERE slug = 'qa-mobile-parity-event'",
		"schools":                 "SELECT COUNT(*) FROM schools WHERE slug = 'qa-mobile-parity-school'",
		"course_booking_requests": "SELECT COUNT(*) FROM course_booking_requests WHERE id = '" + bookingID + "'",
		"instructor_profiles":     "SELECT COUNT(*) FROM instructor_profiles WHERE display_name LIKE 'QA Mobile Parity%'",
		"reports":                 "SELECT COUNT(*) FROM reports WHERE details LIKE 'QA Mobile Parity%'",
	}
	names := make([]string, 0, len(counts))
	for name := range counts {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		var count int64
		if err := pool.QueryRow(ctx, counts[name]).Scan(&count); err != nil {
			return err
		}
		fmt.Printf("count.%s=%d\n", name, count)
	}
	return nil
}

func loadDotEnv(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	data, err := os.ReadFile(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if key == "" {
			continue
		}
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
	return nil
}

func ensureLocalDevTarget(dsn string, appEnv string) error {
	env := strings.ToLower(strings.TrimSpace(appEnv))
	if env == "production" || env == "prod" {
		return fmt.Errorf("refusing to run with APP_ENV=%q", appEnv)
	}
	parsed, err := url.Parse(dsn)
	if err != nil {
		return fmt.Errorf("invalid DB_DSN: %w", err)
	}
	host := strings.ToLower(parsed.Hostname())
	dbName := strings.TrimPrefix(parsed.Path, "/")
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return fmt.Errorf("refusing non-local DB host %q", host)
	}
	if strings.Contains(strings.ToLower(dbName), "prod") || strings.Contains(strings.ToLower(dbName), "production") {
		return fmt.Errorf("refusing production-looking database name %q", dbName)
	}
	productionMarkers := []string{"render.com", "amazonaws.com", "neon.tech", "supabase", "railway", "freediving-ph-db"}
	lowerDSN := strings.ToLower(dsn)
	for _, marker := range productionMarkers {
		if strings.Contains(lowerDSN, marker) {
			return fmt.Errorf("refusing production-looking DB_DSN containing %q", marker)
		}
	}
	return nil
}

func die(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
