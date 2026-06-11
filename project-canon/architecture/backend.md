# Backend Architecture

Status: baseline / to be confirmed

Source: current repo inspection.

Current canonical backend surface:

- `services/fphgo`
- Go API service

Supporting runtime/backend-adjacent surface:

- `services/cdn-worker` for CDN/media delivery behavior

Safe current assertions:

- new API work belongs in `services/fphgo`
- backend and web are separate workspaces in the monorepo
- shared contracts/types are intended to bridge web-facing API usage
