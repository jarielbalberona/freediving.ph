# Form Migration Audit

This is the current controlled rollout inventory for the RHF + Zod + shadcn Form pattern.

| Module | File | Current pattern | Status | Reason |
| --- | --- | --- | --- | --- |
| Events create | `apps/web/src/app/events/create/page.tsx` | `useState` payload + toast validation | Deferred | Event files are already dirty and the create flow has recent simplification work; migrate in an event-only pass. |
| Events detail/manage | `apps/web/src/app/events/[slug]/client-page.tsx` | Mixed local state, toasts, file uploads, nested management forms | Deferred | High blast radius and currently dirty; split into smaller event subform passes. |
| Groups browse/create | `apps/web/src/app/groups/page.tsx` | Local state + toast validation | Deferred | Group files are already dirty; migrate in a group-only pass. |
| Groups detail/edit/invite/post | `apps/web/src/app/groups/[slug]/client-page.tsx` | Local state + toast validation | Deferred | Group ownership/invite/archive behavior is business-rule-heavy and dirty. |
| Admin groups | `apps/web/src/app/admin/groups/page.tsx` | Local state + toast/API errors | Deferred | Admin surface should migrate with the group module. |
| Profile settings | `apps/web/src/features/profile/pages/ProfileSettingsPage.tsx` | Local state + toast/API errors | Migrated | Clean, low-risk profile text form; avatar upload remains separate. |
| Explore submit/edit | `apps/web/src/app/explore/submit/page.tsx`, `apps/web/src/app/explore/sites/[slug]/suggest-edit/page.tsx` | Already RHF + Zod, manual API issue mapping | Deferred | Needs a focused pass to replace local mapping with shared helper without breaking map/location behavior. |
| Explore presence/affinity/review | `apps/web/src/app/explore/sites/[slug]/dive-site-related-tabs.tsx` | Local state forms | Deferred | Multiple related mutations; should migrate after map-backed submit/edit. |
| School add/edit | `apps/web/src/features/schools/pages/ManageSchoolsPage.tsx` | RHF + Zod + shared API error mapping | Already migrated | Foundation pass. |
| School course/session/booking management | `apps/web/src/features/schools/pages/ManageSchoolsPage.tsx` | Local state forms | Deferred | Same dirty file as school foundation; migrate in a school-management-only pass. |
| Public school booking | `apps/web/src/features/schools/pages/PublicSchoolsPage.tsx` | Local state form | Deferred | Dirty file; migrate after management forms. |
| Chika create/comment/modal | `apps/web/src/app/chika/create/page.tsx`, `apps/web/src/app/chika/[slug]/client-page.tsx`, `apps/web/src/features/chika/components/CreateThreadModal.tsx` | Already RHF + Zod, toast API errors | Deferred | Needs shared API error mapping pass; lower priority because client validation already exists. |
| Report action | `apps/web/src/components/report/report-action.tsx` | RHF + Zod, toast API errors | Deferred | Small follow-up after module forms. |
| Media composer/upload | `apps/web/src/features/media/components/*` | RHF + Zod plus file-upload validation | Deferred | File-upload-heavy; do not rewrite casually. |
