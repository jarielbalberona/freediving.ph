#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

printf "[release] validating migrations metadata\n"
pnpm run db:check-migrations

printf "[release] applying migrations\n"
pnpm run db:migrate

printf "[release] auditing post-migration backfill quality\n"
pnpm run audit:explore-backfill

printf "[release] running API contract tests\n"
pnpm test

printf "[release] verifying dive spot shapes\n"
"${ROOT_DIR}/scripts/verify-dive-spots-shape.sh"

printf "[release] verifying related explore endpoints\n"
"${ROOT_DIR}/scripts/verify-explore-related.sh"

if [[ -n "${AUTH_TOKEN:-}" ]]; then
  printf "[release] running full explore flow check\n"
  "${ROOT_DIR}/scripts/verify-explore-flow.sh"
else
  printf "[release] skipping full flow check (set AUTH_TOKEN to enable)\n"
fi

printf "[release] done\n"
