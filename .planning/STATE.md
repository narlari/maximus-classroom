# Maximus Classroom V2 — State

Last updated: 2026-04-07 15:51 UTC

## Current Position
V2 now has a reviewable parent-dashboard seam for transcript clarity, progress hooks, standards/evaluator hints, richer board / combined-evidence packaging, clearer rubric/explanation signals, and a progressively more teacher-like child-facing preview seam. 05-08 directly verified that the isolated preview reads like a deliberate lesson. 06-01 and 06-02 moved that seam onto the real classroom route with an explicit launcher plus route-shell handoff copy. 06-03 made that review path live-verifiable with a compact guided checklist tied to actual orchestrator progress. 06-04 now makes the real classroom route remember that review work per student as well: the preview's checklist progress is persisted in lightweight browser-local review memory and replayed near the existing launcher / return controls without changing legacy `VoiceSession` default behavior. 06-05 built on that memory by turning the route card into a real resume guide. 06-06 completed the basic route/preview handoff so the launcher carries remembered start / continue / re-check guidance into preview entry. 06-07 removed the next review-only friction point from the real classroom route by letting Sung launch the preview directly into one specific review beat. 06-08 now closes that loop more cleanly: when Sung returns from preview to the default classroom route, the route immediately reports which beat was just reviewed and whether that beat is now confirmed, instead of forcing him to infer that from remembered checklist state alone. 06-09 reduced interpretation inside preview itself by adding a tiny targeted-beat cue that names the open beat, states the visible confirmation signal, and states the immediate follow-up once that targeted checkpoint is on screen. 06-10 now closes one more narrow review-confidence gap by adding a live verdict strip inside that same targeted cue, so targeted launches say plainly whether the requested beat is still pending, open now, or already confirmed in the current preview run. 06-11 adds one more tiny confidence layer in that same preview cue: explicit confidence signals showing the two exact live checks behind that verdict (is the requested beat active now, and is it checklist-confirmed in this run). 06-12 converts that same status into a direct recommended next action, so targeted review no longer requires Sung to translate verdict state into what to do next. 06-13 adds the next tiny actionability layer in that same cue: a projected review-progress panel that tells Sung what the run looks like after this checkpoint, including whether this confirmation effectively finishes the pass or which unresolved beat remains next. 06-14 finishes the next narrow interpretation cut in that same seam by saying explicitly whether the current targeted run is safe to leave and return to the real classroom route, or whether continue/replay is still recommended first.

## Status
- PRD-V2: complete
- Architecture audit: complete
- Repo planning scaffold: complete
- 01-01 shared contracts + transition rules: implemented and build-verified
- 01-02 orchestrator skeleton + event dispatcher: implemented and build-verified
- 01-03 isolated integration seam: implemented and build-verified
- 02-01 whiteboard architecture freeze: implemented and build-verified
- 02-02 layered board primitives + deterministic teacher renderer: implemented and build-verified
- 02-03 submit/check snapshots + evidence packaging: implemented and build-verified
- 03-01 realtime transport behind orchestration adapter: implemented and build-verified
- 03-02 state-aware mic/session rules: implemented and build-verified
- 03-03 voice evidence normalization into tutor-review inputs: implemented and build-verified
- 03-04 browser transcript events into V2 voice-evidence seam: implemented and build-verified
- 04-01 event logging aligned to V2 states/actions metadata: implemented and build-verified
- 04-02 parent review transcript/key-event clarity on top of V2 metadata: implemented and build-verified
- 04-03 progress hooks tied to structured lesson events: implemented and build-verified
- 04-04 review-only standards / evaluator hints from structured lesson events: implemented and build-verified
- 04-05 richer board / combined-evidence scoring inputs in parent review seam: implemented and build-verified
- 04-06 clearer evaluator rubric / parent explanation signals in parent review seam: implemented and build-verified
- 05-01 child-facing turn ownership + classroom cue polish in V2 preview seam: implemented and build-verified
- 05-02 teacher write/reveal pacing polish in V2 preview seam: implemented and build-verified
- 05-03 lesson-transition smoothing in V2 preview seam: implemented and build-verified
- 05-04 board-surface readability polish in the isolated V2 preview seam: implemented and build-verified
- 05-05 subtle teacher-board motion / reveal refinement in the isolated V2 preview seam: implemented and build-verified
- 05-06 calmer board-state settling / end-of-beat hold polish in the isolated V2 preview seam: implemented and build-verified
- 05-07 lightweight teacher-review handoff emphasis in the isolated V2 preview seam: implemented and build-verified
- 05-08 tiny lesson-close landing cues in the isolated V2 preview seam: implemented, directly verified, and build-verified
- 06-01 explicit in-app V2 launcher on the real classroom page: implemented and build-verified
- 06-02 route-level review handoff around the in-app launcher: implemented and build-verified
- 06-03 guided V2 adoption checklist on the real classroom review path: implemented and build-verified
- 06-04 route-level V2 review memory: implemented and build-verified
- 06-05 route-level review resume guidance: implemented and build-verified
- 06-06 route-to-preview review resume handoff: implemented and build-verified
- 06-07 route-level targeted review beat launcher: implemented and build-verified
- 06-08 targeted review return-path reporting: implemented and build-verified
- 06-09 targeted beat confirmation cue inside preview: implemented and build-verified
- 06-10 targeted beat live verdict strip inside preview: implemented and build-verified
- 06-11 targeted beat confidence signals inside preview: implemented and build-verified
- 06-12 targeted beat recommended next action inside preview: implemented and build-verified
- 06-13 targeted beat projected review progress inside preview: implemented and build-verified
- 06-14 targeted beat return-vs-replay guidance inside preview: implemented and build-verified
- Reviewable V2 code: established in `src/lib/classroom-v2/`, `src/features/classroom-v2/`, and `src/components/classroom-whiteboard/`

