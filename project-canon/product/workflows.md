# Product Workflows

Status: baseline / to be confirmed

Source: current repo inspection.

High-signal workflows visible from repo entry files:

1. user signs in through Clerk-backed auth
2. user interacts through the web application
3. the canonical backend handles API and persistence behavior
4. users can participate in social and freediving-specific flows such as profiles, messaging, buddies/groups, dive-site discovery, events, and records

Current workflow boundaries that are safe to assert:

- the web app and Go API are separate runtime surfaces in one monorepo
- shared DTO and utility packages support cross-surface contracts
- root-level `docs/` may contain additional workflow detail, but it is legacy input during adoption and not yet promoted as approved canon
