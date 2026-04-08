# Requirements: Maximus Classroom V3

**Defined:** 2026-04-07
**Core Value:** A child opens the app and gets a real, structured, visual math lesson from an AI tutor.

## MVP Requirements

### LESSON — AI Lesson Generation
- [ ] **LESSON-01**: System generates a structured lesson plan for a given topic and grade level before the session starts.
- [ ] **LESSON-02**: Lesson plan contains 3-5 problems with hints, teaching steps, and expected answer formats.
- [ ] **LESSON-03**: Each problem specifies what Maximus should draw on the board (text, shapes, number lines, etc).
- [ ] **LESSON-04**: Lesson plan includes spoken prompts for each step (what Maximus says).
- [ ] **LESSON-05**: Lesson adapts mid-session: if student gets it wrong, Maximus reteaches before moving on.

### BOARD — Whiteboard (tldraw)
- [ ] **BOARD-01**: tldraw renders in the classroom view without SSR crashes.
- [ ] **BOARD-02**: Maximus draws problems programmatically using tldraw editor API (createShape with richText).
- [ ] **BOARD-03**: Teacher shapes are locked — student cannot move, resize, or delete them.
- [ ] **BOARD-04**: Student can draw freehand, write, erase on the student layer.
- [ ] **BOARD-05**: Student can clear their own work without affecting teacher content.
- [ ] **BOARD-06**: Student can submit their work (triggers screenshot + evaluation).
- [ ] **BOARD-07**: Board can be exported as PNG for parent review.
- [ ] **BOARD-08**: Board clears between problems (teacher layer redraws for next problem).

### VOICE — Maximus Speech
- [ ] **VOICE-01**: Maximus speaks lesson prompts via OpenAI TTS.
- [ ] **VOICE-02**: When Maximus is speaking, student input is visually indicated as "wait" (not hard-blocked in MVP).
- [ ] **VOICE-03**: Audio plays in the browser without requiring user interaction after initial session start.

### EVAL — Answer Evaluation
- [ ] **EVAL-01**: When student submits, board is screenshotted (PNG).
- [ ] **EVAL-02**: Screenshot is sent to Vision API (GPT-4o) with the problem context.
- [ ] **EVAL-03**: Vision API returns structured evaluation: correct/incorrect + explanation.
- [ ] **EVAL-04**: If correct, Maximus praises and moves to next problem.
- [ ] **EVAL-05**: If incorrect, Maximus shows correction steps on the board and explains.

### STATE — Classroom State Machine
- [ ] **STATE-01**: Classroom has explicit states: idle, tutor_teaching, student_turn, student_submitted, tutor_reviewing, ended.
- [ ] **STATE-02**: State determines what the student can do (draw, submit, wait).
- [ ] **STATE-03**: State transitions are validated — no invalid jumps.
- [ ] **STATE-04**: Session ends gracefully after lesson plan is complete or manually stopped.

### PARENT — Parent Review
- [ ] **PARENT-01**: Parent dashboard shows list of sessions.
- [ ] **PARENT-02**: Each session shows full transcript (what Maximus said, what student submitted).
- [ ] **PARENT-03**: Each session includes whiteboard screenshots of student submissions.
- [ ] **PARENT-04**: Maximus provides a brief session summary/evaluation for parents.

### UX — User Experience
- [ ] **UX-01**: Classroom layout: large whiteboard center, minimal controls, clean tablet UI.
- [ ] **UX-02**: Left sidebar or minimal menu for session controls (start, stop, back to dashboard).
- [ ] **UX-03**: Visual indicator of whose turn it is (Maximus teaching / your turn).
- [ ] **UX-04**: Submit button is prominent and obvious during student turn.
- [ ] **UX-05**: No transcript visible in kid UI (parent-only artifact).

### DATA — Data Model
- [ ] **DATA-01**: Sessions stored with student ID, date, topic, duration.
- [ ] **DATA-02**: Events stored per session: lesson steps, submissions, evaluations.
- [ ] **DATA-03**: Board screenshots stored as files/blobs with references in event records.
- [ ] **DATA-04**: Lesson plans stored for session replay/review.

## Phase 3 Requirements (Kids Testing)
- [ ] **P3-VOICE-01**: Student voice input via OpenAI Realtime API (speech-to-text during student turn).
- [ ] **P3-VOICE-02**: Mic locked during tutor speaking — no interruption from background noise.
- [ ] **P3-ONBOARD-01**: Onboarding interview — Maximus asks child about interests, learning style.
- [ ] **P3-ONBOARD-02**: Psych eval produces learner profile (visual/auditory/kinesthetic).
- [ ] **P3-ONBOARD-03**: Learner profile feeds into lesson generation — teaching approach adapts.
- [ ] **P3-EVAL-01**: Ability evaluation test on first session per topic — measures current level.
- [ ] **P3-UX-01**: Age-appropriate UI refinements for 8 and 10 year olds.
- [ ] **P3-UX-02**: Frustration detection — Maximus changes approach after repeated failures.
- [ ] **P3-UX-03**: Idle detection — "are you still there?" after timeout.

## Future Requirements
- Curriculum auto-pacing by school district (ingest public pacing guides)
- Payment/subscription system
- Korean language mode
- English tutoring (not just math)
- Animated Maximus avatar
- Real-time voice-synced board animation
- Multi-student households on one account
- Gamification / rewards / streaks

## Out of Scope
| Feature | Reason |
|---|---|
| Multiplayer | Single-student sessions only for foreseeable future |
| Handwriting recognition | Vision API reads the screenshot as an image, not OCR per stroke |
| 3D graphics | Whiteboard is 2D, period |
| Custom voice cloning | Using OpenAI's built-in TTS voices |
| Offline mode | Requires API calls — online only |

## Traceability
| Requirement | Phase | Status |
|---|---|---|
| LESSON-01 through LESSON-05 | Phase 1 | Not started |
| BOARD-01 through BOARD-08 | Phase 1 | BOARD-01 spiked ✅ |
| VOICE-01 through VOICE-03 | Phase 1 | Not started |
| EVAL-01 through EVAL-05 | Phase 1 | Not started |
| STATE-01 through STATE-04 | Phase 1 | Partial (V2 types exist) |
| PARENT-01 through PARENT-04 | Phase 2 | Partial (V1 dashboard exists) |
| UX-01 through UX-05 | Phase 1-2 | Not started |
| DATA-01 through DATA-04 | Phase 1 | Partial (V1 schema exists) |
