# Freediving Philippines Navigation Pass

Date: 2026-05-19

## Navigation changes made

- Mobile bottom navigation now shows text labels under icons, so users do not have to decode icon-only actions.
- Mobile bottom navigation now prioritizes launch-useful destinations: Home, Explore, Chika, Post, Buddies, Messages when signed in, and More.
- Profile is no longer forced into the mobile bottom bar; it remains reachable through account/header surfaces instead of crowding the main product navigation.
- The create action is labeled `Post` instead of generic `Create`.
- The desktop floating create action now uses `Post` and has an `Open sharing options` accessibility label.
- The staff `Moderation` route is hidden from normal launch navigation because it is not a public user destination.

## Labels changed

- `Create` -> `Post` in the main nav action.
- Create drawer title: `Create` -> `What do you want to share?`
- Create drawer options now include descriptions:
  - `Share photos` -> `Add dive photos to your profile.`
  - `Post in Chika` -> `Ask a question or start a community conversation.`
- Home feed tabs:
  - `Following` -> `For you`
  - `Nearby` -> `Near me`
  - `Spot reports` -> `Conditions`
- Events page section:
  - `Discover` -> `Browse events`
  - `Discover` tab -> `All events`
  - `Joined` tab -> `My events`
- Groups page section:
  - `Discover` -> `Browse groups`
  - `Discover` tab -> `All groups`
- Buddies tabs:
  - `Incoming` -> `Requests`
  - `Outgoing` -> `Sent`
  - `Network & Requests` -> `Buddies and requests`

## Tabs and filters changed

- Public Groups visibility filter now uses user-facing choices:
  - `All groups`
  - `Public groups`
  - `Invite-only groups`
- The public Groups filter no longer exposes `Private groups`.
- Events search placeholder now says `Search dives, trainings, or places`.
- Groups search placeholder now says `Search groups or areas`.
- Event detail no longer displays internal event status as a primary badge or "What to expect" field.
- Explore dive spot cards now translate verification status into user-facing labels such as `Community shared`, `Instructor noted`, `Checked by team`, and `Verified`.

## Routes hidden or regrouped

- Hidden from normal launch navigation:
  - Moderation
  - All non-launch `comingSoon` destinations already hidden by the shared nav config
- Regrouped in mobile bottom nav:
  - Buddies is now a first-class mobile destination.
  - Profile moves out of the crowded bottom bar and stays available through account/header navigation.

## Remaining navigation concerns

- `More` still opens the mobile sidebar rather than a purpose-built mobile More sheet. It is usable, but a tailored More sheet would be cleaner.
- Signed-in mobile bottom nav still has seven items when Messages is available. It is now labeled and understandable, but still dense.
- Some signed-in forms still use generic terms like `Visibility`; that is acceptable for creation/settings flows, but public browse filters should stay plain.
- Admin/moderation routes remain accessible by direct URL for staff workflows, but are intentionally not promoted in public launch navigation.