## Latest Decisions
- Keep `src/lib/classroom-v2/` as the authoritative Phase 1/2/3/4/5 V2 engine surface
- Keep the canonical whiteboard boundary introduced in 02-01 and land new board work behind it instead of creating a second seam
- Represent teacher visuals as deterministic board primitives derived from `TutorAction[]`
- Preserve legacy `VoiceSession` behavior by default while using the V2 preview seam for reviewable runtime control work
- Keep student spoken-answer packaging parallel to board submit/check packaging by attaching tutor-review context at capture time
- Normalize raw spoken transcript text before tutor review consumes it
- Allow V2 review payloads to retain voice-only evidence or combined voice+board evidence under the existing `StudentEvidence` union
- Adapt real browser transcript completion events into V2 voice-evidence metadata through a narrow helper seam instead of broad runtime rewrites
- Keep event-log alignment behind a dedicated `event-logging` helper so legacy event rows can gain V2 semantics without changing their existing event types
- Keep parent-review interpretation behind a dedicated `parent-review` helper so dashboard rendering can use V2 semantics without mutating persisted session rows
- Keep progress-hook interpretation behind a dedicated `progress-signals` helper so parent progress review can consume V2 event semantics without changing persisted mastery records
- Keep standards/evaluator interpretation behind a dedicated `progress-hints` helper so review-only scoring context can evolve without implying runtime mastery cutover
- Package board review context into optional event metadata and collapse same-turn voice+board evidence inside the parent-review seam instead of changing persistence/runtime flow
- Keep rubric/explanation signals heuristic and parent-facing inside `progress-hints` so review clarity improves without changing persistence or runtime scoring behavior
- Keep Phase 5 child-facing cue polish local to the isolated V2 preview seam so turn ownership can be reviewed without changing legacy classroom defaults
- Keep Phase 5 pacing/reveal polish browser-local inside the preview seam so teacher-turn progression can be reviewed without implying runtime scheduling or backend complexity
- Keep Phase 5 transition-smoothing cues browser-local inside the preview seam so lesson continuity can be reviewed without changing orchestrator/runtime contracts
- Keep Phase 5 board-surface readability polish local to the isolated preview seam and canonical whiteboard presentation layer so board ownership/focus can be reviewed without changing runtime behavior
- Keep Phase 5 teacher-board motion refinement browser-local and derived from existing preview pacing so teacher-owned beats feel more intentional without introducing a new scheduling or animation system
- Keep Phase 5 board-settle / end-of-beat hold polish browser-local and derived from the existing reveal-progress seam so teacher-owned beats can visibly land before the next handoff without introducing scheduler/runtime complexity
- Keep Phase 5 teacher-review handoff emphasis browser-local and preview-only so the submission → review bridge reads like an intentional board-level transfer without changing runtime or orchestrator contracts
- Keep Phase 5 lesson-close landing cues browser-local and preview-only so the final teacher/review beat reads intentionally finished without changing runtime or orchestrator contracts
- Keep early adoption plumbing local to the real classroom route shell and feature-flag helpers so Sung can explicitly launch/exit V2 review from inside the app without changing the default legacy runtime path
- Keep route-level review handoff copy local to the real classroom shell so Sung can understand how to review the V2 seam from the actual classroom route without touching legacy runtime behavior
- Keep 06-03 review verification local to the preview seam by deriving a compact checklist from actual orchestrator state/history instead of changing routing, persistence, or legacy runtime behavior
- Keep 06-04 review memory browser-local and per-student so the real classroom route can replay the latest confirmed V2 review beats without changing backend persistence, routing contracts, or legacy runtime behavior
- Keep 06-05 resume guidance derived from remembered checklist state so the real classroom route can frame the next V2 review action without changing preview/runtime contracts or legacy classroom defaults
- Keep 06-06 launch handoff browser-local between the route card and preview so remembered review guidance becomes an actual preview entry state without changing backend persistence, legacy runtime behavior, or checklist semantics
- Keep 06-07 targeted beat launchers browser-local on the real classroom route and reuse the same query-param handoff seam so Sung can jump directly into one exact review beat without changing legacy runtime defaults or adding new persistence
- Keep 06-08 return-path reporting browser-local on the same route/preview query-param seam so the default classroom route can acknowledge the just-reviewed beat and its confirmation status without adding persistence or changing legacy runtime defaults
- Keep 06-09 targeted beat confirmation cues browser-local inside preview and derived from existing launch-handoff + checklist state so targeted review jumps require less manual interpretation without changing runtime behavior or persistence
- Keep 06-10 targeted beat verdict language browser-local inside the same preview cue and derived from existing checklist + active-beat state so targeted review confidence improves without adding persistence or changing legacy runtime behavior
- Keep 06-11 targeted-beat confidence signals browser-local inside the same preview cue and derived from existing active-beat + checklist state so Sung can audit why the verdict says open/confirmed/pending without changing persistence or legacy runtime behavior
- Keep 06-12 targeted-beat recommended next action browser-local inside the same preview cue and derived from existing verdict inputs so Sung can immediately see whether to confirm now, continue, or replay without changing persistence or legacy runtime behavior
- Keep 06-13 targeted-beat projected review progress browser-local inside the same preview cue and derived from existing checklist state so Sung can immediately see whether confirming the requested checkpoint effectively completes the pass or which unresolved beat remains next, without changing persistence or legacy runtime behavior
- Keep 06-14 return-vs-replay guidance browser-local inside the same preview cue and derived from existing targeted-beat confirmation/progress state so Sung can see whether it is already safe to leave preview without changing persistence, routing, or legacy runtime behavior

