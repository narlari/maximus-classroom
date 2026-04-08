# 04-03-RESULT — Add progress hooks tied to structured lesson events

## What changed
- Added `src/lib/classroom-v2/progress-signals.ts` as a narrow V2 helper that derives reviewable progress/mastery-relevant signals from persisted `SessionEvent.metadata.v2Event` rows.
- Exported the helper from `src/lib/classroom-v2/index.ts`.
- Updated `src/components/ParentDashboardClient.tsx` to surface:
  - a student-level structured-signal summary in the existing progress area,
  - per-session progress-hook cards showing practice prompts, student attempts, board submissions, and tutor feedback moments from V2 metadata.
- Added `.planning/04-03-PLAN.md` and refreshed `.planning/STATE.md` for this slice.

## Slice outcome
04-03 adds a compatibility-safe progress hook seam on top of the 04-01/04-02 review substrate:
- structured tutor/student/session events now produce reviewable progress signals,
- parents can inspect recent practice opportunities and answer evidence without reading raw logs,
- the progress area acknowledges V2 event-derived hooks while preserving existing mastery bars,
- no runtime cutover, schema migration, or broad classroom rewrite was required.

## Progress helper behavior
`src/lib/classroom-v2/progress-signals.ts` now:
1. safely reads `metadata.v2Event`,
2. derives signal cards for practice prompts, student voice attempts, student board attempts, tutor feedback, and session notices,
3. summarizes structured counts for prompts, attempts, board captures, and feedback,
4. keeps all behavior review-only when V2 metadata is absent.

## Scope discipline kept
- No `VoiceSession` rewrite
- No V2 runtime default cutover
- No schema migration
- No replacement of summary-driven `applySkillUpdates`
- No broad mastery engine or domain inference rewrite

## Build status
- `npm run build` ✅

## Review notes
Focus on:
1. `src/lib/classroom-v2/progress-signals.ts`
2. `src/components/ParentDashboardClient.tsx`
3. `.planning/04-03-PLAN.md`

Main thing to verify: parents can now see structured event-derived progress hooks in the dashboard while the existing persisted mastery path remains unchanged.
