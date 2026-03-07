# Freediving Philippines (FPH) Feature Specification

Version: 1.1
Status: Working source of truth (updated for pseudonymous Chika + future modules placeholders)

## 0) Product Intent

FPH is a social platform for the freediving community in the Philippines with diving-specific discovery and community tooling:

- Social: profiles, messaging, buddies, groups, forums (Chika)
- Diving: explore dive sites, buddy finder, events, competitive records
- Future: training logs, safety resources, ocean awareness, marketplace, collaboration hub

This doc defines:

- Features and sub-features
- Rules and boundaries (what is allowed, what is not)
- RBAC and permission model
- Moderation and safety requirements

---

## 1) Core Entities (Data Model Vocabulary)

These are the primary objects referenced by rules and permissions.

### 1.1 User and Identity

- **User**
  - id
  - email (optional if social login)
  - auth provider id
  - status: active | suspended | deleted
  - role: see RBAC

- **Profile**
  - userId
  - displayName
  - username (unique)
  - avatarUrl
  - bio
  - location (coarse, optional)
  - homeDiveArea (optional)
  - experienceLevel (optional, self-declared)
  - visibility: public | members_only
  - buddyFinderVisibility: visible | hidden

- **PersonalBest** (PB)
  - id
  - userId
  - discipline (STA, DYN, CWT, etc)
  - resultValue + unit
  - recordedAt (optional)
  - visibility: public | members_only | private

- **ProfileActivityItem** (Profile Feed item)
  - id
  - userId
  - type:
    - new_pb
    - joined_group
    - created_event
    - posted_chika_thread
    - posted_chika_reply
    - submitted_dive_site
    - verified_record
    - training_log_public_share
  - targetType + targetId
  - visibility: public | members_only

Notes:

- Activity feed is event-based. It only shows items with explicit visibility.
- Keep it minimal first. Avoid “everything is an activity” spam.

### 1.2 Social

- **Conversation**
  - id
  - type: direct
  - participants: [userId, userId]
  - createdAt, updatedAt

- **Message**
  - id
  - conversationId
  - senderId
  - body
  - attachments (optional)
  - createdAt
  - status: sent | deleted_by_sender | removed_by_moderator

- **BuddyRelationship**
  - userIdA, userIdB
  - state: active | blocked

- **BuddyRequest**
  - fromUserId, toUserId
  - state: pending | accepted | rejected | canceled | expired

- **Block**
  - blockerUserId, blockedUserId
  - scope: platform | messaging_only

### 1.3 Community

- **Group**
  - id
  - name
  - description
  - visibility: public | members_only | private
  - joinPolicy: open | request | invite_only
  - createdBy

- **GroupMembership**
  - groupId
  - userId
  - role: owner | moderator | member
  - state: active | pending | banned

### 1.4 Chika (Forums)

Chika is a thread-based discussion area with a pseudonymous mode.

- **ForumCategory**
  - id
  - name
  - visibility: public | members_only
  - mode: normal | pseudonymous_chika

- **Thread**
  - id
  - categoryId
  - title
  - createdByUserId
  - state: open | locked | removed

- **Post**
  - id
  - threadId
  - createdByUserId
  - body
  - state: visible | edited | removed

- **ChikaPseudonym**
  - id
  - threadId
  - userId
  - displayHandle (generated, not user-chosen by default)
  - createdAt

Key property:

- Users appear publicly as a pseudonym per thread in pseudonymous categories.
- Moderators and admins can still see the real userId.

### 1.5 Diving-Specific

- **DiveSite**
  - id
  - name
  - location (coarse geodata)
  - description
  - tags (reef, wall, training, etc)
  - visibility: public | members_only
  - source: curated | community
  - state: draft | published | flagged | removed

- **Event**
  - id
  - title
  - startAt, endAt
  - location (coarse)
  - organizerUserId (optional)
  - visibility: public | members_only
  - state: draft | published | canceled | removed

- **CompetitiveRecord**
  - id
  - athleteName (or userId if linked)
  - discipline (STA, DYN, CWT, etc)
  - resultValue + unit
  - recordType: personal_best | national_record | competition_result (optional)
  - eventName
  - eventDate
  - sourceUrl (optional)
  - verificationState: unverified | verified | rejected
  - state: visible | removed

---

## 2) RBAC and Permissions

### 2.1 Platform Roles (Global)

- **guest**
  - Not logged in
- **member**
  - Logged in, normal user
- **moderator**
  - Platform-wide content moderation privileges
- **admin**
  - Full control, including RBAC assignment, system settings

Optional future scoped roles (placeholders):

- **safety_editor** (curate safety content)
- **marketplace_moderator** (handle listing reports, scam prevention)
- **records_verifier** (verify competitive records at scale)

