# Profiles Spec

## A) Purpose and Non-Goals
### Purpose
Profiles provide each member's social identity with explicit field-level visibility and coarse location defaults.

### Non-goals (MVP)
- No diving log computation logic.
- No ranking/recommendation engine.
- No advanced media gallery management.

## B) User Stories
### MVP
- As a member, I can view another member profile according to their privacy settings.
- As a member, I can edit my profile fields and set visibility per field.
- As a member, I can upload or replace avatar and cover media placeholders.
- As a member, I can set coarse location (city/region).
- As a member, I can set basic personal best placeholders.

### Later
- Profile completeness scoring.
- Highlighted achievements and endorsements.
- Rich activity timeline personalization.

## C) Data Model Draft
| Table | Key columns | Relations | Indexes and constraints |
|---|---|---|---|
| `profiles` | `id (pk)`, `user_id (uniq fk app_users.id)`, `username (uniq)`, `display_name`, `bio`, `coarse_location_city`, `coarse_location_region`, `avatar_media_id`, `cover_media_id`, `created_at`, `updated_at`, `deleted_at` | `profiles.user_id -> app_users.id` | unique(`user_id`), unique(`username`), index(`coarse_location_region`), index(`deleted_at`) |
| `profile_visibility_settings` | `profile_id (pk fk)`, `display_name_visibility`, `bio_visibility`, `location_visibility`, `pb_visibility`, `avatar_visibility`, `cover_visibility`, `updated_at` | `profile_visibility_settings.profile_id -> profiles.id` | pk(`profile_id`) |
| `profile_stats` | `profile_id (pk fk)`, `max_depth_m`, `max_bottom_time_sec`, `best_discipline`, `stats_updated_at` | `profile_stats.profile_id -> profiles.id` | pk(`profile_id`) |
| `media_assets` (placeholder) | `id (pk)`, `owner_user_id`, `kind`, `storage_key`, `mime_type`, `size_bytes`, `status`, `created_at` | referenced by `profiles.avatar_media_id`, `profiles.cover_media_id` | index(`owner_user_id`), unique(`storage_key`) |

Visibility enum: `public | members_only | private`.

## D) API Contract Draft
| Method | Route | Purpose | Authz checks | Pagination |
|---|---|---|---|---|
| `GET` | `/v1/social/profiles/:username` | Read profile with visibility filtering | anonymous allowed, field filtering by actor and block status | none |
| `PATCH` | `/v1/social/profiles/me` | Update owner profile fields | authenticated owner only | none |
| `GET` | `/v1/social/profiles/me` | Read full own profile | authenticated owner | none |
| `PUT` | `/v1/social/profiles/me/visibility` | Update field-level visibility | authenticated owner only | none |
| `PUT` | `/v1/social/profiles/me/media` | Set avatar/cover media IDs | authenticated owner and media ownership check | none |
| `DELETE` | `/v1/social/profiles/me` | Soft delete + anonymization workflow trigger | authenticated owner, re-auth required | none |

Payload notes:
- Profile read response contains only fields allowed by visibility policy.
- Coarse location is returned as configured city/region only.
- Deletion response returns job token for anonymization progress polling.

## E) UI Flows
- Profile view screen: public fields, members-only lock states, private field omitted.
- Profile edit screen: per-field visibility selectors with inline policy hints.
- Media upload state: uploading, success, invalid type/size, failed upload retry.
- Empty states: no bio, no stats, no avatar.
- Error cases: blocked actor cannot view profile details, username not found, suspended account write denied.

## F) Abuse and Safety Considerations
- Blocked users cannot view members-only profile fields.
- Username change cooldown: 30 days.
- Profile update rate limit to prevent profile spam and scraping triggers.
- Media placeholders must enforce content and file-size constraints.
- Soft-deleted profiles are hidden from normal discovery immediately.

## G) Acceptance Criteria
- Public actor can only see fields configured as `public`.
- Authenticated member can see `members_only` fields unless blocked by either side.
- Private fields are visible only to owner and authorized moderators/admin.
- Profile responses never include precise coordinates.
- Soft-deleted profile no longer appears in search and mentions.
- Anonymization replaces direct identifiers after retention window policy.
