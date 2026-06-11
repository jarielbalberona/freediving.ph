# Architecture Overview

Status: baseline / to be confirmed

Source: current repo inspection.

This repo is a pnpm-workspace monorepo with:

- `apps/web` - Next.js App Router frontend
- `services/fphgo` - canonical Go backend for new API work
- `services/cdn-worker` - CDN/media delivery worker surface
- shared packages for config, db, types, ui, and utils

The product is not a single deployable unit. It includes at least:

- a web frontend
- a Go API service
- supporting shared packages
- deployment/infrastructure configuration

Not yet claimed:

- full service-to-service interaction model
- final runtime topology beyond what repo entry files state
