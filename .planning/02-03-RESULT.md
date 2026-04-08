# 02-03 Result — Submit/check snapshots and evidence packaging

Owner: Maximus
Executor: Rex
Status: Completed
Completed: 2026-04-04

## What changed
Implemented the narrowest reviewable 02-03 slice inside the existing V2 preview seam and canonical whiteboard boundary.

### Code changes
- Added `src/lib/classroom-v2/review.ts`
  - introduces an intentional packaging helper for board submissions
  - builds review-ready board evidence from:
    - isolated student-layer snapshot
    - captured student strokes
    - active tutor-turn context
- Updated `src/lib/classroom-v2/types.ts`
  - extends board evidence with review-oriented shape:
    - `snapshot` metadata/data URL for the explicit student-layer capture
    - `reviewContext` carrying the active lesson/turn/actions/prompt at capture time
- Updated `src/lib/classroom-v2/index.ts`
  - exports the new review packaging helper through the V2 seam
- Updated `src/components/classroom-whiteboard/LayeredBoard.tsx`
  - retains student strokes while drawing
  - adds explicit `Check my work` and `Submit work` controls in the V2 layered board mode
  - captures the isolated student layer to a PNG data URL on submit/check
  - emits packaged submission payloads without touching legacy whiteboard behavior
- Updated `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx`
  - threads V2 board submit/check callbacks through the canonical boundary
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx`
  - removes the demo-only evidence button as the primary review path
  - consumes real board-level submit/check submissions
  - dispatches `classroom.submitStudentEvidence` with packaged evidence from the active turn
  - exposes a review panel showing that the packaged artifact contains snapshot + teacher context intentionally

## Reviewable artifact
Open:
- `/classroom/<studentId>?v2=1`

Then review this flow:
1. Start the demo tutor turn
2. Advance until the classroom reaches `student_answering`
3. Draw on the student layer
4. Click `Check my work` or `Submit work` on the board
5. Confirm:
   - the orchestrator moves to `student_submitted`
   - retained student evidence now includes a board `snapshot`
   - retained student evidence now includes `reviewContext`
   - the packaged review artifact panel shows:
     - submission id
     - snapshot dimensions/stroke count
     - lesson id
     - turn id
     - state at capture
     - prompt and teacher action count
6. Click `Begin tutor review` and continue the seam review if desired

## Why this slice matters
This lands the submit/check seam without forcing live runtime cutover:
- student work is captured explicitly from the isolated student layer
- teacher context from the active tutor turn is packaged alongside that submission
- the current V2 preview seam now exposes enough detail for a reviewer to verify the evidence object shape directly
- legacy classroom behavior remains the default path

## Files changed
- `.planning/02-03-PLAN.md`
- `.planning/02-03-RESULT.md`
- `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx`
- `src/components/classroom-whiteboard/LayeredBoard.tsx`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`
- `src/lib/classroom-v2/index.ts`
- `src/lib/classroom-v2/review.ts`
- `src/lib/classroom-v2/types.ts`

## Build verification
- Command: `npm run build`
- Result: passed