### 2.2 Scoped Roles (Per-Resource)

- **Group role**
  - owner | moderator | member

### 2.3 Permission Matrix (Summary)

Legend: R = read, C = create, U = update, D = delete, M = moderate

#### Profiles, PBs, Activity Feed

- guest: R(public only)
- member: R + U(own profile) + C/U/D(own PBs) + control feed visibility for own events
- moderator: M(remove profile fields if policy violation)
- admin: all

#### Messaging

- guest: none
- member: R/C (within rules) + U/D (own messages only, within time window)
- moderator: M(remove messages, investigate reports)
- admin: all

#### Buddy System

- guest: none
- member: C(request) + U(cancel) + U(accept/reject incoming) + D(remove buddy)
- moderator/admin: M(on abuse)

#### Groups

- guest: R(public groups and content, if enabled)
- member: C(group) + join/request + U/D(own group if owner)
- group moderator: M(group content and membership)
- platform moderator/admin: override M

#### Chika (Forums)

- guest: R(public categories)
- member: C(thread/post) + U/D(own content within rules)
- moderator/admin: M(lock/remove, view user identity behind pseudonyms)

#### Dive Sites

- guest: R(public)
- member: C(submit community sites, suggest edits if enabled)
- moderator/admin: M(review/publish/remove)

#### Events

- guest: R(public)
- member: C(event) + U/D(own draft or own event within rules)
- moderator/admin: M(remove, cancel for abuse)

#### Competitive Records

- guest: R(public)
- member: C(submit record) if enabled
- moderator/admin: M(verify/reject/remove)

---

## 3) Global Rules and Boundaries

### 3.1 Privacy Defaults

- Profiles: default public (changeable by user)
- Location: store and display only coarse location by default (city or region)
- Blocking prevents:
  - buddy requests both ways
  - messaging both ways (platform block)
  - visibility in buddy finder results (recommended)

### 3.2 Anti-Spam and Abuse Controls (Baseline)

Rate limits (initial defaults, adjust after observing abuse patterns):

- Buddy requests: max 20 per day per user
- New DMs to non-buddies: max 10 per day per user
- Forum threads: max 10 per day per user
- Posts: max 50 per day per user

New account restrictions (recommended):

- Account age < 24 hours: can DM buddies only OR can only send message requests (see Messaging rules)

Reporting:

- Any content object can be reported: profile, PB, message, thread, post, group, dive site, event, record

### 3.3 Content Boundaries

Prohibited content:

- harassment, threats, hate speech
- doxxing and personal data exposure
- pornographic content (not recommended)
- illegal activity promotion
- scams, impersonation, fraudulent listings

Enforcement actions:

- remove content
- lock threads
- suspend user
- permanent ban
- feature restrictions (DM disabled, posting cooldown)

### 3.4 Edit and Delete Boundaries (Recommended)

Messages:

- Editable: within 5 minutes of send (optional)
- Deletable by sender: soft delete, shows “deleted” placeholder
- Removable by moderators: removal placeholder with reason code

Forum posts:

- User can edit their post, but edit history is stored (mods can view)
- User can delete their own post only if there are no replies, otherwise request removal

Threads:

- Author can edit title within 10 minutes (optional)
- Moderators can lock threads

### 3.5 Safety Disclaimer Boundary

FPH is not a substitute for professional instruction, medical advice, or emergency services.

- Safety content is informational and must avoid claiming real-time safety guarantees.
- Emergency contacts must be presented with context and verification notes.

### 3.6 Data Retention (Recommended)

- Deleted accounts: anonymize authored content, keep for community integrity
- Hard delete on user request: only if required by policy or law, otherwise anonymize

---

## 4) Feature Breakdown

## 4.1 Profiles

### 4.1.1 Public Profile

- View profile details based on visibility
- Show:
  - displayName, username, avatar, bio
  - optional: experienceLevel, homeDiveArea
  - PB highlights (based on PB visibility)

Rules:

- Username unique and change-limited (recommended: once per 30 days)
- Profile visibility controls what guests can see

### 4.1.2 Personal Bests (PBs)

- Create, update, delete PB entries
- PB visibility per entry:
  - public | members_only | private

Boundaries:

- PBs are self-declared unless linked to verified records
- Avoid “official record” language unless verificationState is verified

### 4.1.3 Profile Activity Feed

- A feed of user activity items with explicit visibility
- Examples:
  - new PB (if PB is not private)
  - event created
  - verified record
  - public training log share (future)

Boundaries:

- Do not show:
  - private PBs
  - blocked user content
  - items from removed content

---

## 4.2 Messaging (Direct)

