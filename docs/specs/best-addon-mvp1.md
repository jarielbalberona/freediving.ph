---
doc_id: FPH-BEST-ADDON-MVP1
title: Best Add-on Features for MVP1
version: 1.0
status: Draft
timezone: Asia/Manila
created_at: 2026-02-28
last_updated_at: 2026-02-28
owner: TBD
applies_to:
  - services/fphgo
  - apps/web
depends_on:
  - Explore v1 (dive sites)
  - Buddy Finder v1 (buddy intents)
  - Messaging v1 (DM request flow)
  - Blocks v1
  - Reports v1
  - Media v1 (images)
---

# Best Add-on Features for MVP1

MVP1 core promise:
**Find a safe buddy and a legit spot, fast.**

These add-ons are the best next features to increase conversion, trust, and retention after the user finds a site and a buddy. They are designed to feel like a tool, not a generic social feed.

## Decision guide

If you only ship one add-on for MVP1, ship **Conditions Pulse** first. It makes Explore feel alive on day 1 and creates a daily habit loop.

---

## 1) Conditions Pulse

### Why it matters

Users bounce if Explore feels static or untrustworthy. A lightweight “conditions today” layer gives immediate utility and makes the app feel real.

### User-facing promise

**Is it worth going today** in under 10 seconds.

### MVP definition

- Each dive site shows a latest conditions snapshot.
- Users can post structured updates quickly.
- The app has a “Latest near you” list of updates.

### Data and model

- Reuse or extend `dive_site_updates` under Explore:
  - `visibility_m` (numeric)
  - `current` (enum: none, mild, strong)
  - `waves` (enum: calm, moderate, rough)
  - `temp_c` (numeric, optional)
  - `note` (short text)
  - `occurred_at` (when observed)
  - `created_at`
  - `state` (active, hidden)
- Add computed fields at read time:
  - `last_update_at`
  - `recent_update_count_7d`
  - `last_condition_summary`

### API shape

- Public reads:
  - `GET /v1/explore/updates?area=...&limit=&cursor=`
  - `GET /v1/explore/sites/{slug}` includes latest snapshot
- Member write:
  - `POST /v1/explore/sites/{siteId}/updates`

### UI shape

- Explore site cards show a small, consistent summary row:
  - “Vis 10m • Mild current • Calm”
  - “Updated 3h ago”
- “Latest updates” page with filters by area and recency.

### Trust and safety

- Display trust signals next to updates:
  - author badge signals (verified email or phone, optional cert level)
  - “last updated” timestamp
- Integrate moderation:
  - reports on update
  - mods can hide an update

### Success metrics

- Percentage of site detail views that scroll to conditions
- Updates per active user per week
- Repeat visits per day

### Future upgrades

- Weather and tide integration
- Weighted trust scoring for updates
- Per-site “conditions history” graphs

---

## 2) Safety Profile Card

### Why it matters

Buddy matching fails if people feel unsafe. A compact trust card reduces fear without requiring a full verification system.

### User-facing promise

**You can quickly tell if someone is legit before messaging.**

### MVP definition

- Show a small “trust ladder” card on:
  - buddy intents
  - profile header
  - messaging request preview
- No heavy verification workflows yet. Just clear signals.

### Trust signals (v1)

- Verified email (from Clerk)
- Verified phone (if available, optional)
- Cert level (self-declared, optional)
- Buddy count
- Reports count (aggregate only)
- Last active (coarse)

### Data and model

Prefer derived fields at read time rather than duplicating:

- buddy count from `buddies`
- report count from `reports`
- verification flags from identity layer
- cert level from profile

### UI shape

- Badge row under name:
  - Email verified
  - AIDA 2 (optional)
  - 3 buddies
- Keep it compact.

### Safety notes

- Do not expose sensitive metadata (exact last seen times, exact locations).
- Reports count should stay aggregate.

### Success metrics

- DM requests initiated per buddy intent view
- Accept rate for DM requests
- Reduction in drop-offs after first message

### Future upgrades

- Instructor verified cert badge
- Mutual buddies and trusted network score
- “Safe meetup” checklist

