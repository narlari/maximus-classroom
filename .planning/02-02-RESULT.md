# 02-02 Result — Layered board primitives and deterministic teacher renderer

Owner: Maximus
Executor: Rex
Status: Completed
Completed: 2026-04-04

## What changed
Implemented the first reviewable layered-board V2 slice behind the canonical whiteboard boundary.

### Code changes
- Added `src/lib/classroom-v2/board.ts`
  - Introduces deterministic teacher-board scene building from `TutorAction[]`
  - Converts board actions into explicit teacher primitives
  - Supports the thin-but-real 02-02 action set:
    - `board.clearTeacherLayer`
    - `board.writeProblem`
    - `board.writeText`
    - `board.highlight`
    - `board.arrow`
    - `board.underline`
    - `board.stepBox`
- Updated `src/lib/classroom-v2/index.ts`
  - Exports the new board builder/types from the V2 seam
- Added `src/components/classroom-whiteboard/LayeredBoard.tsx`
  - Renders a deterministic teacher SVG layer
  - Renders a separate student canvas layer on top
  - Includes student-only clear behavior so teacher content persists
  - Keeps student input locked unless the orchestrator says the board is enabled
- Updated `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx`
  - Keeps the legacy path intact as default
  - Adds a V2 layered render mode so new board work lands behind the same canonical boundary chosen in 02-01
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx`
  - Swaps the preview seam from action-list-only board discussion to a real layered board rendering
  - Uses the active tutor turn's actions to render teacher visuals deterministically
  - Adds a richer review turn so reviewers can inspect step box, arrow, and underline behavior

## Why this slice matters
This is the first real V2 whiteboard seam where the board is being driven by structured tutor actions instead of transcript inference. It is still narrow:
- legacy classroom runtime remains untouched by default
- the work lands behind the existing canonical whiteboard boundary
- the review surface stays in the isolated V2 preview seam

That gives 02-03 a clean next step: package student-layer submissions and teacher context for submit/check review without having to redesign the board again.

## Review guide
1. Open the V2 preview seam:
   - `/classroom/<studentId>?v2=1`
2. Click through the preview controls.
3. Verify these checkpoints:
   - starting a tutor turn renders teacher content on the board
   - finishing tutor rendering/speaking changes whether the student layer is locked or enabled
   - student drawing appears only on the top layer
   - `Clear student layer` removes student ink without touching teacher content
   - the review turn renders deterministic primitives from actions rather than transcript text guessing

## Files changed
- `.planning/02-02-PLAN.md`
- `.planning/02-02-RESULT.md`
- `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx`
- `src/components/classroom-whiteboard/LayeredBoard.tsx`
- `src/features/classroom-v2/ClassroomV2Preview.tsx`
- `src/lib/classroom-v2/board.ts`
- `src/lib/classroom-v2/index.ts`

## Build verification
- Command: `npm run build`
- Result: passed