## Risks / Watchouts
- Parent review is now clearer, but persisted `event_type` values are still legacy-first and not yet normalized to a V2-native event taxonomy
- Real browser transcript events are adapted into V2 voice-evidence metadata, but legacy `VoiceSession` still does not dispatch them into the full V2 orchestrator submission flow
- Transcript normalization remains intentionally narrow in this slice; richer utterance segmentation/stream assembly is deferred
- Legacy `VoiceSession` still contains its own status-driven mic handling; that is intentional for now to preserve default behavior until a later V2 adoption slice
- Progress hooks and evaluator hints are review-only; persisted `skill_progress` mastery still remains summary-driven rather than event-derived
- Standards/domain hints are heuristic and review-only; they must not be treated as authoritative mastery scoring yet
- Board evidence is richer than before but still relies on legacy whiteboard descriptions plus packaged review context rather than a full persisted V2 evidence object
- Rubric/explanation signals are heuristic summaries for parent review and must not be treated as authoritative scoring or mastery state
- Phase 5 child-facing cues, pacing/reveal cues, transition-smoothing cues, board-surface readability polish, subtle teacher-board motion, end-of-beat board-settle / hold cues, teacher-review handoff emphasis, and lesson-close landing cues currently live only in the isolated preview seam / canonical V2 board layer; the legacy classroom path remains intentionally unchanged
- The 06-01 launcher plus 06-02 review-handoff card make the review path discoverable and self-explanatory from the real classroom route, 06-03 adds live checklist verification inside the launched seam, 06-04 replays remembered checklist state back on the route itself, 06-05 turns that memory into route-level start/continue/re-check guidance, 06-06 carries that guidance into preview launch state, 06-07 adds direct per-beat jump links from the same route card, 06-08 adds a tiny return report back onto that route after preview exit, 06-09 adds a tiny in-preview cue explaining exactly what to confirm once a targeted beat is open, 06-10 adds a plain-language verdict strip saying whether that targeted checkpoint is pending, open, or confirmed, 06-11 adds explicit signal chips showing the exact live checks behind that verdict, 06-12 adds a direct recommended next action for that state, 06-13 adds projected post-checkpoint progress so Sung can see whether the pass will be finished or what beat remains next, and 06-14 now says explicitly whether that targeted run is safe to exit back to the real classroom route or still needs continue/replay first — but they still do not integrate any V2 runtime behavior into legacy `VoiceSession`; deeper adoption still remains ahead

