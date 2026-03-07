# Social RBAC Spec

## Purpose
Define social-module authorization model and enforcement points for global and scoped roles.

## Role Model
### Global roles
- `user`
- `moderator`
- `admin`

### Group-scoped roles
- `owner`
- `group_moderator`
- `member`

## Permission Matrix (MVP)
| Permission | user | moderator | admin |
|---|---|---|---|
| `profiles.read` | yes | yes | yes |
| `profiles.update_self` | yes | yes | yes |
| `profiles.moderate_any` | no | yes | yes |
| `buddies.request` | yes | yes | yes |
| `messaging.request` | yes | yes | yes |
| `messaging.send` | yes | yes | yes |
| `groups.create` | yes | yes | yes |
| `groups.moderate_any` | no | yes | yes |
| `chika.read` | yes | yes | yes |
| `chika.post` | yes | yes | yes |
| `chika.moderate` | no | yes | yes |
| `chika.reveal_identity` | no | yes | yes |
| `reports.create` | yes | yes | yes |
| `reports.review` | no | yes | yes |
| `sanctions.apply` | no | yes | yes |

## Group Role Capabilities
| Capability | owner | group_moderator | member |
|---|---|---|---|
| Update group settings | yes | limited | no |
| Approve/reject join requests | yes | yes | no |
| Remove member | yes | yes | no |
| Remove owner | no | no | no |
| Create group threads/posts | yes | yes | yes (policy dependent) |
| Lock group thread | yes | yes | no |

## Enforcement Points
### API middleware checks
- `requireAuth`: verifies authenticated principal.
- `requireGlobalPermission(permission)`: checks resolved global permission.
- `requireGroupRole(minRole)`: checks `group_memberships` for route `groupId`.
- `requireAccountStatusWritable`: blocks writes for suspended or restricted states.

### Row-level checks
- Actor is participant for messaging conversation reads/writes.
- Actor is owner for profile write/delete actions.
- Actor has group membership and sufficient role for group actions.
- Actor cannot act on blocked counterpart when action requires interaction.

## Reveal Identity Rule
`chika.reveal_identity` is only allowed to `moderator` and `admin`.

Mandatory constraints:
- Endpoint requires reason.
- Attempt is always audit logged on allow and deny.
- Response payload must include only minimum identity fields needed for moderation action.

## Conflict Resolution Order
1. Account status deny (suspension/restriction).
2. Block relationship deny.
3. Global permission check.
4. Scoped role check.
5. Row ownership or participation check.

Fail closed: missing context or unresolved role data denies the action.

## Acceptance Criteria
- User role cannot call moderation or identity reveal endpoints.
- Group moderator cannot remove owner.
- Admin can perform all moderation actions across social modules.
- All privileged denials return auditable decision logs.
- Middleware plus row-level checks prevent horizontal privilege escalation.
