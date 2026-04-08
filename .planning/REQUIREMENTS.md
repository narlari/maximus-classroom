# Maximus Classroom V2 — Requirements

Last updated: 2026-04-03
Status: Active

## Functional Requirements

### ORCH — Tutor Orchestrator
- **ORCH-001** The system must generate structured tutor turns composed of explicit actions.
- **ORCH-002** Tutor actions must support at minimum: `speak`, `ask`, `board.writeProblem`, `board.writeText`, `board.highlight`, `board.arrow`, `board.underline`, `board.stepBox`, `board.clearTeacherLayer`.
- **ORCH-003** Tutor turns must be validated against classroom rules before rendering.
- **ORCH-004** The live classroom must render from tutor actions, not transcript inference.

### STATE — Classroom State Machine
- **STATE-001** The classroom must support these states: `idle`, `tutor_rendering`, `tutor_speaking`, `student_answering`, `student_submitted`, `tutor_reviewing`, `ended`.
- **STATE-002** During `tutor_rendering` and `tutor_speaking`, student mic must be closed/ignored.
- **STATE-003** During `student_answering`, student mic and board input must be enabled.
- **STATE-004** Student board analysis must not run until explicit submit/check.
- **STATE-005** Tutor responses must only be emitted during valid transitions.

### BOARD — Whiteboard V2
- **BOARD-001** The board must have separate teacher and student layers.
- **BOARD-002** Teacher layer must be programmatic and persistent independent of student actions.
- **BOARD-003** Student layer must support free draw, erase, clear, and submit.
- **BOARD-004** Teacher layer must support problems, examples, highlights, arrows, underlines, step labels/boxes, number lines, simple arrays/grids, and fraction primitives.
- **BOARD-005** Student clear/erase actions must never destroy teacher content.
- **BOARD-006** Student submission must snapshot only the student layer plus relevant teacher context.

### VOICE — Speech Under Orchestration
- **VOICE-001** Tutor speech must render from orchestrator actions.
- **VOICE-002** Tutor voice must not be interruptible by casual background noise/coughs during tutor-owned states.
- **VOICE-003** Student speech must only be captured during allowed student turn states.
- **VOICE-004** Voice transcription must be locked to English for MVP.
- **VOICE-005** Voice transport/provider details must stay replaceable beneath the orchestration layer.

### ANSWER — Student Response Flow
- **ANSWER-001** Student may answer by voice, board, or both.
- **ANSWER-002** Board review must be submit-driven, not continuously reactive.
- **ANSWER-003** Tutor review must consume structured evidence from student input and produce the next structured turn.
- **ANSWER-004** The system must support the tutor showing follow-up correction steps directly on the teacher layer.

### PARENT — Parent Review Surface
- **PARENT-001** Parent view must include session list.
- **PARENT-002** Parent view must include summaries.
- **PARENT-003** Parent view must include full transcripts.
- **PARENT-004** Parent view must include key session events.
- **PARENT-005** Parent view must include child progress by skill.

### UX — Kid Experience
- **UX-001** Kid classroom UI must show only avatar/status, core controls, whiteboard, and student tools.
- **UX-002** Kid classroom UI must not show transcripts.
- **UX-003** Kid classroom UI must avoid scroll-based workflow during active session.
- **UX-004** Turn ownership must be visually legible to a child.

## Non-Functional Requirements
- **NFR-001** V2 should reuse the existing app shell and logging infrastructure where possible.
- **NFR-002** V2 should collapse duplicate whiteboard architectures into one coherent implementation path.
- **NFR-003** Core contracts must be documented clearly enough for Rex to implement in atomic steps.
- **NFR-004** V2 execution must avoid direct work on main without PR review.

## Success Criteria
- **SC-001** Maximus visibly teaches with the board rather than merely talking.
- **SC-002** Board content appears as part of tutor turns, not after-the-fact transcript parsing.
- **SC-003** Kids can clearly tell when it is their turn.
- **SC-004** Background audio does not derail tutor speech.
- **SC-005** Parent transcript/event review remains accurate.

## Out of Scope for V2 MVP
- public billing/payments
- multiplayer/shared classrooms
- Korean mode
- full handwriting synthesis
- advanced gamified economy
- public launch hardening beyond family/friends needs
