# 04-06-RESULT — Clearer evaluator rubric + parent explanation signals in the review-only hint seam

## What changed
- Updated `src/lib/classroom-v2/progress-hints.ts` to derive an additive review-only rubric layer for parent hint cards, including:
  - response modality (`voice`, `board`, `voice+board`, fallback `review`)
  - evidence completeness (`light`, `partial`, `complete`)
  - context richness (`limited`, `guided`, `rich`)
  - strategy marker presence
  - prompt-linked evidence presence
- Added short `parentExplanation` text to each parent hint card so the card explicitly says why it is reviewable.
- Extended hint summary metadata with lightweight counts for prompt-linked cards and strategy-tagged cards.
- Updated `src/components/ParentDashboardClient.tsx` to surface the new rubric/explanation outputs on the existing parent review cards via:
  - compact summary chips for prompt-linked / strategy-tagged counts
  - per-card explanation text
  - compact rubric chips for modality, evidence completeness, context richness, and prompt/strategy signals

## Slice outcome
04-06 makes the existing review cards easier for a parent or evaluator to interpret without broadening the seam:
- cards now explain whether the evidence came from voice, board, or both,
- cards heuristically signal how complete the evidence is,
- cards show whether teacher strategy markers and prompt linkage were present,
- parents get a plain-language sentence describing why each card is reviewable.

## Why this is still review-only
- No persisted schema changed.
- No runtime defaults changed.
- No legacy classroom flow or mastery path was replaced.
- `skill_progress`, `applySkillUpdates`, and summary-driven mastery remain untouched.
- The new rubric/explanation fields are derived only inside the existing parent-review helper seam and remain compatibility-safe when V2 metadata is absent.

## Build status
- `npm run build` ✅

## Exact files changed for 04-06
- `.planning/04-06-PLAN.md`
- `.planning/04-06-RESULT.md`
- `.planning/STATE.md`
- `src/lib/classroom-v2/progress-hints.ts`
- `src/components/ParentDashboardClient.tsx`
