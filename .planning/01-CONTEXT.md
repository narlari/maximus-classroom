# 01-CONTEXT — Engine Spec + Skeleton

Last updated: 2026-04-03
Phase owner: Maximus
Phase executor: Rex

## Phase Goal
Create the authoritative V2 classroom contract so the rebuild starts from explicit types, rules, and boundaries instead of continued patching of the transcript-first path.

## What This Phase Is
This phase is about **system shape**, not polished tutoring behavior.

Rex should leave behind a thin but real V2 backbone:
- shared action/state/turn contracts
- guarded transition rules
- an orchestrator skeleton that can emit and consume structured events
- clear seams for board and voice adapters

## What This Phase Is Not
- not the full whiteboard rebuild
- not polished teacher rendering
- not final voice turn enforcement
- not parent dashboard polish

## Locked Inputs
- Source of truth is the orchestrator, not the transcript stream.
- Voice and board render from the same structured turn/actions.
- Whiteboard must eventually split into teacher and student layers.
- Transcript stays as a log/review artifact.
- Kid-facing live session remains minimal.

## Existing Code Reality
Relevant current files:
- `src/components/VoiceSession.tsx`
- `src/components/SimpleCanvas.tsx`
- `src/components/SharedWhiteboardClient.tsx`
- `src/lib/tutor.ts`
- `src/lib/realtime.ts`
- `src/app/api/realtime/session/route.ts`

These files represent the legacy path. Rex should avoid deepening their transcript-first assumptions.

## Phase Output Standard
By the end of Phase 1, another engineer should be able to answer:
- what are the valid classroom states?
- what actions can the tutor emit?
- where does turn ownership live?
- how do voice and board plug into the engine?
- what is the intended migration seam from the current classroom UI?

## Discretion Areas for Rex
- exact file locations for new V2 types/modules
- whether the first V2 engine lives in `src/lib/` or a small `src/features/classroom-v2/` area
- whether to use reducer, XState-style pattern, or plain state transition helpers, as long as rules remain explicit and testable

## Must Preserve
- existing app shell must continue to build
- current logging/parent surfaces should not be broken by Phase 1 work
- no direct main-branch workflow; work must be PR-friendly
