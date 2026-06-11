# Business Rules

Status: baseline / to be confirmed

Source: current repo inspection.

Safe high-level rules visible from repo entry files:

- the product is community/social plus freediving-specific, not a generic template app
- backend API work belongs in `services/fphgo`
- shared contracts should live in `packages/types`
- shared packages should not absorb workspace-specific environment assumptions

This file intentionally avoids promoting detailed product or moderation rules from legacy root docs during the seed pass.