---

## 3) One-tap Save Pack

### Why it matters

Saving turns browsing into intent. It creates retention and a natural sign-up wall.

### User-facing promise

**Save spots and shortlist buddies so you can plan later.**

### MVP definition

- Save a dive site
- Save a buddy intent or user profile
- Saved hub page with two tabs

### Data and model

- `dive_site_saves` covers sites.
- Add one of:
  - `saved_users` (viewer_app_user_id, saved_app_user_id)
  - or `saved_buddy_intents` (viewer_app_user_id, buddy_intent_id)
    Choose one. Saving users is simpler long-term.

### API shape

- Member-only:
  - `POST /v1/explore/sites/{siteId}/save`
  - `DELETE /v1/explore/sites/{siteId}/save`
  - `POST /v1/users/{userId}/save`
  - `DELETE /v1/users/{userId}/save`
  - `GET /v1/me/saved` returns saved sites and saved users

### UI shape

- “Save” buttons on:
  - site cards and site detail
  - buddy intent cards
  - profile header
- Saved page is the planning hub:
  - Saved Sites
  - Saved Buddies

### Trust and safety

- Blocks should hide or remove saved entries if blocked either direction.
- Hidden or deleted sites should not show in saved lists.

### Success metrics

- Save rate per Explore session
- Sign-up conversion triggered by save attempts
- Return visits to Saved hub

### Future upgrades

- Collections: “Dauin weekend”, “Training spots”
- Share a saved collection

---

## 4) Share Links that Preview Well

### Why it matters

Organic growth is messaging-first. Shares must look official and useful to earn clicks.

### User-facing promise

**Share a spot and it previews cleanly in Messenger.**

### MVP definition

- Public share pages for:
  - dive site
  - buddy intent (redacted)
- Proper Open Graph tags:
  - title, description, image, site name

### URL strategy

- Sites use stable share URLs:
  - `/explore/sites/{slug}`
- Buddy intent share URLs do not leak sensitive details:
  - `/buddy/{intentId}` with redaction and sign-up CTA

### UI shape

- Share button on site detail and buddy intent cards.
- Copy link plus system share UI on mobile.

### Trust and safety

- Buddy share pages must not expose contact info.
- Honor moderation state:
  - hidden or deleted shows a safe “not available” page

### Success metrics

- Share rate per user
- Click-through rate from shares
- Sign-ups from shared pages

### Future upgrades

- Shareable “conditions today” card
- Deep links after install

---

## 5) “Meet at” Checkout (lightweight scheduling inside DM)

### Why it matters

Discovery is not enough. People need a fast way to turn “maybe” into “we are going.”

### User-facing promise

**Turn a chat into a plan in seconds.**

### MVP definition

- In a DM conversation, attach a small “plan card”:
  - dive site
  - date window (today, weekend, specific date)
  - optional meetup note
- It is not a full events system. It is a message attachment.

### Data and model

MVP simplest:

- message table has `metadata` jsonb optional
- plan card structure:
  - `type: "meet_at"`
  - `diveSiteId`
  - `diveSiteName` snapshot
  - `timeWindow`
  - `dateStart`, `dateEnd` optional
  - `note` optional

### API shape

- No new endpoints required if metadata is part of message send:
  - `POST /v1/messages/conversations/{id}` includes optional metadata
- Read endpoints return metadata for UI rendering.

### UI shape

- Compose area has “Attach spot”:
  - pick from saved sites or recent sites
  - select time window
- Message renders a card with:
  - site name and area
  - time window
  - quick action: View site

### Trust and safety

- Respect blocks, read_only, and suspended states.
- Plan card should not reveal precise location beyond site area.

### Success metrics

- Percentage of conversations with a plan card
- Plan cards sent per week
- Users returning to view plan cards

### Future upgrades

- Convert plan card into an Event when both agree
- RSVP flow
- Calendar export

---

## Recommendation for MVP1 packaging

If you are optimizing for acquisition and conversion:

1. Conditions Pulse
2. Share Links
3. Safety Profile Card
4. One-tap Save Pack
5. Meet at Checkout
