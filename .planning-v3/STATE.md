# Project State: Maximus Classroom V3

## Project Reference
See: .planning-v3/PROJECT.md
**Core value:** A child opens the app and gets a real, structured, visual math lesson from an AI tutor.
**Current focus:** MVP — Phase 1: Core Classroom Loop

## Current Position
Phase: 1 of 4
Plan: 5 of 6 (in progress)
Status: Plan 01-04 MERGED ✅. Rex kicked on 01-05 (full loop wiring) — session: swift-sable
Last activity: 2026-04-07 20:09 PT — Rex kicked on v3/01-05-full-loop

Progress: [█████░░░░░] 67%

## What Exists Right Now
- tldraw v4 installed and spike verified (src/components/whiteboard-spike/TldrawSpike.tsx, /spike route)
- V2 orchestrator core (src/lib/classroom-v2/types.ts, transitions.ts, orchestrator.ts) — reusable
- V1 Supabase schema (sessions, events, students) — reusable
- V1 parent dashboard shell — needs rework for V3 data model
- V1 VoiceSession component — will be replaced, not modified

## Accumulated Context

### Decisions
- [PRD] tldraw v4 replaces Excalidraw — spike confirmed all capabilities
- [PRD] Claude Sonnet for lesson generation, GPT-4o for vision evaluation, OpenAI TTS for speech
- [PRD] Teacher/student layer separation via shape ID prefix (shape:teacher-*)
- [PRD] Classroom first, onboarding later
- [PRD] MVP user is Sung pretending to be 4th grader — no voice input yet
- [PRD] Maximus verifies every feature before Sung tests — no "it should work" handoffs
- [PRD] Psych eval + adaptive teaching approach confirmed for Phase 3

### V2 Heritage
- types.ts ClassroomState/TutorAction/StudentEvidence types are solid, may need minor refactor
- orchestrator.ts dispatch/adapter pattern is clean, keep it
- transitions.ts state machine is sound
- Everything else from V2 (review tooling, progress hints, preview cockpit) gets archived

### Completed
- 01-01: Lesson generation engine + board shape contract ✅ (merged to main)
  - src/lib/classroom-v3/types.ts, lesson-generator.ts, board-renderer.ts, index.ts
  - src/app/api/lesson/generate/route.ts
- 01-02: Classroom UI + tldraw integration ✅ (merged to main)
  - src/app/classroom-v3/page.tsx
  - src/components/classroom-v3/ClassroomV3.tsx, ClassroomWhiteboard.tsx, LessonControls.tsx
  - /classroom-v3 route renders tldraw + lesson controls, build passes clean
- 01-03: TTS voice ✅ (merged to main)
  - src/lib/classroom-v3/tts.ts — speakText() via OpenAI nova voice
  - src/app/api/tts/speak/route.ts — POST endpoint, returns audio/mpeg
  - ClassroomV3.tsx updated to call speakText on lesson narration
  - Build passes, /api/tts/speak in route table

### Pending
- 01-04: Vision evaluation ✅ (merged to main)
  - src/lib/classroom-v3/vision-eval.ts — evaluateStudentWork() via GPT-4o vision
  - src/app/api/lesson/evaluate/route.ts — POST endpoint
  - ClassroomV3.tsx + LessonControls.tsx updated with Check My Work flow
- 01-05: Full loop wiring (Rex running on v3/01-05-full-loop, session: swift-sable)
- 01-06: Session persistence
- Archive .planning/ to .planning-v2-archive/
- Remove Excalidraw dependency after tldraw is integrated in main classroom view

### Risks
- Vision API accuracy on handwritten math — need to test how well GPT-4o reads sloppy drawing
- TTS latency — if too slow, lesson pacing feels broken. Need to test streaming TTS.
- tldraw bundle size (526KB) — may need code splitting for mobile performance
- Lesson generation quality — Claude Sonnet needs careful prompting to produce structured lesson plans that translate to board actions
- tldraw screenshot API — need to verify which capture method works in v4 (getSvgElement vs toSvg)

## Session Continuity
Last session: 2026-04-07 20:09 PT
Stopped at: Rex kicked on v3/01-05-full-loop (session: swift-sable)
Next: Verify 01-05 commit + build, merge, write 01-06 (session persistence), kick Rex
