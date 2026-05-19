# Freediving Philippines Trust Cleanup Pass

Date: 2026-05-19

## Pages and surfaces changed

- Home feed: removed launch-preview language from feed modes, loading states, empty states, card CTAs, and quick actions.
- Home quick actions: hid training/logging actions because they route to non-launch areas.
- Explore: softened empty/error copy and removed technical map/state wording from visible helper text.
- Dive spot detail and saved spots: replaced backend-style empty/error language with normal user-facing copy.
- Buddies: replaced guest-preview, workflow, and system-ish copy with clear buddy/community language.
- Groups: removed approval-queue promises from list and detail surfaces; restricted groups now read as private or invite-only.
- Events: removed public event status filtering and draft/cancelled language from the main event browse path.
- Chika: replaced thread-centric labels with Chika/community language and removed real-author leakage from public cards/detail/comments.
- Messages: removed the non-launch transactions tab from the public inbox tabs and rewrote request/offline/reconnect copy.
- Reporting: removed target ID display and raw report reason labels from the public report dialog.
- Navigation/create menus: replaced generic create labels with user-facing actions like sharing photos and posting in Chika.
- Unavailable route fallback: replaced the public "Coming Soon" experience with a warmer closed-area state that points users back to live community areas.
- Shared error/auth states: replaced blunt system/admin copy with plain-language unavailable/access messages.

## Copy changed

- "Relationship feed" -> "People you follow"
- "Local action feed" -> "Near you"
- "Operational feed" -> "Spot reports"
- "Loading your feed context..." -> "Finding the latest from the freediving community..."
- "Open thread" -> "Open Chika"
- "Untitled thread" -> "Untitled Chika"
- "No threads found" -> "No Chika found"
- "Create thread" style surfaces -> "Post in Chika"
- "Real author" public metadata removed
- "Entity #..." -> community-facing record highlight copy
- "Target ID" removed from report dialog
- Raw report reasons replaced with plain labels like "Spam or scam" and "Unsafe diving advice or behavior"
- "Approval queue" and approval-workflow language replaced with invite-only organizer language
- "No linked data found" and "Unable to load data" replaced with human empty/error messages
- "PRIVATE" and "BUDDIES_ONLY" are now shown as "Only me" and "Buddies only"

## Routes and actions hidden or removed

- Removed Home quick actions that sent users to training/logging surfaces outside launch scope.
- Removed the public Events status selector so users do not browse internal states like draft/cancelled.
- Removed the Messages "transactions" tab from the visible inbox because it is not a launch-ready public conversation area.
- Removed public sidebar "Coming soon" badge rendering; hidden launch items stay out of navigation.
- Kept direct visits to non-launch areas redirected to the closed-area fallback instead of exposing unfinished pages.

## Remaining trust issues not fixed in this pass

- Admin/moderation pages still use some operational labels such as target identifiers. That is acceptable for staff-only surfaces, but should be cleaned separately before wider moderator rollout.
- Some non-launch pages still exist behind the unavailable redirect, including marketplace, collaboration, safety, awareness, media, training logs, services, and competitive records. They were not redesigned in this pass because launch navigation should not send normal users there.
- Old sample data files under app routes still contain developer-ish demo text, but current imports do not route users through them. They should be deleted in a later cleanup if confirmed unused.
- This pass did not overhaul visual hierarchy or component composition. It only removed trust-breaking public copy, dead actions, and misleading launch-scope promises.
