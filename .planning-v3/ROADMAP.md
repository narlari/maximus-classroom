# Roadmap: Maximus Classroom V3

## Milestones
- 🚧 **MVP** — Phases 1-2 (in progress). Sung-as-student, full classroom loop, parent dashboard.
- 📋 **Kids Beta** — Phases 3-4. Voice input, onboarding, psych eval, adaptive teaching.
- 📋 **Public** — Phase 5+. Payments, multi-district curriculum, scaling.

## Phases

### Phase 1: Core Classroom Loop
**Goal:** Sung can open the app, see Maximus draw a math problem on the whiteboard, submit an answer, and get evaluated — one full teaching cycle, end to end.
**Depends on:** Nothing (fresh start with V2 orchestrator core + tldraw spike)
**Requirements:** LESSON-01 to LESSON-05, BOARD-01 to BOARD-08, VOICE-01 to VOICE-03, EVAL-01 to EVAL-05, STATE-01 to STATE-04, UX-01 to UX-04, DATA-01 to DATA-02
**Success Criteria:**
  1. Maximus generates a lesson plan for "4th grade subtraction with regrouping"
  2. Maximus draws the first problem on the tldraw whiteboard programmatically
  3. Maximus speaks the problem prompt via TTS
  4. Student (Sung) draws an answer and clicks Submit
  5. Vision API evaluates the submission and returns correct/incorrect
  6. Maximus responds — praise + next problem OR correction on the board
  7. Full lesson (3 problems) completes without crashes
  8. Session events are logged to database
**Plans:** TBD (estimated 6-8 plans)

### Phase 2: Parent Dashboard + Session Review
**Goal:** Parent can view a complete record of every session including what Maximus taught, what the child drew, and how they did.
**Depends on:** Phase 1
**Requirements:** PARENT-01 to PARENT-04, DATA-03, DATA-04, UX-05
**Success Criteria:**
  1. Parent dashboard lists all completed sessions
  2. Each session shows chronological transcript of lesson events
  3. Board screenshots of every student submission are visible
  4. Maximus-generated session summary is displayed
  5. No transcript or evaluation data leaks into the kid classroom UI
**Plans:** TBD (estimated 3-4 plans)

### Phase 3: Kids Beta — Voice + Onboarding
**Goal:** Ariana and Liam can actually use the app with voice interaction and get a personalized learning experience.
**Depends on:** Phase 1, Phase 2
**Requirements:** P3-VOICE-01 to P3-VOICE-02, P3-ONBOARD-01 to P3-ONBOARD-03, P3-EVAL-01, P3-UX-01 to P3-UX-03
**Success Criteria:**
  1. Child speaks answers and Maximus understands them
  2. Mic is locked during Maximus speaking — no accidental interruptions
  3. Onboarding interview runs and produces a learner profile
  4. Lesson generation adapts based on learner profile
  5. Ability evaluation places child at correct difficulty level
  6. Frustration and idle detection work without false positives
**Plans:** TBD (estimated 8-10 plans)

### Phase 4: Curriculum + Polish
**Goal:** App is ready for friends/family testing with proper curriculum alignment.
**Depends on:** Phase 3
**Requirements:** Future requirements (curriculum pacing, multi-student, polish)
**Plans:** TBD

## Progress
| Phase | Milestone | Status |
|---|---|---|
| Phase 1 | MVP | In planning |
| Phase 2 | MVP | Not started |
| Phase 3 | Kids Beta | Not started |
| Phase 4 | Public | Not started |
