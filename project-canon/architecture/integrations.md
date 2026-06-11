# Integrations

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Current integrations promoted into canon:

- Clerk for authentication
- Render via `render.yaml`
- PostgreSQL
- CDN/media worker runtime
- Cloudflare-backed media delivery assumptions in the media spec

Important boundaries:

- media signed URLs are time-bounded public-by-link URLs after issuance
- CDN/media worker behavior is a real integration boundary, even if not fully implemented in this repo
- public SEO markdown alternates must be generated from the same approved public content registries as HTML pages