### 4.2.1 Conversation List

- List of conversations
- Unread count
- Last message snippet

### 4.2.2 Direct Messages

- Send text messages
- Optional attachments:
  - images only
  - size limit
  - content scanning recommended in production

Rules (choose and enforce one):
Option A: Members can DM anyone, with strict rate limits and blocks
Option B (safer): Only buddies can DM, plus a message request inbox for non-buddies

Boundary:

- Blocking always overrides messaging
- Moderators can remove abusive messages

---

## 4.3 Buddy System

### 4.3.1 Buddy Requests

- Send request
- Accept, reject, cancel

Rules:

- No repeated requests after rejection for 14 days (recommended)
- If blocked, cannot request

### 4.3.2 Buddy List

- View list
- Remove buddy

Boundary:

- Removing buddy does not block. It only disconnects.

---

## 4.4 Groups

### 4.4.1 Group Discovery

- Browse groups:
  - public visible to guests (optional)
  - members_only visible only to logged in users
  - private hidden unless invited

### 4.4.2 Group Creation

- Create group with:
  - name, description
  - visibility and joinPolicy

Rules:

- Owner is creator
- Owner can assign group moderators

### 4.4.3 Membership Management

Join flow depends on joinPolicy:

- open: immediate membership
- request: pending approval by group moderator or owner
- invite_only: only via invite

Boundary:

- Group moderators can remove members, but cannot remove owner
- Banned members cannot rejoin unless unbanned

---

## 4.5 Chika (Forums) with Pseudonymous Mode

Chika is designed to encourage discussion while controlling abuse.

### 4.5.1 Category Modes

- normal:
  - posts show the user’s profile identity
- pseudonymous_chika:
  - posts show a generated pseudonym per thread
  - moderators and admins can see the real user identity

### 4.5.2 Pseudonymous Chika Rules (Recommended Defaults)

- Pseudonym is generated, not user-chosen initially
  - reduces targeted impersonation and branding abuse
- Pseudonym is unique per thread, not global
  - reduces cross-thread stalking
- Users cannot message each other “as a pseudonym”
  - messaging always uses real accounts and block rules

### 4.5.3 Extra Boundaries for Pseudonymous Chika

Because pseudonymous content increases risk:

- Stricter rate limits:
  - new threads: max 5 per day
  - replies: max 30 per day
- New account gating:
  - Account age < 24 hours cannot post in pseudonymous categories
- Visibility:
  - Default pseudonymous categories should be members_only at launch (recommended)
- Moderation tooling:
  - fast remove with reason codes
  - lock thread
  - “cooldown” user from Chika for repeated violations
  - identity reveal only to moderator and admin, never to normal users

---

## 4.6 Explore (Map + Discovery)

### 4.6.1 Dive Site Exploration

- Browse and search
- Filter by:
  - region
  - tags
  - recency (optional)
- Dive site detail page:
  - description, tags, photos (optional)
  - safety notes (optional, must be curated or moderated)

### 4.6.2 Map View (Explicit)

- Show dive sites on a Philippine map
- Support:
  - zoom and region filtering
  - selection highlights and quick details

Boundaries:

- Use coarse location pins by default
- Avoid sensitive entry points or precise coordinates unless explicitly opted in and reviewed

### 4.6.3 Community Contributions

- Submit a new community dive site
- Suggest edits to existing dive sites

Rules:

- New submissions default to draft or pending review
- Moderators publish or reject with feedback

---

## 4.7 Buddy Finder (Explore Buddies)

### 4.7.1 Discovery

- Search for buddies based on:
  - region or city (coarse)
  - experience level (self-declared)
  - optional tags (training buddy, depth, pool, etc)

Rules:

- A user can opt out of appearing in buddy finder
- If blocked, do not show in results

Boundary:

- Do not expose exact schedules or exact location

---

## 4.8 Events

### 4.8.1 Event Listing

- Public events visible to guests (optional)
- Members-only events visible to logged in users

### 4.8.2 Event Creation

- Create event with:
  - title, description
  - date and time range
  - location (coarse)
  - visibility

Rules:

- Organizer can edit until event start time (recommended)
- After start time, event becomes read-only, except cancel

Boundary:

- Moderators can remove events used for scams or abuse

---

## 4.9 Competitive Records

### 4.9.1 Records Browsing

- Browse by:
  - discipline
  - event
  - date
  - athlete

### 4.9.2 Record Submission

- Members can submit records with:
  - discipline, result, event name, event date
  - optional recordType label (PB, national record, competition result)
  - optional source link

Rules:

- All member submissions default to unverified
- Moderators verify or reject
- Verified records are labeled as verified

Boundary:

- Do not present unverified claims as official

