# Phase 10: Final Verification/Reporting

Status: pending

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Close the Dive Memories initiative with full targeted verification, state updates, and final reporting.

## Scope

- `.ai/initiatives/dive-memories/reports/final-report.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- final diff review

## Out Of Scope

- No new feature implementation beyond verification repairs.
- No emulator tests.
- No device tests.
- No manual browser UX smoke tests unless explicitly requested later.

## Inputs

- Phase reports from Phases 1-9.
- `04-verification-plan.md`.
- Current git diff.

## Tasks

- Run final targeted backend/shared/web checks.
- Run repo-level checks when safe.
- Document any unrelated mobile `@expo/ui` drift if it still blocks repo-level `pnpm test`.
- Verify no memory path unlocks map locations, inflates counts, mutates `user_dive_sites`, awards badges, or verifies credentials.
- Verify privacy/tagging tests are present and passing.
- Write final report with exact commands and known risks.
- Update `.ai/state/current-state.md`, `.ai/state/known-risks.md`, and `.ai/state/verification-status.md`.
- Update `.ai/state/decisions.md` only if execution made a new durable decision.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...`
- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/dive_passport/...`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/app/...`
- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `git diff --stat`
- `git diff --check`

## Expected Evidence

- Final report exists.
- All phase reports exist.
- Source-of-truth invariants are proven by tests.
- Privacy/tagging behavior is proven by tests.
- Remaining risks and deferred work are documented.

## Repair Policy

Allowed repairs: narrow verification failures, formatting, generated drift, report/state corrections.

Hard-stop if verification exposes privacy/auth ambiguity, source-of-truth conflict, destructive migration risk, or repeated unrecoverable failures.

## Completion Notes

Filled by the execution skill or runner.
