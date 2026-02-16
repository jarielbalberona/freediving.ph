# 4.13 Gear Marketplace - Implementation Plan

## Scope

Heavy-scope feature for secondhand gear listings with high fraud and policy risk.

## Phase 0: Discovery and Policy Gate (Required Before Build)

- Produce dedicated marketplace spec and trust/safety policy.
- Define legal constraints for commerce in target regions.
- Decide launch mode: listing-only, no in-app payments (recommended).
- Define fraud controls, scam reporting triage, and enforcement SOP.

### Exit Gate

- Do not start feature implementation until policy, moderation staffing, and legal review are approved.

## Phase 1: Controlled MVP (After Gate)

### Backend

- Listing CRUD (`item`, `condition`, `price`, `region`, photos, state).
- Moderation flags/reporting pipeline for listings.
- Contact path through messaging with marketplace-specific safeguards.

### Frontend

- Listing feed with search/filter.
- Listing creation flow with photo and disclosure requirements.
- Trust signals panel (account age, moderation warnings if applicable).

### Acceptance

- No payment processing in-app.
- Report/flag actions are available on all listings.
- Moderators can remove fraudulent listings quickly.

## Phase 2: Risk Hardening

- Add anti-fraud heuristics (duplicate photos/text, suspicious links).
- Add stricter posting limits and cooldowns.
- Add repeat scammer detection and platform-level restrictions.

## Phase 3: Expansion (Optional)

- Consider identity verification tiers.
- Consider escrow/payment integrations only with full compliance program.

## Dependencies

- Requires mature moderation operations and incident handling.
