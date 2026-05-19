# Freediving Philippines First-Contact UX Pass

Date: 2026-05-19

## Surfaces changed

- Home feed loading, empty, error, and low-data condition states.
- Explore list loading, empty state, legacy list container, and blank-map orientation.
- Dive spot detail sheet loading and low-data related sections.
- Chika list loading, empty state, signed-out preview copy, and detail/comment empty states.
- Groups list loading, empty states, signed-out CTA, and group detail low-data states.
- Events list loading, empty states, signed-out CTA, event detail loading, attendee empty state, and detail trust copy.
- Buddies signed-out preview, member loading states, buddy request tabs, availability lists, and empty states.
- Profile photo grid empty and older-media fallback states.

## Before/after UX rationale

- Before: Home could show placeholder-like conditions such as `Loading`, `--`, and a cold feed failure message.
  After: Home now gives a useful first impression even before data arrives, points users to Explore, Buddies, Chika, and Events, and avoids looking stalled.

- Before: Explore loading and empty states were mostly skeletons or short "no results" messages.
  After: Explore explains how to search, move the map, reset the search, or suggest a dive site.

- Before: A blank Explore map could look like there were no dive sites or the map had failed.
  After: Empty map states explain that the user can move the map, search another coast, or suggest a site.

- Before: Chika empty/loading copy felt like a forum engine.
  After: Chika invites users to ask a local question, share a dive update, or join the conversation.

- Before: Groups and Events relied on skeletons and generic empty states.
  After: They now explain what is being checked and what the user can do next when the page is quiet.

- Before: Buddies signed-out and empty states repeated sign-in language without enough value context.
  After: They explain why public previews are limited, what sign-in unlocks, and why that improves safety.

- Before: Event detail contained internal implementation language about backend rules and frontend optimism.
  After: Event detail now explains access and attendance in normal user language.

## Copy rewrites

- "Loading community updates..." -> "Looking for community updates"
- "Failed to load feed. Sign in and try again." -> "Community updates are taking longer than expected..."
- "Loading dive spots" -> "Finding dive spots"
- "No spots found here yet" -> "We do not have a match for this area yet"
- "No Chika yet" / "No Chika found" -> "Start the first Chika"
- "Read-only preview. Sign in to react and comment." -> "Preview only. Sign in to react, comment, or start your own Chika."
- "No groups found here yet" -> "This group search is quiet right now"
- "No upcoming events found" -> "The calendar is quiet right now"
- "No buddies yet" -> "Your buddy list is ready to grow"
- "No active availability posts" -> "Your availability is clear"
- "Loading reviews..." -> "Checking recent reviews..."
- "Media metadata missing" -> "Some photos need a refresh"

## Remaining first-contact weaknesses

- Some signed-in utility pages, such as saved items and submission history, still have plain empty states. They are not the primary first-contact public surfaces, but should be warmed up before a larger member onboarding pass.
- Admin/moderation loading and error states still use operational language. That is acceptable for this pass because it is not normal public first-contact UX.
- The first-contact copy is improved, but this pass did not redesign information hierarchy or add illustrations/media. Visual polish should stay separate from this copy/UX cleanup.
- The app still depends on live backend data for richer first impressions. This pass avoids fake data by design.
