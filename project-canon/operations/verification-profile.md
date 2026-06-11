# Verification Profile

Appropriate verification is default. E2E is escalation, not default.

Use the narrowest reliable proof based on failure boundary and risk.

Do not stop at typecheck for behavioral issues.

Verification hierarchy:

1. static checks
2. unit tests
3. component tests
4. integration/API tests
5. local runtime/browser verification
6. E2E tests
7. device/runtime verification where the actual boundary requires it

Project-specific proof boundaries:

- backend contract, RBAC, moderation, and feed ranking claims need API/integration proof, not just UI smoke
- media/storage claims need storage/object-key and URL-materialization proof, not just page rendering
- public SEO claims need rendered-output proof on public routes
- messaging, group, and forum safety claims need block/moderation/visibility proof at the backend boundary

Do not claim:

- device proof without running the actual device/runtime path
- deploy/live proof from local-only verification
- production readiness from documentation cleanup

Legacy root docs were migrated into canon during adoption; any migrated claim above that is not already code-verified should be treated as needing code/runtime confirmation.
