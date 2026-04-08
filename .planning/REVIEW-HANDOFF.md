# Maximus Classroom V2 — Review Handoff

Last updated: 2026-04-06 07:46 UTC
Owner: Maximus
Executor so far: Rex + Maximus verification
Status: Ready for Sung review

## What this is
This is the review package for the current Maximus Classroom V2 milestone.

The goal is not to show a fully cut-over production classroom yet.
The goal is to show that the new V2 classroom engine shape is real, reviewable, and meaningfully better than the transcript-first V1 path.

## Review standard
Sung should be able to look at the current V2 seam and answer:
- does this feel like the right product direction?
- does the board now read like the anchor of the lesson?
- do turn ownership and teacher/student handoffs feel clearer?
- is parent review getting clearer without cluttering the kid UI?
- what should the next adoption slice be?

## What is already reviewable
### Engine / architecture seam
- typed classroom V2 contracts
- guarded state transitions
- orchestrator skeleton / adapter seam
- feature-flagged isolated V2 preview path

### Board / lesson seam
- canonical whiteboard boundary
- deterministic teacher board primitives
- separate teacher vs student layers
- submit/check evidence packaging

### Voice / runtime seam
- realtime transport wrapped behind a V2 adapter seam
- state-aware mic / speaking policy seam
- browser transcript adaptation into V2 voice-evidence inputs

### Parent review seam
- clearer transcript / key-event interpretation
- progress hooks from structured lesson events
- standards / evaluator hints
- richer combined voice + board review context
- clearer rubric / explanation signals

### Child-facing polish seam
- clearer turn ownership
- stronger teacher write/reveal pacing
- smoother lesson transitions
- better board-surface focus/readability
- subtle teacher-board motion / reveal refinement
- calmer end-of-beat hold posture
- clearer student-submit -> teacher-review handoff
- deliberate lesson-close landing cue

## What stayed intentionally out of scope
- no legacy `VoiceSession` cutover by default
- no schema or persistence migration
- no backend/orchestrator contract expansion beyond the narrow V2 seam
- no parent-dashboard scoring cutover to authoritative mastery logic
- no broad production rollout work

## Suggested review path
1. Open the isolated V2 classroom preview seam.
2. Step through a full lesson beat from tutor-owned setup to student turn to review to end.
3. Watch for:
   - whether teacher-owned beats feel deliberate
   - whether student turns are obvious
   - whether the board feels like the teaching surface instead of a transcript side effect
   - whether review / close beats land intentionally
4. Separately inspect parent review artifacts and confirm they feel clearer and more trustworthy.

## Concrete files to inspect
- `src/features/classroom-v2/ClassroomV2Preview.tsx`
- `src/components/classroom-whiteboard/CanonicalWhiteboard.tsx`
- `src/components/classroom-whiteboard/LayeredBoard.tsx`
- `src/lib/classroom-v2/{types,transitions,orchestrator,board,review,realtime-adapter,realtime-policy,voice-transcript,event-logging,parent-review,progress-signals,progress-hints,index}.ts`
- `src/components/ParentDashboardClient.tsx`
- `src/app/classroom/[studentId]/page.tsx`
- `src/lib/whiteboard-architecture.ts`

## Validation status
- latest direct verification pass re-ran `npm run build`
- build status: passing
- no active Rex slice is currently in flight

## Decision needed after review
Choose exactly one next step:
1. **Adoption slice:** start pulling the isolated V2 seam into the live classroom path in a narrow, low-risk way.
2. **Another review-only polish slice:** only if Sung thinks one specific UX gap still blocks confidence.
3. **Pause / rethink:** if the seam still does not feel teacher-like enough.

## Recommendation
Default to option 1 after review.
The preview seam looks sufficiently reviewable now; the next highest-leverage work should probably be adoption, not more preview-only polish.
