# 01-RESEARCH — Engine Spec + Skeleton

Last updated: 2026-04-03

## Findings from Architecture Audit
1. The live lesson loop currently has no orchestrator.
2. `VoiceSession` stores tutor transcript state, not tutor action state.
3. `SimpleCanvas` and `SharedWhiteboardClient` both infer visuals from transcript text or keywords.
4. Realtime VAD + automatic response creation currently owns key turn boundaries.
5. Whiteboard analysis is asynchronous and after-the-fact rather than part of a formal turn model.

## Implications for Phase 1
- New contracts must exist independently from the current realtime transcript loop.
- The orchestrator should be introduced as an explicit, testable module before heavy UI rewrites.
- Board and voice need adapter boundaries so V2 can progressively replace legacy behavior.
- State ownership must be modeled explicitly enough that mute/open mic decisions are derived from classroom state rather than scattered side effects.

## Recommended Technical Shape
### Shared contracts
Create explicit V2 types for:
- `ClassroomState`
- `TutorAction`
- `ClassroomTurn`
- `StudentEvidence`
- `TransitionEvent`

### Transition layer
Implement pure transition helpers where possible:
- easy to reason about
- testable without audio/browser runtime
- hardens rules before UI complexity arrives

### Adapter layer
Keep engine independent from vendor/runtime details by exposing interfaces such as:
- speech renderer adapter
- board renderer adapter
- student input adapter
- logging adapter

### Integration strategy
Do not try to replace the full session flow in one plan. Instead:
1. define types + transition rules
2. create a minimal orchestrator skeleton
3. expose a narrow entry point for future UI wiring

## Open Engineering Choice
It is acceptable to implement the engine in one of these forms:
- reducer + typed actions/events
- state transition helper module
- light state machine abstraction

Avoid heavy framework churn unless it clearly improves clarity.

## Likely Files to Touch in Early Implementation
- new V2 files under `src/lib/` or `src/features/classroom-v2/`
- possibly `src/components/VoiceSession.tsx` only for a seam/placeholder hook, not a full rewrite yet

## Anti-Patterns to Avoid
- adding more transcript regex logic
- adding more realtime-triggered ad hoc `response.create` calls
- teaching logic hidden inside UI components without shared contracts
- any design that makes teacher board behavior depend on spoken text parsing
