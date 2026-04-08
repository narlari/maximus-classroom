Implemented the first app-level V2 integration seam as an isolated classroom preview mounted behind an explicit route flag.

What changed:
- Added `src/features/classroom-v2/ClassroomV2Preview.tsx` as a narrow review-only client boundary for V2.
- Added `src/lib/classroom-v2/feature-flags.ts` with a tiny explicit enable check for `?v2=1`-style flags.
- Updated `src/app/classroom/[studentId]/page.tsx` to keep legacy `VoiceSession` as the default while switching to the V2 preview only when the V2 flag is explicitly enabled.
- The preview instantiates the real `createClassroomOrchestrator(...)` and renders derived orchestrator state directly from snapshots:
  - current classroom state
  - allowed student input
  - active turn summary
  - allowed next event types
  - recent dispatch results
- Added a minimal demo interaction path that advances a lesson through the real orchestrator event flow:
  - start tutor turn
  - finish tutor rendering
  - finish tutor speaking
  - submit demo student evidence
  - begin tutor review
  - finish tutor review into a second tutor turn
- Kept adapters/runtime concerns placeholder-level only; no transcript parsing, realtime/VAD expansion, or whiteboard rebuild was added here.

Key decisions:
- Chose a route-level seam instead of touching `VoiceSession` internals so the change stays narrow and reviewable.
- Used URL gating instead of environment-only gating so reviewers can inspect the seam immediately without altering the default runtime path.
- Kept the V2 preview self-contained under `src/features/classroom-v2/` so future work can attach here instead of growing transcript-first legacy UI logic.

How to review:
- Default legacy path remains unchanged:
  - `/classroom/<studentId>`
- Explicit V2 preview path:
  - `/classroom/<studentId>?v2=1`
  - also accepts `v2=true`, `v2=yes`, `v2=on`, or `v2=preview`
- Use the preview controls to step through the orchestrator-backed demo lesson and inspect the rendered state/event surface.

Verification notes:
- Ran `npm run build`
- Result: success
