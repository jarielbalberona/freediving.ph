# Product Workflows

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Core user workflows intended by the current canon baseline:

1. Auth and membership
   - user signs in through Clerk-backed auth
   - protected product workflows depend on authenticated membership state

2. Social identity
   - member maintains a profile with field-level visibility and coarse location defaults
   - profile activity is event-based and visibility-scoped

3. Messaging and buddies
   - non-buddy direct messaging is request-gated
   - accepted request opens 1:1 conversation eligibility
   - platform or messaging blocks deny interaction

4. Groups and Chika
   - groups own membership, visibility, and minimal group discussion
   - Chika owns thread/post discussion with pseudonymous-per-thread support in selected contexts

5. Dive-site discovery
   - guests or members browse sites by map/list/search
   - members can submit new sites or edit proposals
   - moderators verify/reject/hide/restore

6. Buddy Finder and events
   - members publish coarse-area availability and receive buddy requests
   - events support visibility-aware discovery, organizer actions, and RSVP states

7. Competitive records
   - members submit records with evidence placeholders
   - moderator/admin review determines verification state

8. Homepage feed
   - homepage mixed feed is backend-owned, not composed client-side
   - frontend renders and emits telemetry; backend owns ranking and cursor behavior

9. Public SEO content
   - public content routes are separate from authenticated product flows
   - AI-readable markdown alternates mirror approved public content only