## Immediate Next Step
Choose exactly one more narrow browser-local preview polish slice after 06-14, ideally keeping the same targeted review seam and reducing interpretation further without widening into runtime cutover or changing persistence. A good next candidate is making the targeted cue say whether route-level remembered review state will change immediately after this run, so Sung can predict the exact return card wording before leaving preview.

## Ready-for-Rex
- `01-CONTEXT.md`
- `01-RESEARCH.md`
- `01-01-RESULT.md`
- `01-02-RESULT.md`
- `01-03-RESULT.md`
- `02-01-RESULT.md`
- `02-02-RESULT.md`
- `02-03-PLAN.md`
- `02-03-RESULT.md`
- `03-01-RESULT.md`
- `03-02-PLAN.md`
- `03-02-RESULT.md`
- `03-03-PLAN.md`
- `03-04-PLAN.md`
- `03-04-RESULT.md`
- `04-01-RESULT.md`
- `04-02-PLAN.md`
- `04-03-PLAN.md`
- `04-03-RESULT.md`
- `04-04-PLAN.md`
- `04-04-RESULT.md`
- `04-05-PLAN.md`
- `04-06-PLAN.md`
- `04-06-RESULT.md`
- `05-01-PLAN.md`
- `05-02-PLAN.md`
- roadmap guidance for Phase 5
- `05-04-PLAN.md`
- `05-04-RESULT.md`
- `05-05-PLAN.md`
- `05-05-RESULT.md`
- `06-01-PLAN.md`
- `06-01-RESULT.md`
- `06-02-PLAN.md`
- `06-02-RESULT.md`
- `06-03-PLAN.md`
- `06-03-RESULT.md`
- `06-04-PLAN.md`
- `06-04-RESULT.md`
- `06-05-PLAN.md`
- `06-05-RESULT.md`
- `06-06-PLAN.md`
- `06-06-RESULT.md`

## Review Notes
V2 review surfaces now cover both parent-review clarity and child-facing lesson legibility: the parent seam has clearer evaluator/rubric explanation signals, and the isolated preview seam now promotes turn ownership, current teaching status, next-step guidance, staged teacher-turn pacing, reveal progress, explicit handoff continuity cues, stronger board-surface ownership/focus framing, subtle staged teacher-board motion, a calmer end-of-beat settled hold posture, a more visible answer-received → teacher-review bridge, a deliberate lesson-close landing cue, and a compact state-driven checklist that confirms the main adoption beats as the demo advances.

A dedicated review artifact still exists at `.planning/REVIEW-HANDOFF.md`, and 06-01 through 06-06 now make that review path reachable, self-explanatory, live-verifiable, remembered across launches, route-guided, and finally carried into preview entry state from the real classroom route itself instead of requiring manual `?v2=1` entry or outside context.
