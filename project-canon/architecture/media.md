# Media Architecture

Status: migrated legacy-doc baseline / needs code and runtime confirmation

Primary sources:

- migrated from legacy root docs; validation status: needs code/runtime confirmation
- supporting repo inspection of `services/cdn-worker` and `services/fphgo/docs/media-v1.md`

Current canon media rules:

- canonical storage truth is object-key based, not final URL based
- delivery uses materialized URLs and signed/public-by-link delivery windows where applicable
- image delivery is the intended MVP focus; video processing is deferred
- upload constraints must enforce mime/type/size allowlists
- media moderation and abuse controls are part of the backend/media boundary, not just a frontend concern

Integration boundary:

- CDN/media worker behavior is a real runtime dependency
- signed URL issuance and validation are separate from page rendering proof

Legacy note:

- this canon file replaces the old root `docs/media/media-v1.md` truth surface
