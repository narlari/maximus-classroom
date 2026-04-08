# 06-07-RESULT — Route-level targeted review beat launcher

## What changed
- Added `.planning/06-07-PLAN.md` before implementation to lock the slice.
- Extended `src/lib/classroom-v2/review-memory.ts` so the existing review launch handoff can also represent explicit targeted beat launches using the same preview query-param seam.
- Updated `src/features/classroom-v2/ClassroomV2ReviewMemoryCard.tsx` so the real classroom route now shows direct launch links for each review beat:
  - teacher setup
  - student turn
  - review handoff
  - lesson close
- Kept the existing remembered start / continue / re-check launcher intact.
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` so preview parses the targeted-launch flag, opens directly at the requested beat through the existing prepositioning logic, and clearly announces when it was opened for targeted beat review.
- Updated `.planning/STATE.md` to record 06-07 and frame the next narrow slice.

## Visible reviewable behavior change
- From the real classroom route, Sung can now jump straight into one specific V2 review beat instead of replaying earlier beats first.
- The original remembered launcher still works the same for start / continue / re-check flows.
- When a beat-specific launcher is used, preview shows an explicit targeted-review entry banner and names the requested beat.
- The targeted beat is immediately in view on entry, while legacy `VoiceSession` still remains the default classroom runtime outside explicit preview launch.

## Why this stayed narrow
- No backend, schema, database, or persistence changes.
- No legacy runtime default changes.
- No broad preview redesign.
- Reused the existing route-to-preview handoff / query-param path instead of introducing a separate launch mechanism.

## Exact files changed for 06-07
- `.planning/06-07-PLAN.md`
- `.planning/06-07-RESULT.md`
- `.planning/STATE.md`
- `src/lib/classroom-v2/review-memory.ts`
- `src/features/classroom-v2/ClassroomV2ReviewMemoryCard.tsx`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`

## Build status
- `npm run build` ✅

## Concise manual review path
1. Open `/classroom/<studentId>` and confirm the existing remembered V2 launcher still appears unchanged.
2. In the same route card, click `Teacher setup`, `Student turn`, `Review handoff`, or `Lesson close` under the new direct beat launch section.
3. Confirm preview opens directly at the requested beat and shows a targeted-review banner naming that beat.
4. Use the normal remembered launcher as well and confirm start / continue / re-check behavior still works as before.
5. Return to the classroom route and confirm the app still defaults back to legacy `VoiceSession` unless preview is explicitly launched.
