# Native to shadcn + RHF + Zod Migration Audit

## Scope

Replace native form elements (`<input>`, `<select>`, `<textarea>`, `<button>`, `<form>`) with shadcn/ui components and standardize all forms on React Hook Form + Zod.

## Inventory

| File | Form name | Elements replaced | Schema path | Notes/risks |
|------|-----------|-------------------|-------------|-------------|
| `src/app/auth/form.tsx` | AuthForm | Already migrated | Inline in form.tsx | Added isSubmitting disable on submit button |
| `src/features/chika/components/CreateThreadModal.tsx` | CreateThreadModal | input, select, textarea, form | `features/chika/schemas/createThread.schema.ts` | RHF + Zod; categoryId default from first category |
| `src/app/chika/create/page.tsx` | CreateThreadPage | input, select, textarea, form | `features/chika/schemas/createThread.schema.ts` | RHF + Zod; content required |
| `src/app/chika/[id]/page.tsx` | CommentForm | textarea, form | `features/chika/schemas/comment.schema.ts` | RHF + Zod; single-field form |
| `src/app/explore/dive-spot-detail-sheet.tsx` | DiveSpotReviewForm | input, textarea, form | `features/diveSpots/schemas/review.schema.ts` | RHF + Zod; rating 1-5; optional comment |
| `src/app/explore/filters.tsx` | ExploreFilters | select | Input already shadcn | Replaced native select with shadcn Select |
| `src/app/services/page.tsx` | ServicesSearch | input | N/A | Replaced native input with shadcn Input |
| `src/app/events/page.tsx` | EventsSearch | input | N/A | Replaced native input with shadcn Input |
| `src/app/groups/page.tsx` | GroupsSearch | input | N/A | Replaced native input with shadcn Input |
| `src/components/report/report-action.tsx` | ReportForm | select, textarea | `features/reports/schemas/report.schema.ts` | RHF + Zod; form submit |
| `src/components/common/visibility-selector.tsx` | VisibilitySelector | select | N/A | Replaced native select with shadcn Select |
| `src/features/media/components/MediaUploadPanel.tsx` | MediaUploadForm | select, input | `features/media/schemas/upload.schema.ts` | RHF + Zod; file input stays native |
| `src/app/training-logs/page.tsx` | CreateTrainingLogForm | input, select | `features/trainingLogs/schemas/createLog.schema.ts` | RHF + Zod |
| `src/app/moderation/reports/page.tsx` | ModerationFilters | select | N/A | Replaced native select with shadcn Select |
| `src/app/moderation/reports/[reportId]/page.tsx` | StatusUpdateForm | select | N/A | Replaced native select with shadcn Select |
| `src/app/competitive-records/page.tsx` | CreateRecordForm, FilterForm | input | `features/competitiveRecords/schemas/record.schema.ts` | RHF + Zod for create; filter uses RHF watch |

## Button replacements (non-form)

| File | Element | Purpose |
|------|---------|---------|
| `src/app/explore/explore-view.tsx` | button | Map spot card - replaced with Button |
| `src/app/messages/page.tsx` | button | Conversation list item - replaced with Button |
| `src/components/nav/bottom-nav.tsx` | button | Nav actions - replaced with Button |
| `src/components/nav/create-drawer.tsx` | button | Create options - replaced with Button |
| `src/components/ui/nav-user.tsx` | button | Sign in trigger - replaced with Button |
| `src/features/media/components/MediaCard.tsx` | button | Card click - replaced with Button |

## New components added

- `src/components/ui/select.tsx` - shadcn Select (via `pnpm dlx shadcn@latest add select`)

## New schema files

- `src/features/chika/schemas/createThread.schema.ts`
- `src/features/chika/schemas/comment.schema.ts`
- `src/features/diveSpots/schemas/review.schema.ts`
- `src/features/reports/schemas/report.schema.ts`
- `src/features/media/schemas/upload.schema.ts`
- `src/features/trainingLogs/schemas/createLog.schema.ts`
- `src/features/competitiveRecords/schemas/record.schema.ts`

## Verification checklist

- [ ] Each form submits successfully
- [ ] Errors display per field via FormMessage
- [ ] Selects work with keyboard
- [ ] Submit buttons disable while submitting
- [ ] No controlled/uncontrolled warnings
- [ ] Signed-in/out behavior unaffected
- [ ] No route or API payload regressions
