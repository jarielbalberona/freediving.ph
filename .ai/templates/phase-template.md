# Phase <N>: <Title>

Status: pending

## Goal

State the single outcome this phase must produce.

## Scope

- Files, modules, or behaviors this phase may change.

## Out Of Scope

- Work that must not be touched in this phase.

## Inputs

- Required initiative files, repo files, or previous phase outputs.

## Tasks

- Concrete implementation steps.

## Verification Commands

- `pnpm --filter <package-name> type-check`
- `pnpm --filter <package-name> test`

## Expected Evidence

- Observable proof that this phase is complete.

## Repair Policy

Allowed repairs:

- type-check failures
- lint failures
- build failures
- missing imports
- formatting issues
- generated file drift
- minor contract mismatches inside this phase

Hard-stop instead of repairing when the issue requires a product, UX, auth, privacy, security, or destructive data decision.

## Completion Notes

Filled by the execution skill or runner.
