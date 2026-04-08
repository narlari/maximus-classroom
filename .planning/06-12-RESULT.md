# 06-12-RESULT — Targeted beat recommended next action inside preview

## What changed
- Added `.planning/06-12-PLAN.md` before coding to keep scope to one tiny preview-only interpretation slice.
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` so the existing targeted-beat cue now includes a compact `Recommended next action` panel.
- The panel is derived only from existing targeted launch state, active-beat state, checklist confirmation state, and the current active beat label when helpful.
- It now tells Sung the immediate move for each targeted-review state:
  - confirm now and keep moving when the requested beat is live
  - treat the beat as complete and optionally return/continue when already confirmed
  - relaunch the targeted beat when preview has already advanced without confirmation
- Kept work browser-local and review-only, with no backend/schema/persistence changes and no legacy `VoiceSession` default runtime behavior changes.
- Updated `.planning/STATE.md` to mark 06-12 implemented/build-verified and advance the next-step pointer.

## Visible behavior change
- In targeted preview launches, the existing `Targeted beat cue` now shows `Recommended next action` between the verdict/signals block and the existing confirmation/follow-up cards.
- Sung no longer has to translate the verdict into what to do next manually.

## Exact files changed
- `.planning/06-12-PLAN.md`
- `.planning/06-12-RESULT.md`
- `.planning/STATE.md`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`

## Build status
- `npm run build` ✅

## Blocker status
- None.
