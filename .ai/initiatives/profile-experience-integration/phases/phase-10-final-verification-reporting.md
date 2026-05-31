# Phase 10: Final Verification/Reporting

Status: pending

## Objective

Close the integration initiative with concrete verification evidence, accurate state files, and a clean final report.

## Goal

Run final targeted and repo-level verification, document evidence, update state, and produce the initiative final report.

## Scope

- Verification commands from `04-verification-plan.md`.
- `.ai/initiatives/profile-experience-integration/reports/final-report.md`.
- `.ai/state/current-state.md`.
- `.ai/state/known-risks.md`.
- `.ai/state/verification-status.md`.
- Git diff review.

## Out Of Scope

- No new feature work.
- No speculative cleanup.
- No mobile implementation.
- No app/runtime smoke tests unless a prior phase explicitly required and documented them.

## Non-Goals

- Do not hide failing checks.
- Do not mark completion based on intent instead of evidence.
- Do not fix unrelated dirty-worktree failures outside initiative scope.

## Dependencies

- All completed phase reports.
- `04-verification-plan.md`.
- Current git diff.
- Current state/risk/verification files.

## Tasks

- Run targeted checks for changed Go, shared TypeScript, and web modules.
- Run full repo checks where feasible.
- Run `git diff --stat` and `git diff --check`.
- Write `reports/final-report.md` with exact command evidence, known residual risks, and changed files.
- Update `.ai/state/current-state.md`, `.ai/state/known-risks.md`, and `.ai/state/verification-status.md`.
- Mark initiative completion only if verification evidence supports it.

## Verification Requirements

- Final report must include exact commands, status, and relevant failure output.
- Git diff review must be included.
- State files must reflect real verification status.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/app/...`
- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --stat`
- `git diff --check`

## Expected Evidence

- Final report records exact pass/fail status for each command.
- Any skipped command has a concrete reason.
- Final diff contains only intended integration hardening and report/state files.
- Known risks and verification status are current.
- No execution phase remains falsely marked complete without evidence.

## Repair Policy

Allowed repairs:

- narrow fixes for verification failures introduced by this initiative.
- generated file drift.
- formatting issues.
- documentation/report corrections.

Hard-stop if full verification exposes unrelated dirty-worktree failures that cannot be safely separated, repeated failures persist after bounded repair, or source/privacy/product blockers remain unresolved.

## Stop Conditions

- Any initiative-critical verification cannot be run or cannot pass.
- Residual source-of-truth, privacy, or product blockers remain.
- Diff contains unrelated feature work.

## Expected Report Output

- `reports/final-report.md` with command evidence.
- Updated `.ai/state/current-state.md`.
- Updated `.ai/state/known-risks.md`.
- Updated `.ai/state/verification-status.md`.
- Final diff summary and remaining risk list.

## Completion Notes

Filled by the execution skill or runner.
