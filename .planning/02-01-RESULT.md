Implemented a narrow whiteboard architecture freeze for V2 and removed the repo ambiguity between the active canvas path and the unused transcript-inference path.

What changed:
- Added `src/lib/whiteboard-architecture.ts` as the explicit source of truth for the chosen pre-02-02 whiteboard architecture.
- Added `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx` as the named app boundary around the active `SimpleCanvas` implementation.
- Updated `src/components/VoiceSession.tsx` to use `CanonicalWhiteboard` instead of importing `SimpleCanvas` directly.
- Updated whiteboard snapshot logging metadata to emit `legacy-canvas-student-surface`, so runtime events now match the chosen architecture instead of the stale `shared_whiteboard` label.
- Added an architecture-freeze panel to `src/features/classroom-v2/ClassroomV2Preview.tsx` so the V2 review seam shows the current board decision in-app.
- Marked the unused transcript-inference path as deprecated in:
  - `src/components/SharedWhiteboard.tsx`
  - `src/components/SharedWhiteboardClient.tsx`
  - `src/lib/whiteboard.ts`
  - `src/app/api/whiteboard/draw/route.ts`

Decision made:
- V2 carries forward the active canvas whiteboard path as the canonical pre-02-02 board surface.
- The Excalidraw/transcript-inference path is not a second V2 direction; it is now explicitly retained only as temporary reference material until 02-02 replaces the current surface with real layered primitives.

Why this is the highest-leverage narrow slice:
- it removes uncertainty without forcing a rebuild early
- it preserves current classroom behavior
- it gives 02-02 a clear place to land: the canonical whiteboard boundary and architecture contract already exist

Verification:
- Ran `npm run build`
- Result: success
- Build summary:
  - `✓ Compiled successfully`
  - `✓ Generating static pages (9/9)`
  - classroom route built successfully: `/classroom/[studentId]`
