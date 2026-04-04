Implemented the V2 foundation module at `src/lib/classroom-v2/` with a focused export surface in `index.ts`.

Added typed classroom contracts in `types.ts` for:
- the shared `ClassroomState` union
- tutor turn plans and the required `TutorAction` variants
- structured student evidence for voice, board, and combined submissions
- transition event/result/error types
- student input access flags

Added pure transition logic in `transitions.ts` for:
- session creation
- explicit state transitions with guarded failure results for invalid events and invalid turn outcomes
- a readable lesson loop of `idle -> tutor_rendering -> tutor_speaking -> student_answering -> student_submitted -> tutor_reviewing`
- state-derived mic/board/submit permissions

Decisions made:
- Kept the module independent from transcript parsing, whiteboard analysis, and vendor realtime payloads.
- Required `finishTutorReview` to carry the next tutor turn when re-entering `tutor_rendering`, so the lesson loop advances without implicit state changes.
- Restricted mic and board input to `student_answering`; submitted evidence is locked once the session moves forward.