---

## 4.10 Training Logs (New, Medium Scope)

Goal: track progress, log dives, analyze stats over time.

### 4.10.1 Entities (Initial)

- **TrainingLogSession**
  - id
  - userId
  - date
  - type: pool | depth | dry | strength | mobility | breathwork
  - notes (optional)
  - visibility: private | buddies_only | public (default private)

- **TrainingLogMetric** (optional, extensible)
  - sessionId
  - key (example: maxDepthM, totalDives, staSeconds, dynMeters, rpe)
  - value + unit

### 4.10.2 Rules and Boundaries

- Default visibility is private
- Sharing a training session can create a profile activity item only if visibility is public or buddies_only
- No medical claims or unsafe advice in public shared logs, enforce via moderation if needed

---

## 4.11 Safety & Rescue Resources (New, Placeholder for deeper spec)

Goal: a dedicated section for safety protocols, emergency contacts, and updates.

### 4.11.1 Placeholder Scope

- Curated “Safety Basics” pages
- Emergency contacts by region (curated)
- Links to official sources
- Optional community “conditions” posts, if you can moderate responsibly

### 4.11.2 Boundaries (Non-Negotiable)

- No claim of real-time accuracy unless integrated with a trusted provider
- Always show disclaimer: “For emergencies, contact local emergency services”
- Safety content is curated by moderator or safety_editor only

---

## 4.12 Ocean Awareness Wall (New, Placeholder)

Goal: keep users informed and reminded about ocean awareness.

### 4.12.1 Placeholder Scope

- A feed of awareness posts:
  - environmental reminders
  - marine life etiquette
  - seasonal advisories
  - responsible tourism notes
- Sources required for factual claims (moderation policy)

### 4.12.2 Boundaries

- Misinformation control:
  - require citations or links for factual claims
  - moderator removal for repeated misinformation
- Avoid political campaigning. Keep it focused on awareness and safety.

---

## 4.13 Gear Marketplace (Heavy Scope, Placeholder)

Goal: buy, sell, or trade secondhand freediving gear.

### 4.13.1 Placeholder Scope

- Listings: item, condition, price, region, photos
- Contact: likely via messaging, but with additional scam controls
- Reporting and moderation of listings

### 4.13.2 Heavy Spec Areas (Defer)

- Payment handling (recommended: do not do in-app payments at first)
- Dispute policy and scams handling
- Identity verification and trust levels
- Marketplace-specific rate limits, bans, and fraud detection
- Legal and policy requirements for commerce

---

## 4.14 Collaboration Hub (Heavy Scope, Placeholder)

Goal: connect content creators, photographers, videographers, and divers.

### 4.14.1 Placeholder Scope

- Creator profiles: portfolio links, specialties
- Collaboration posts:
  - “Looking for photographer in X”
  - “Offering underwater shoots”
- Tagging by region and type

### 4.14.2 Heavy Spec Areas (Defer)

- Contracting and payments
- Reputation and review system
- Spam prevention for “service ads”
- Verification of professionals

---

## 5) Moderation, Reporting, and Enforcement

### 5.1 Reporting

Any of these can be reported:

- profiles, PBs, profile feed items
- messages
- threads, posts (including pseudonymous Chika)
- groups
- dive sites
- events
- records
- training logs (if public)
- safety resources, ocean awareness posts
- marketplace listings, collaboration posts (future)

Report fields:

- reporterUserId
- targetType + targetId
- reasonCode
- freeform text
- createdAt

### 5.2 Moderator Actions

- Remove content with reason code
- Lock threads
- Ban users from group
- Suspend user platform-wide
- Restrict features:
  - disable DMs
  - disable Chika posting
  - disable marketplace posting (future)
- For pseudonymous Chika:
  - identity is visible to moderator and admin for enforcement

### 5.3 Audit Logging (Recommended)

Log for sensitive actions:

- role changes
- content removals
- suspensions
- verification decisions for records
- safety content edits

---

## 6) Non-Functional Rules (Minimal)

- All user-generated content requires:
  - pagination
  - rate limiting
  - abuse filtering
- Authorization must be enforced server-side, never only in UI.
- Soft delete preferred for community integrity, except for legal requirements.

---

## 7) Explicit Assumptions Made in This Document

1. Chika is pseudonymous per thread in specific categories, not fully anonymous.
2. Default Chika pseudonymous categories are members_only at launch.
3. Profile activity feed is event-based and opt-in via visibility.
4. Training logs default to private and can be shared with privacy controls.
5. Safety and awareness modules are curated and do not provide real-time guarantees.
6. Marketplace and collaboration hub are placeholders due to heavy trust, fraud, and policy requirements.
