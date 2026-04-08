# Maximus Classroom V2 — Roadmap

Last updated: 2026-04-03

## Phase 1 — Engine Spec + Skeleton
**Goal:** Establish the authoritative V2 classroom contract before deeper rebuild work.

### Deliverables
- tutor action schema/types
- classroom state machine/types
- orchestrator skeleton with guarded transitions
- initial event flow wiring for a V2 path
- planning docs that make execution unambiguous

### Depends on
- PRD-V2
- ARCHITECTURE-AUDIT

### Success Criteria
- repo contains explicit V2 contracts for actions, turns, and states
- a V2 engine path exists in code, even if feature-thin
- transcript-driven live behavior is no longer the only possible control model

### Plans
- **01-01** Define shared V2 contracts and state transition rules
- **01-02** Implement orchestrator skeleton and event dispatcher
- **01-03** Create a thin V2 classroom integration path guarded behind a feature flag or isolated component boundary

## Phase 2 — Whiteboard V2
**Goal:** Make the board a real teaching surface.

### Deliverables
- teacher layer + student layer separation
- deterministic teacher renderer for core math actions
- submit/check student workflow
- one chosen whiteboard implementation path

### Depends on
- Phase 1

### Success Criteria
- teacher content persists independently from student work
- student clear/submit affects only student work
- tutor can render examples/problems/highlights intentionally

### Plans
- **02-01** Choose/freeze single whiteboard architecture and remove dual-path ambiguity
- **02-02** Build layered board primitives and renderer
- **02-03** Wire submit/check snapshots and evidence packaging

## Phase 3 — Voice Integration Under Orchestrator
**Goal:** Demote voice beneath the classroom engine.

### Deliverables
- tutor speech emitted from orchestrator actions
- strict tutor-turn ownership
- student voice window opened only in allowed states
- interruption handling aligned to state machine

### Depends on
- Phase 1
- Phase 2 minimally for board coordination

### Success Criteria
- tutor speech and board actions render from same turn object
- random background audio does not cut tutor flow
- student speaking outside turn is ignored or deferred

### Plans
- **03-01** Wrap existing realtime transport behind orchestration adapter
- **03-02** Enforce state-aware mic/session rules
- **03-03** Normalize student voice evidence into tutor-review inputs

## Phase 4 — Evaluation + Parent Review
**Goal:** Keep parent trust and review visibility while V2 loop matures.

### Deliverables
- transcript/event correctness pass
- student submission review artifacts
- parent dashboard accuracy/polish for V2 session data

### Depends on
- Phases 1–3

### Success Criteria
- transcripts still store cleanly
- key events align with actual turn flow
- parent can review what happened without relying on kid UI

### Plans
- **04-01** Align event logging with V2 states/actions
- **04-02** Expose full transcript and key events clearly in parent review
- **04-03** Add progress hooks tied to structured lesson events

## Phase 5 — Product Polish
**Goal:** Make V2 feel alive, not merely correct.

### Deliverables
- teacher write/reveal animation polish
- stronger pacing and lesson flow
- better child-facing cues and session feel

### Depends on
- Phases 1–4

### Success Criteria
- reviewable V2 feels teacher-like
- pacing and board interaction look intentional
- remaining issues are polish, not architecture

## Recommended Execution Order
1. Finish Phase 1 planning + contracts
2. Hand Rex Phase 1 first implementation slice (01-01)
3. Verify outputs before opening Phase 2
4. Use Phase 2 as the first major reviewable visual milestone
