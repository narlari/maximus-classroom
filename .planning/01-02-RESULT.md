Implemented the first V2 orchestrator surface at `src/lib/classroom-v2/orchestrator.ts` on top of the existing contract + transition work.

What changed:
- Added `ClassroomOrchestrator` and `createClassroomOrchestrator(...)` as the first stateful V2 engine wrapper.
- Added a bounded `dispatch(...)` flow for the existing classroom transition events:
  - `classroom.startTutorTurn`
  - `classroom.finishTutorRendering`
  - `classroom.finishTutorSpeaking`
  - `classroom.submitStudentEvidence`
  - `classroom.beginTutorReview`
  - `classroom.finishTutorReview`
  - `classroom.endLesson`
- Added a derived snapshot shape that exposes:
  - current classroom state
  - active turn
  - allowed student input flags
  - allowed next event types
- Added explicit adapter seams for future voice, board, logging, and student-input integrations without binding the core engine to browser or vendor runtime details.
- Updated `src/lib/classroom-v2/index.ts` to export the orchestrator surface.

Key decisions:
- Kept the orchestrator intentionally thin: it delegates all state legality to `transitionClassroom(...)` and only owns session state, snapshot derivation, and adapter notifications.
- Reused the typed transition events as the dispatcher contract instead of inventing a second command layer this early.
- Triggered adapter notifications from state changes / turn changes / student input access changes so later UI wiring can stay transcript-independent.
- Avoided touching legacy realtime/session UI code in this phase to preserve scope and build safety.

Verification notes:
- Ran `npm run build`
- Result: success
