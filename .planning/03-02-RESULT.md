# 03-02-RESULT — Enforce state-aware mic/session rules

## What changed
- Added `src/lib/classroom-v2/realtime-policy.ts` as the single V2 policy seam for mic/session ownership.
- Updated `src/lib/classroom-v2/realtime-adapter.ts` so the orchestration adapter now applies an explicit state-derived session policy instead of only flipping `setMicMuted(...)` from raw student-input flags.
- Updated `src/lib/realtime.ts` so the browser realtime transport exposes session-policy application and can clear buffered student audio when V2 closes/ignores capture.
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` to:
  - apply the initial idle policy,
  - show the effective policy in the preview,
  - show adapter-issued policy commands in the command log.
- Updated `src/lib/classroom-v2/index.ts` exports.

## Slice outcome
03-02 now makes tutor-turn ownership more real through the adapter seam without cutting over the legacy classroom:
- tutor-owned states apply a closed/ignored student voice policy
- `student_answering` is the only active-capture state
- the adapter now speaks in policy terms (`applySessionPolicy`) instead of scattered mic-only toggles
- the browser transport can flush stale buffered student audio when policy closes capture, reducing leftover/non-turn audio bleed

## Scope discipline kept
- Legacy `VoiceSession` behavior remains untouched by default
- No 03-03 voice evidence normalization work was started
- No full runtime cutover was attempted
- No broader UI/whiteboard redesign was introduced

## Review notes
Reviewers should focus on:
1. `src/lib/classroom-v2/realtime-policy.ts`
2. `src/lib/classroom-v2/realtime-adapter.ts`
3. `src/lib/realtime.ts`
4. the policy readout / command log updates in `src/features/classroom-v2/ClassroomV2Preview.tsx`

The main thing to verify is that V2 now owns voice-capture intent from classroom state, not from ad hoc component status logic.
