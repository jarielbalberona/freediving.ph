# Business Rules

Status: migrated legacy-doc baseline / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Cross-surface rules:

- backend business truth belongs in `services/fphgo`
- shared contracts belong in `packages/types`
- public person-related surfaces use coarse location by default; no precise public location leakage
- blocking is deny-wins across messaging, buddy flows, visibility-sensitive social surfaces, and relevant diving flows
- reporting and moderation actions require audit logging
- soft delete and anonymization are expected for sensitive user-generated content workflows

Messaging and buddies:

- non-buddy direct messaging is request-gated
- blocked users cannot request, send, or receive messages
- request and message creation need rate limits and account-age/trust guardrails

Groups and Chika:

- private groups are not discoverable by non-members
- owner cannot be removed by ordinary group moderation actions
- Chika pseudonymous identity reveal is moderator/admin only and must be audited

Diving surfaces:

- dive-site discovery is public/member-visible, but community submission and moderation are separate concerns
- buddy finder uses coarse-area context, not precise live location
- competitive records distinguish verified and unverified states clearly

Feed:

- homepage feed is a backend-owned product surface, not a frontend card mixer
- v1 ranking is rule-based, not ML-based
- frontend owns rendering and telemetry emission; backend owns candidate generation, scoring, normalization, merge, and cursor behavior

Public content and monetization:

- AdSense is limited to public SEO/content routes only
- ads must not appear inside authenticated app/product/community/admin flows
- AI-readable markdown alternates must mirror approved public content, not create alternate truth
