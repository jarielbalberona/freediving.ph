# Permissions

Status: migrated legacy-doc baseline / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Global permissions baseline:

- normal members can read/update self-owned profile and participate in social/community/diving flows allowed by visibility and block rules
- moderators and admins can access moderation review and enforcement paths
- moderators and admins can reveal Chika identity only where policy explicitly allows

Scoped permissions baseline:

- group-scoped roles are `owner`, `group_moderator`, and `member`
- scoped group role checks layer on top of global permission checks

Enforcement order:

1. account status deny
2. block relationship deny
3. global permission check
4. scoped role check
5. row ownership or participation check

Fail-closed rule:

- unresolved role data or missing authz context denies the action
