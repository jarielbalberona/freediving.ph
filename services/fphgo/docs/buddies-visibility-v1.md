# Buddies Visibility Rules v1

## Buddy List Visibility

| Viewer relationship | Can see buddy **list**? | Can see buddy **count**? |
|---------------------|-------------------------|--------------------------|
| Self                | Yes                     | Yes                      |
| Authenticated member| No (MVP)                | Yes (via preview)        |
| Unauthenticated     | No                      | No                       |
| Moderator           | Yes (own only, MVP)     | Yes                      |

**MVP scope:** Buddy list is self-only. Buddy count and a short preview
(top N profiles) are available to any authenticated member via the preview
endpoint. Future iterations may add buddies-only or public list visibility.

## Block Enforcement

Blocks are enforced bidirectionally on **all** buddy operations:

### Writes
- **Create request:** Blocked if either direction has a block.
- **Accept request:** Re-checks blocks at accept time; rejects if blocked.
- **Cancel request:** No block check needed (requester cancels own request).
- **Remove buddy:** No block check needed (user removes own relationship).

### Reads
- **List buddies (own):** Excludes any buddy where a block exists in either direction.
- **List incoming requests:** Excludes requests from users who are blocked in either direction.
- **List outgoing requests:** Excludes requests to users who are blocked in either direction.
- **Buddy preview (other user):** Excludes buddies where the viewer or buddy has a block in either direction.
- **Buddy count:** Derived from the filtered set; blocked buddies are not counted.

## Account State Rules

| Account status | Included in buddy listings? | Included in buddy count? | Exception        |
|----------------|----------------------------|--------------------------|------------------|
| `active`       | Yes                        | Yes                      | —                |
| `read_only`    | Yes                        | Yes                      | —                |
| `suspended`    | No                         | No                       | Moderator viewer |

Suspended users are excluded from all buddy listings and counts unless the
viewer is a moderator. In MVP, moderator override is not implemented; suspended
users are unconditionally excluded from buddy reads.

## Buddy Count Semantics

The count returned by the preview endpoint represents the number of active,
non-blocked, non-suspended buddies for the target user, as visible to the
requesting viewer. This means:

- Two viewers may see different counts for the same user if they have different
  block relationships with that user's buddies.
- The count is always consistent with the items that would appear in the
  full buddy list if the viewer had access.

## Reverse Request Convergence

When user A sends a buddy request to user B while a pending request from B→A
already exists, the system auto-accepts the existing B→A request, creating the
buddy pair. This prevents duplicate/conflicting pending requests and matches
user intent (both users want to be buddies).

## Cancel Semantics

Only the requester can cancel their own pending outgoing request. Cancellation
sets the request status to `cancelled`. A cancelled request does not prevent
future requests between the same users.
