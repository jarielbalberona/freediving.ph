# User Roles

Status: migrated legacy-doc baseline / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Bounded role model currently captured in canon:

- `guest`
  - unauthenticated actor
  - can access only public surfaces

- `member`
  - authenticated community user
  - owns normal social, messaging, group, event, and diving participation flows

- `moderator`
  - can review reports, apply moderation actions, and reveal sensitive Chika identity only where policy allows

- `admin`
  - broad moderation and platform control role

Scoped roles:

- group roles: `owner`, `group_moderator`, `member`

Important boundaries:

- global role checks do not replace row ownership or participation checks
- account-status deny and block deny apply before feature-level allow
- missing context must fail closed
