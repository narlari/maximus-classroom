# 04-04-RESULT — Add review-only standards / evaluator hints from V2 event metadata

## What changed
- Added `src/lib/classroom-v2/progress-hints.ts` as a narrow helper that derives reviewable standards/domain/evaluator hints from persisted `SessionEvent.metadata.v2Event` and optional `v2VoiceEvidence` metadata.
- Exported the helper from `src/lib/classroom-v2/index.ts`.
- Updated `src/components/ParentDashboardClient.tsx` to surface:
  - student-level summary chips for recent evaluator hints, domains, and tentative standards,
  - per-session hint cards showing evidence summaries, domain tags, tentative standards, evaluator labels, and scoring-input labels.

## Slice outcome
04-04 adds a compatibility-safe review layer above 04-03:
- structured V2 session events can now carry inspectable standards/domain hints,
- parent review can see evaluator-ready labels and scoring inputs without touching persisted mastery rows,
- the legacy classroom runtime and existing `skill_progress` path remain unchanged.

## Helper behavior
`src/lib/classroom-v2/progress-hints.ts` now:
1. safely reads `metadata.v2Event`,
2. optionally incorporates `metadata.v2VoiceEvidence.reviewContext.actions` and normalized transcript text,
3. infers tentative domain tags from structured prompt/action/evidence text,
4. maps those hints against existing student standards when plausible,
5. emits review-only evaluator labels, evidence summaries, and scoring-input hints,
6. returns nothing when V2 metadata is absent.

## Scope discipline kept
- No `VoiceSession` rewrite
- No runtime default cutover
- No DB migration
- No changes to `skill_progress` persistence or `applySkillUpdates`
- No claim of authoritative event-driven mastery scoring

## Build status
- `npm run build` ✅

## Review notes
Focus on:
1. `src/lib/classroom-v2/progress-hints.ts`
2. `src/components/ParentDashboardClient.tsx`
3. `.planning/04-04-PLAN.md`

Main thing to verify: parents can inspect review-only standards/domain/evaluator hints session-by-session while all legacy mastery behavior remains intact.
