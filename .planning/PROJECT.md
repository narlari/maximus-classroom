# Maximus Classroom V2 — Project

Last updated: 2026-04-03
Owner: Maximus
Executor: Rex
Status: Planning complete for Phase 1 handoff

## Product Intent
Build a tablet-first tutoring classroom where Maximus teaches like a real teacher:
- the board is the teaching surface
- tutor voice and whiteboard actions stay synchronized
- turn-taking is explicit and kid-friendly
- parents get full transcripts and review artifacts without cluttering the kid UI

## Problem Statement
V1 proved the shell, voice transport, logging, and parent review scaffolding, but the live classroom core is the wrong shape. Voice currently drives the lesson, and the whiteboard reacts to transcripts. That architecture cannot reliably deliver deliberate teacher behavior, clean turns, or deterministic board teaching.

## V2 Product Thesis
The classroom must be driven by a structured tutor engine. Voice and board are renderers of the same plan, not separate systems trying to infer each other.

## Locked Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-001 | V2 replaces transcript-first classroom logic as the main path | V1 architecture is fundamentally mismatched to the desired teacher experience |
| D-002 | Source of truth is a structured tutor orchestrator | Needed for deterministic voice + board synchronization |
| D-003 | Whiteboard uses separate teacher and student layers | Prevents destructive overlap and allows targeted analysis |
| D-004 | Classroom turn-taking is explicit via a state machine | Required to stop interruptions and make kid turns obvious |
| D-005 | Transcript is a parent/debug artifact, not a live classroom UI primitive | Prevents transcript-driven board hacks and UI clutter |
| D-006 | OpenAI Realtime may stay as transport only if wrapped beneath orchestration | Keeps current infra value without letting VAD control lesson flow |
| D-007 | Kid screen stays minimal | Matches Sung feedback and real tablet usage |

## Constraints
- Must preserve the useful parts of the current app: Next.js shell, SQLite logging, parent dashboard foundation, student/profile scaffolding, deployment/systemd shape
- Must avoid major new platform scope (billing, multiplayer, Korean mode)
- Must produce reviewable progress in steps Rex can ship safely
- Existing repo has in-flight uncommitted code changes; planning should avoid entangling with them until execution begins on a clean branch

## Architecture Baseline
### Keep
- `src/lib/db.ts`
- session/event logging flow
- `src/app/parent/page.tsx`
- `src/components/ParentDashboardClient.tsx`
- `src/lib/realtime.ts` as transport utility if still useful

### Replace / Rebuild
- `src/components/VoiceSession.tsx` classroom control flow
- transcript-driven teacher behavior in `src/components/SimpleCanvas.tsx`
- inferred board logic in `src/components/SharedWhiteboardClient.tsx`
- prompt-led lesson control in `src/lib/tutor.ts`
- current realtime session assumptions in `src/app/api/realtime/session/route.ts`

## Delivery Strategy
1. Define the new authoritative classroom contract (actions, states, event flow)
2. Build a thin V2 skeleton around that contract before deep feature work
3. Move whiteboard and voice under the orchestrator one at a time
4. Preserve logs/transcripts/parent review while removing them from live rendering logic

## Review Standard
V2 is reviewable when a session visibly shows:
- teacher board content appears deliberately
- tutor and board stay in sync
- student input opens only when it is actually the student’s turn
- board submission leads to a structured tutor review step
- parent review data is still available and accurate
