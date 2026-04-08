# 06-14-RESULT — Targeted beat return-vs-replay guidance inside preview

## What changed
- Added `.planning/06-14-PLAN.md` before coding to keep scope to one tiny preview-only return-guidance slice.
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` so the existing targeted-beat cue now includes a compact `Return to classroom route?` panel.
- The new panel is derived only from the existing targeted launch and checklist state:
  - whether the requested beat is already confirmed
  - whether the requested beat is active now
  - whether another review beat remains unresolved after this checkpoint
- Kept work browser-local and review-only, with no backend/schema/persistence changes and no legacy `VoiceSession` default runtime behavior changes.
- Updated `.planning/STATE.md` to mark 06-14 implemented/build-verified and point to the next narrow targeted-review seam candidate.

## Visible behavior change
- In targeted preview launches, the existing `Targeted beat cue` now says explicitly whether it is safe to return to the real classroom route.
- If the requested beat is still open now, the cue says to stay in preview and confirm it first.
- If preview has already advanced past an unconfirmed requested beat, the cue says replay is recommended before returning.
- Non-targeted launches remain unchanged.

## Exact files changed
- `.planning/06-14-PLAN.md`
- `.planning/06-14-RESULT.md`
- `.planning/STATE.md`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`

## Build status
- `npm run build` ✅

## Blocker status
- None.
