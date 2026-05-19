# Freediving Philippines UI Polish Pass

Date: 2026-05-19

## Components and surfaces changed

- Chika detail comments:
  - Replaced the native browser comment-sort control with the app's shadcn `Select`.
  - Kept the same sort choices: `Hot`, `Top`, and `New`.

- Public reporting:
  - Replaced the inline raw report panel with a shadcn `Dialog`.
  - Kept the existing report action narrow and available from Chika posts/comments.
  - Removed public exposure of raw target information from the report form.

- Chika create modal component:
  - Replaced the custom fixed overlay/modal shell with shadcn `Dialog`.
  - Kept the existing form, category select, validation, and submit behavior.
  - Updated modal copy from thread-oriented language to Chika/community language.

- Dive site detail page:
  - Replaced raw repeated bordered blocks for recent conditions and buddy previews with shadcn `Card` composition.
  - Normalized ad hoc `zinc`/`emerald` text colors to app tokens such as `text-foreground` and `text-muted-foreground`.
  - Kept the existing page layout and content order.

## Why the old usage felt weak

- The Chika comment sort used a native `<select>` inside a custom pill. It worked, but looked like an older layer of UI compared with the rest of the app.
- The report flow opened as an inline bordered form inside the conversation. That made safety reporting feel like raw data entry instead of a private, intentional action.
- The Chika modal used a hand-built fixed overlay while newer public forms use shadcn dialogs. That inconsistency made the app feel stitched together.
- The dive site detail page mixed custom card blocks and hard-coded color families with shadcn cards. It made a core public detail page feel less aligned with newer Explore surfaces.

## What improved

- Comment sorting now uses the same select primitive as public Events, Groups, and Chika creation forms.
- Reporting now feels like a focused safety flow, not an exposed admin form.
- Report copy now asks normal-user questions: `What is the concern?` and `Anything else we should know?`
- Chika modal copy now says `Post in Chika` instead of `Create Thread`.
- Dive site detail cards now use the same component rhythm as the rest of Explore.

## Remaining polish debt

- Moderation screens still contain operational UI and raw bordered blocks. That is acceptable for this pass because moderation is not a normal public launch path.
- Hidden/non-launch surfaces such as marketplace, awareness, collaboration, competitive records, and training logs still have mixed polish levels. They should stay hidden until they are intentionally productized.
- The public report dialog is now productized, but the broader trust/safety system still needs a dedicated post-launch review for confirmation states, report receipts, and user education.
- Some older profile/media upload controls still use native file inputs because they are functional browser primitives. They should only be redesigned if a dedicated media polish pass is approved.
