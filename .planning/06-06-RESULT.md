# 06-06-RESULT — Route-to-preview review resume handoff

## What changed
- Added `.planning/06-06-PLAN.md` before implementation to lock the slice.
- Extended `src/lib/classroom-v2/review-memory.ts` with a tiny launch-handoff shape plus helper to append remembered review mode / target beat onto the preview launch URL.
- Updated `src/features/classroom-v2/ClassroomV2ReviewMemoryCard.tsx` so the real classroom route now launches the V2 preview with the remembered start / continue / re-check handoff instead of only showing route-level guidance.
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` so preview reads that handoff, shows an entry banner acknowledging the remembered review mode, highlights the launch-target checklist beat immediately, and prepositions the browser-local demo state to the remembered review beat for continue / re-check flows.
- Updated `.planning/STATE.md` to record 06-06 and frame the next narrow slice.

## Visible reviewable behavior change
- Launching V2 preview from the real classroom route now carries the remembered review mode into preview itself.
- If no remembered review progress exists, preview opens as a fresh start pass and says so.
- If the remembered review pass is partial, preview opens already positioned at the next unconfirmed beat instead of dropping Sung back at the cold start.
  - Example: if the next beat is the student turn, preview opens with the student turn already active.
  - If the next beat is the review handoff, preview opens with submitted evidence already captured and the handoff beat visible.
- If the remembered pass is complete, preview opens framed as a re-check / confidence pass and lands directly on the lesson-close posture.
- The guided checklist still behaves the same; it is now just pointed at the right beat immediately on entry.

## Why this stayed narrow
- Legacy `VoiceSession` remains the default classroom runtime.
- No backend, schema, persistence, or database changes.
- No legacy runtime behavior changes.
- The work stayed local to the route launcher / preview seam plus browser-local review memory helpers.

## Exact files changed for 06-06
- `.planning/06-06-PLAN.md`
- `.planning/06-06-RESULT.md`
- `.planning/STATE.md`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`
- `src/features/classroom-v2/ClassroomV2ReviewMemoryCard.tsx`
- `src/lib/classroom-v2/review-memory.ts`

## Build status
- `npm run build` ✅

## Concise manual review path
1. Open `/classroom/<studentId>` with no remembered review memory and launch V2 preview. Confirm the preview entry banner frames this as a fresh start pass.
2. In preview, confirm only the first beat or two, return to `/classroom/<studentId>`, then launch again. Confirm the preview opens already positioned at the next unconfirmed beat and the matching checklist item is highlighted as the launch target.
3. Finish the full checklist, return to `/classroom/<studentId>`, and launch again. Confirm the preview opens as a re-check / confidence pass with the lesson-close posture already visible.
4. Use the route-level return control and confirm the classroom still falls back to legacy `VoiceSession` by default.
