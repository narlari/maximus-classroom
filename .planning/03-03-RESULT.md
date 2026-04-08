# 03-03-RESULT — Normalize student voice evidence into tutor-review inputs

## What changed
- Extended `src/lib/classroom-v2/types.ts` so V2 voice evidence now carries:
  - `normalizedTranscript`
  - optional transcript `segments`
  - optional `reviewContext`
- Updated `src/lib/classroom-v2/review.ts` with V2 voice-review helpers:
  - `createVoiceSubmissionEvidence(...)`
  - `normalizeStudentVoiceTranscript(...)`
  - `combineStudentEvidence(...)`
- Updated `src/features/classroom-v2/ClassroomV2Preview.tsx` so reviewers can:
  - submit a spoken-answer transcript during the student turn,
  - inspect the normalized voice artifact,
  - see combined voice+board evidence when a board submission happens after voice packaging.
- Added planning docs for this slice.

## Slice outcome
03-03 now gives the V2 seam a real spoken-answer packaging path:
- raw transcript text is normalized before review packaging
- the voice evidence retains lesson/turn/prompt context via the existing tutor-review context shape
- tutor review can consume voice-only evidence or combined voice+board evidence through the same `StudentEvidence` union
- all of this stays preview/V2 scoped without changing the default classroom runtime

## Scope discipline kept
- No full runtime cutover
- No legacy `VoiceSession` refactor
- No parent dashboard work
- No whiteboard redesign
- No unrelated cleanup

## Review notes
Reviewers should focus on:
1. `src/lib/classroom-v2/types.ts`
2. `src/lib/classroom-v2/review.ts`
3. `src/features/classroom-v2/ClassroomV2Preview.tsx`
4. `.planning/03-03-PLAN.md`

Main thing to verify: spoken student answers now become structured, reviewable evidence under the V2 seam, analogous to explicit board submit/check packaging.
