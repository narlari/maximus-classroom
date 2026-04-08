# Maximus Classroom V3

## What This Is
A tablet-first AI tutoring app where Maximus teaches math like a real teacher. The whiteboard is the lesson — Maximus draws problems, explains them by voice, and the child answers on the same board. Turn-taking is strict: when Maximus is teaching, the child listens. When it's the child's turn, Maximus waits. Parents get full session reports with whiteboard screenshots of their child's actual work.

This is NOT a chatbot. This is a classroom.

## Core Value
A child opens the app, sits down, and gets a real math lesson — structured, adaptive, visual — from an AI tutor that teaches through the whiteboard, not just talks at them.

## Who Uses It

**MVP (Phase 1-2):** Sung pretending to be a 4th grader. No voice input from user — whiteboard + text submission only. Goal: validate the classroom loop end-to-end.

**Phase 3:** Ariana (Grade 4, age 10) and Liam (Grade 2, age 8). Real kid testing with voice input.

**Phase 4+:** Friends, family, eventually public.

## Current Milestone: MVP
**Goal:** Sung can open the app, get a real AI-generated math lesson on the whiteboard, submit answers, and receive intelligent feedback — end to end.

**Target features:**
- AI lesson generation (structured lesson plan → whiteboard)
- tldraw whiteboard with teacher/student layer separation
- Maximus speaks lesson prompts via TTS
- Student submits whiteboard work
- Vision API evaluates student's drawn answer
- Maximus responds with correction or next problem
- Parent dashboard with session transcript + board screenshots

### Out of Scope for MVP
| Feature | Reason |
|---|---|
| Student voice input | MVP user is Sung typing/drawing. Voice comes Phase 3. |
| Onboarding / psych eval | Need the classroom working first. Phase 3. |
| Adaptive teaching style | Requires psych eval data. Phase 3. |
| Curriculum auto-pacing by district | Phase 4+ public feature. |
| Payments / subscriptions | No data on cost-per-session yet. |
| Korean language mode | Phase 4+. |
| Multiplayer / shared classrooms | Phase 4+. |
| Animated avatar | Nice-to-have after core loop works. |
| Real-time voice-synced board animation | Too complex for MVP. Maximus draws, THEN speaks. |

## Context
- **Repo:** /home/maximus/maximus-classroom (existing Next.js app)
- **V1 status:** Working voice session with Excalidraw whiteboard, but voice-driven architecture (whiteboard reacts to transcript). Wrong shape.
- **V2 status:** Good orchestrator/type contracts, but 14 phases of preview tooling without shipping real classroom. Useful foundation but over-built review layer.
- **V3 approach:** Keep V2's orchestrator core. Rip out review tooling. Wire real AI lesson generation and real whiteboard. Ship to Sung ASAP.
- **Whiteboard:** Migrating from Excalidraw to tldraw v4. Spike completed — programmatic teacher drawing, locked shapes, layer separation, PNG export all confirmed working.
- **Stack:** Next.js 14 + Tailwind + tldraw v4 + Supabase (Postgres + Auth) + OpenAI (TTS + Vision) + Claude Sonnet (lesson generation)

## Constraints
- Budget: Minimize API spend. ~$2/session target.
- Hosting: Hostinger VPS for backend, Cloudflare Pages for frontend (or keep on VPS for simplicity during MVP).
- Testing: No session limits during MVP — Sung tests as much as needed.
- Quality gate: Maximus verifies every feature end-to-end before Sung touches it. No "it should work" handoffs.
- Code workflow: Branch → PR → Sung approves → merge. No direct commits to main.

## Key Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-001 | tldraw v4 replaces Excalidraw | Programmatic shape creation is first-class. Teacher drawing is code-driven, not hack-driven. Spike confirmed. |
| D-002 | Structured orchestrator drives lesson | Keep from V2. Voice and board render from the same plan. |
| D-003 | Teacher shapes are locked | Child cannot move/delete teacher content. tldraw `isLocked: true`. |
| D-004 | Teacher/student layer separation by ID prefix | Filter by shape ID prefix. Clean, simple, no custom layer system needed. |
| D-005 | Claude Sonnet generates lesson plans | Lesson plan generated before session starts. Defines problems, hints, teaching steps. |
| D-006 | Vision API evaluates whiteboard submissions | GPT-4o reads the student's drawn work as a PNG screenshot. |
| D-007 | TTS for Maximus voice (no STT in MVP) | OpenAI TTS. Student doesn't speak in MVP — Sung types/draws. |
| D-008 | Classroom first, onboarding later | Get the core teaching loop working before building intake/eval. |
| D-009 | Psych eval determines teaching approach | Future: VAK or similar validated framework. Maximus adapts HOW it teaches based on learner profile. |
| D-010 | No session limits during MVP | Sung tests freely. Limits come with real kid usage. |
| D-011 | Board screenshots saved per submission | Parent dashboard shows what the child actually drew. |

## What We Keep From V1/V2
- Next.js app shell
- Supabase database schema (sessions, events, students, profiles)
- Parent dashboard foundation
- V2 orchestrator core: types.ts, transitions.ts, orchestrator.ts
- V2 realtime adapter/policy seam (will be rewired to real TTS)
- Session/event logging infrastructure

## What We Cut/Archive From V2
- ClassroomV2Preview.tsx (1100-line review cockpit)
- ClassroomV2ReviewMemoryCard.tsx
- review-memory.ts (localStorage review beat tracking)
- All 06-xx review tooling (targeted beats, confidence signals, return guidance)
- progress-hints.ts, progress-signals.ts (review-only, no real data)
- Excalidraw integration (replaced by tldraw)
- The entire `.planning/` directory (preserved as `.planning-v2-archive/`)
