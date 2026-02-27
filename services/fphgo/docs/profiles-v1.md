# Profiles v1

Last updated: 2026-02-27

## Routes

- `GET /v1/me/profile`
  - Auth: `RequireMember` + `profiles.read`
  - Response:
    - `200 { "profile": { userId, username, displayName, bio, avatarUrl, location, socials } }`
- `PATCH /v1/me/profile`
  - Auth: `RequireMember` + `profiles.write`
  - Body: `{ displayName?, bio?, avatarUrl?, location?, socials? }`
  - Validation: handled by `httpx.DecodeAndValidate`
  - Response:
    - `200 { "profile": { ... } }`
- `GET /v1/profiles/{userID}`
  - Auth: `RequireMember` + `profiles.read`
  - Response:
    - `200 { "profile": { ... } }`
- `GET /v1/users/search?q=...&limit=...`
  - Auth: `RequireMember` + `profiles.read`
  - Response:
    - `200 { "items": [Profile] }`

## Privacy Notes

- Location output is coarse by default in service (`coarseLocation`), even when stored text is more detailed.
- Search responses return profile-safe fields only.

## Permissions

- `profiles.read`
- `profiles.write`

No broad `content.write` checks are used for this feature.

## Validation + Error Shape

- Write request bodies use `httpx.DecodeAndValidate[T]`.
- Validation errors follow:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request",
    "issues": [{ "path": ["field"], "code": "...", "message": "..." }]
  }
}
```
