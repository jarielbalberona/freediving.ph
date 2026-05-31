# Domain Model

Core domain concepts:

- User: authenticated person using the platform.
- Buddy: community-facing user identity for connection and activity.
- Instructor: verified teaching identity attached to a user; distinct from a school.
- School: organization offering freediving education or activities.
- Dive site: location where freediving activity may happen.
- Trip/session/course: scheduled activity tied to users, instructors, schools, or locations.
- Media: uploaded or linked evidence, photos, proof, and supporting assets.
- Verification: administrative or system process that changes trust level.

Important boundaries:

- A user can be a Buddy without being an Instructor.
- Instructor verification is not the same thing as school verification.
- Site and school submissions carry trust risk and should preserve reviewability.
- API contracts crossing web/backend boundaries belong in `packages/types`.

If an initiative needs a new domain concept, define it in that initiative first. Promote it here only after it becomes durable project vocabulary.
