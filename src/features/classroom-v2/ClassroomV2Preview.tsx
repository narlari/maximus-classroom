"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  combineStudentEvidence,
  createBoardSubmissionEvidence,
  createClassroomOrchestrator,
  createClassroomRealtimeOrchestrationAdapter,
  createVoiceSubmissionEvidence,
  getClassroomRealtimeSessionPolicy,
  createInMemoryClassroomRealtimeTransport,
  type BoardTarget,
  type ClassroomOrchestratorDispatchResult,
  type ClassroomOrchestratorSnapshot,
  type ClassroomRealtimeTransportSnapshot,
  type ClassroomTransitionEvent,
  type StudentBoardEvidence,
  type StudentEvidence,
  type StudentVoiceEvidence,
  type TutorAction,
  type TutorTurnPlan,
} from "@/lib/classroom-v2";
import type { Student } from "@/lib/db";
import { CANONICAL_WHITEBOARD_ARCHITECTURE } from "@/lib/whiteboard-architecture";
import { CanonicalWhiteboard } from "@/components/classroom-whiteboard/CanonicalWhiteboard";
import {
  buildClassroomV2ReviewMemoryRecord,
  clearClassroomV2ReviewMemory,
  writeClassroomV2ReviewMemory,
  type ClassroomV2ReviewBeatKey,
  type ClassroomV2ReviewGuidance,
} from "@/lib/classroom-v2/review-memory";

type Props = {
  student: Student;
};

type TurnCue = {
  ownerLabel: string;
  ownerBadge: string;
  headline: string;
  guidance: string;
  nextStep: string;
  statusTone: string;
  accentClass: string;
  panelClass: string;
};

type PreviewPacingSnapshot = {
  lessonStageLabel: string;
  stageDescription: string;
  stagePercent: number;
  revealLabel: string;
  revealDetail: string;
  nextReveal: string;
  holdLabel: string;
  holdDetail: string;
  boardStateLabel: string;
  teacherHoldActive: boolean;
  teacherHoldStrength: number;
  timeline: Array<{
    key: string;
    label: string;
    state: "complete" | "active" | "upcoming";
  }>;
  actionStatuses: Array<{
    key: string;
    label: string;
    detail: string;
    state: "revealed" | "active" | "queued";
  }>;
};

type TransitionSnapshot = {
  fromState: ClassroomOrchestratorSnapshot["state"] | null;
  toState: ClassroomOrchestratorSnapshot["state"];
  justFinished: string;
  nowStarting: string;
  continuity: string;
  nextBeat: string;
  accentClass: string;
  badge: string;
  emphasis: "teacher" | "student" | "review" | "neutral";
  isFresh: boolean;
};

type BoardPresentationSnapshot = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ownershipLabel: string;
  focusLabel: string;
  focusDetail: string;
  emphasisTone: TransitionSnapshot["emphasis"];
  zoneBadge: string;
};

type ReviewHandoffSnapshot = {
  active: boolean;
  label: string;
  detail: string;
  progress: number;
};

type LessonCloseSnapshot = {
  active: boolean;
  label: string;
  detail: string;
  progress: number;
};

type ReviewChecklistItem = {
  key: ClassroomV2ReviewBeatKey;
  label: string;
  detail: string;
  done: boolean;
};

type TargetedBeatCue = {
  title: string;
  detail: string;
  confirmLabel: string;
  followupLabel: string;
  recommendedActionLabel: string;
  recommendedActionDetail: string;
  projectedProgressLabel: string;
  projectedProgressDetail: string;
  returnGuidanceLabel: string;
  returnGuidanceDetail: string;
  verdictLabel: string;
  verdictDetail: string;
  confidenceSignals: Array<{
    label: string;
    value: string;
    done: boolean;
  }>;
  statusLabel: string;
  panelClass: string;
  pillClass: string;
  verdictPanelClass: string;
};

type PreviewLaunchHandoff = {
  mode: ClassroomV2ReviewGuidance["mode"];
  beatKey: ClassroomV2ReviewBeatKey | null;
  targeted: boolean;
};

const INITIAL_TURN: TutorTurnPlan = {
  turnId: "turn-1-present-problem",
  expectsStudentEvidence: true,
  actions: [
    { type: "board.clearTeacherLayer" },
    { type: "board.writeProblem", text: "43 - 19 = ___", position: { x: 80, y: 110 } },
    { type: "board.highlight", target: { kind: "region", x: 76, y: 92, width: 180, height: 52 }, color: "#38bdf8" },
    { type: "speak", text: "Let's solve 43 minus 19 together." },
    { type: "ask", prompt: "Show me your answer by voice or on the board." },
  ],
};

const REVIEW_TURN: TutorTurnPlan = {
  turnId: "turn-2-review-and-model",
  expectsStudentEvidence: false,
  actions: [
    { type: "board.clearTeacherLayer" },
    { type: "board.writeProblem", text: "43 - 19 = ___", position: { x: 80, y: 110 } },
    { type: "board.stepBox", target: { kind: "region", x: 70, y: 168, width: 280, height: 72 }, label: "Regroup first" },
    { type: "board.writeText", text: "13 - 9 = 4", position: { x: 92, y: 214 } },
    { type: "board.arrow", from: { x: 232, y: 130 }, to: { x: 154, y: 208 }, label: "borrow 1 ten" },
    { type: "board.underline", target: { kind: "region", x: 88, y: 222, width: 150, height: 12 }, color: "#fbbf24" },
    { type: "speak", text: "Nice try. Let's regroup the 43 so the ones place becomes 13, then 13 minus 9 equals 4." },
  ],
};

export function ClassroomV2Preview({ student }: Props) {
  const searchParams = useSearchParams();
  const launchHandoff = useMemo(() => getPreviewLaunchHandoff(searchParams), [searchParams]);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<ClassroomOrchestratorDispatchResult[]>([]);
  const [voiceTranscriptDraft, setVoiceTranscriptDraft] = useState(
    "I think the answer is 24 because 13 minus 9 is 4 and 3 tens minus 1 ten is 2 tens.",
  );
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
  const runtimeRef = useRef(createPreviewRuntime(student.id, launchHandoff));
  const orchestratorRef = useRef(runtimeRef.current.orchestrator);

  const snapshot = useMemo(() => orchestratorRef.current.getSnapshot(), [revision]);

  useEffect(() => {
    setPhaseStartedAt(Date.now());
  }, [snapshot.state, snapshot.activeTurn?.turnId]);

  const transportSnapshot = useMemo<ClassroomRealtimeTransportSnapshot>(
    () => runtimeRef.current.realtime.getTransportSnapshot(),
    [revision],
  );
  const studentEvidence = snapshot.session.studentEvidence;
  const boardEvidence = getBoardEvidence(studentEvidence);
  const voiceEvidence = getVoiceEvidence(studentEvidence);
  const activeBoardTitle = getBoardTitle(snapshot);
  const activeBoardSubtitle = getBoardSubtitle(snapshot);
  const turnCue = getTurnCue(snapshot, student.name);
  const pacing = usePreviewPacingSnapshot(snapshot, phaseStartedAt);
  const transition = useTransitionSnapshot(snapshot, student.name);
  const boardPresentation = getBoardPresentationSnapshot(snapshot, student.name);
  const reviewHandoff = getReviewHandoffSnapshot(snapshot, phaseStartedAt);
  const lessonClose = getLessonCloseSnapshot(snapshot, phaseStartedAt);
  const reviewChecklist = getReviewChecklist(snapshot, history);
  const activeReviewBeatKey = getActiveReviewBeatKey(snapshot);
  const launchBanner = getLaunchBanner(launchHandoff, reviewChecklist);
  const targetedBeatCue = getTargetedBeatCue({
    handoff: launchHandoff,
    reviewChecklist,
    activeBeatKey: activeReviewBeatKey,
  });

  useEffect(() => {
    writeClassroomV2ReviewMemory(
      buildClassroomV2ReviewMemoryRecord({
        studentId: student.id,
        studentName: student.name,
        beats: reviewChecklist,
      }),
    );
    window.dispatchEvent(new Event("classroom-v2-review-memory-updated"));
  }, [reviewChecklist, student.id, student.name]);

  const dispatch = (event: ClassroomTransitionEvent) => {
    const result = orchestratorRef.current.dispatch(event);
    setHistory((current) => [result, ...current].slice(0, 8));
    setRevision((current) => current + 1);
    return result;
  };

  const resetPreview = () => {
    runtimeRef.current = createPreviewRuntime(student.id, launchHandoff);
    orchestratorRef.current = runtimeRef.current.orchestrator;
    setHistory([]);
    setRevision((current) => current + 1);
  };

  const clearRememberedReview = () => {
    clearClassroomV2ReviewMemory(student.id);
    window.dispatchEvent(new Event("classroom-v2-review-memory-updated"));
    resetPreview();
  };

  const handleAdvance = () => {
    const event = getPrimaryAdvanceEvent(snapshot);

    if (!event) {
      return;
    }

    dispatch(event);
  };

  const handleBoardSubmission = ({
    intent,
    snapshot: boardSnapshot,
    strokes,
  }: {
    intent: "submit" | "check";
    snapshot: NonNullable<StudentBoardEvidence["snapshot"]>;
    strokes: StudentBoardEvidence["strokes"];
  }) => {
    if (!snapshot.activeTurn) {
      return;
    }

    const boardSubmission = createBoardSubmissionEvidence({
      lessonId: snapshot.session.lessonId,
      state: snapshot.state,
      activeTurn: snapshot.activeTurn,
      submissionId: `${student.id}-${intent}-${Date.now()}`,
      strokes,
      snapshot: boardSnapshot,
    });

    dispatch({
      type: "classroom.submitStudentEvidence",
      evidence: voiceEvidence ? combineStudentEvidence(voiceEvidence, boardSubmission) : boardSubmission,
    });
  };

  const handleVoiceSubmission = () => {
    if (!snapshot.activeTurn) {
      return;
    }

    const transcript = voiceTranscriptDraft.trim();

    if (!transcript) {
      return;
    }

    const now = new Date().toISOString();

    dispatch({
      type: "classroom.submitStudentEvidence",
      evidence: createVoiceSubmissionEvidence({
        lessonId: snapshot.session.lessonId,
        state: snapshot.state,
        activeTurn: snapshot.activeTurn,
        utteranceId: `${student.id}-voice-${Date.now()}`,
        transcript,
        startedAt: now,
        endedAt: now,
        segments: [{ text: transcript }],
      }),
    });
  };

  const canAdvance = Boolean(getPrimaryAdvanceEvent(snapshot));
  const canBeginReview = snapshot.allowedNextEvents.includes("classroom.beginTutorReview");
  const canEndLesson = snapshot.allowedNextEvents.includes("classroom.endLesson");
  const canSubmitVoice =
    snapshot.allowedNextEvents.includes("classroom.submitStudentEvidence") && voiceTranscriptDraft.trim().length > 0;

  return (
    <section className="flex h-full min-h-0 flex-1 overflow-hidden bg-[#060b16] text-white">
      <aside className="flex w-[340px] shrink-0 flex-col justify-between border-r border-white/10 bg-[linear-gradient(180deg,#10182d,#0a1022)] p-5">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-electric/70">Classroom V2 Preview</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{student.name}&rsquo;s review seam</h1>
            <p className="mt-2 text-sm text-white/70">
              Isolated app-level preview using the real classroom-v2 orchestrator. Legacy VoiceSession stays untouched unless this preview is explicitly enabled.
            </p>
          </div>

          {launchBanner ? (
            <div className={`rounded-3xl border p-4 ${launchBanner.panelClass}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Preview launch handoff</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${launchBanner.accentClass}`}>{launchBanner.badge}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">{launchBanner.title}</h2>
              <p className="mt-2 text-sm text-white/80">{launchBanner.detail}</p>
            </div>
          ) : null}

          {targetedBeatCue ? (
            <div className={`rounded-3xl border p-4 ${targetedBeatCue.panelClass}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Targeted beat cue</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${targetedBeatCue.pillClass}`}>{targetedBeatCue.statusLabel}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">{targetedBeatCue.title}</h2>
              <p className="mt-2 text-sm text-white/80">{targetedBeatCue.detail}</p>
              <div className={`mt-4 rounded-2xl border p-3 ${targetedBeatCue.verdictPanelClass}`}>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Live review verdict</p>
                <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.verdictLabel}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{targetedBeatCue.verdictDetail}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {targetedBeatCue.confidenceSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        signal.done ? "border-mint/25 bg-mint/10 text-mint" : "border-white/10 bg-[#0b1328]/70 text-white/70"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{signal.label}</p>
                      <p className="mt-1 font-semibold">{signal.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Recommended next action</p>
                  <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.recommendedActionLabel}</p>
                  <p className="mt-2 text-xs leading-5 text-white/70">{targetedBeatCue.recommendedActionDetail}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Review progress after this beat</p>
                  <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.projectedProgressLabel}</p>
                  <p className="mt-2 text-xs leading-5 text-white/70">{targetedBeatCue.projectedProgressDetail}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Return to classroom route?</p>
                <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.returnGuidanceLabel}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{targetedBeatCue.returnGuidanceDetail}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Confirm this beat by seeing</p>
                  <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.confirmLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Immediate follow-up</p>
                  <p className="mt-2 text-sm font-semibold text-white">{targetedBeatCue.followupLabel}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className={`rounded-3xl border p-4 ${turnCue.panelClass}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">Classroom now</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${turnCue.accentClass}`}>{turnCue.ownerBadge}</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">{turnCue.headline}</h2>
            <p className="mt-2 text-sm text-white/80">{turnCue.guidance}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Turn owner</p>
                <p className="mt-2 text-sm font-semibold text-white">{turnCue.ownerLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1328]/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Next step</p>
                <p className="mt-2 text-sm font-semibold text-white">{turnCue.nextStep}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Session status</p>
              <p className="mt-2 text-lg font-semibold text-white">{turnCue.statusTone}</p>
              <p className="mt-2 text-sm text-white/65">State: {snapshot.state}</p>
              <p className="mt-1 text-sm text-white/65">Active turn: {snapshot.activeTurn?.turnId ?? "none"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Student can do now</p>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>Speak: {snapshot.studentInput.mic ? "yes" : "wait for Maximus"}</li>
                <li>Draw: {snapshot.studentInput.board ? "yes" : "watch the board"}</li>
                <li>Check work: {snapshot.studentInput.submit ? "ready" : "not yet"}</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Guided review checklist</p>
                <p className="mt-2 text-sm text-white/65">
                  This confirms the key review beats from live preview state and also writes the latest confirmed progress into browser-local per-student review memory for the real classroom route.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-[#0b1328]/80 px-3 py-1 text-xs font-medium text-white/70">
                {reviewChecklist.filter((item) => item.done).length}/{reviewChecklist.length} confirmed
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {reviewChecklist.map((item) => {
                const isLaunchTarget = item.key === activeReviewBeatKey;

                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-3 ${
                      item.done
                        ? "border-mint/25 bg-mint/10"
                        : isLaunchTarget
                          ? "border-amber-300/25 bg-amber-300/10"
                          : "border-white/10 bg-[#0b1328]/75"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          item.done
                            ? "bg-mint/20 text-mint"
                            : isLaunchTarget
                              ? "bg-amber-300/20 text-amber-100"
                              : "bg-white/10 text-white/45"
                        }`}
                      >
                        {item.done ? "✓" : isLaunchTarget ? "→" : "○"}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{item.label}</p>
                          {isLaunchTarget ? (
                            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                              launch target
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-white/65">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Preview lesson facts</p>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <p>Lesson: {snapshot.session.lessonId}</p>
              <p>Completed turn: {snapshot.session.lastCompletedTurnId ?? "none"}</p>
              <p>Ended reason: {snapshot.session.endedReason ?? "active"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Preview controls</p>

          <button
            type="button"
            onClick={handleAdvance}
            disabled={!canAdvance}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${buttonClass(canAdvance)}`}
          >
            {getPrimaryAdvanceLabel(snapshot)}
          </button>

          <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-3 text-sm text-white/70">
            Student submit/check lives on the board itself. During the student turn, draw and then press <span className="font-semibold text-white">Check my work</span> or <span className="font-semibold text-white">Submit work</span>.
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-3">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Preview spoken answer</p>
            <textarea
              value={voiceTranscriptDraft}
              onChange={(event) => setVoiceTranscriptDraft(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-electric/40"
              placeholder="Type the student's spoken answer transcript here"
            />
            <button
              type="button"
              onClick={handleVoiceSubmission}
              disabled={!canSubmitVoice}
              className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${buttonClass(canSubmitVoice)}`}
            >
              Submit normalized voice evidence
            </button>
          </div>

          <button
            type="button"
            onClick={() => dispatch({ type: "classroom.beginTutorReview" })}
            disabled={!canBeginReview}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${buttonClass(canBeginReview)}`}
          >
            Begin tutor review
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "classroom.endLesson", reason: "preview_manual_stop" })}
              disabled={!canEndLesson}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${buttonClass(canEndLesson)}`}
            >
              End preview
            </button>
            <button
              type="button"
              onClick={resetPreview}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Reset demo only
            </button>
          </div>

          <button
            type="button"
            onClick={clearRememberedReview}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Reset demo + clear remembered review
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(27,42,77,0.9),rgba(10,18,38,0.92))] p-5 shadow-[0_24px_80px_rgba(3,8,20,0.35)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-electric/70">Child-facing classroom cues</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{turnCue.headline}</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/75">{turnCue.guidance}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Turn owner" value={turnCue.ownerLabel} accentClass={turnCue.accentClass} />
                <StatusPill label="Current state" value={snapshot.state.replaceAll("_", " ")} accentClass="bg-white/10 text-white" />
                <StatusPill label="Board section" value={activeBoardTitle} accentClass="bg-mint/10 text-mint" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <ClassroomCueCard title="What Maximus is doing" value={getTutorActivityLabel(snapshot)} description={getTutorActivityDescription(snapshot)} />
              <ClassroomCueCard title="What the student should do" value={getStudentActionLabel(snapshot)} description={turnCue.nextStep} />
              <ClassroomCueCard title="What happens next" value={getNextMilestoneLabel(snapshot)} description={activeBoardSubtitle} />
            </div>

            <div className={`mt-5 rounded-3xl border p-4 ${transition.accentClass}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Lesson transition</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/80">
                      {transition.badge}
                    </span>
                    {transition.isFresh ? (
                      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70">
                        fresh handoff
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{transition.nowStarting}</h3>
                  <p className="mt-2 text-sm text-white/75">{transition.continuity}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/60 px-4 py-3 text-sm text-white/75">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">What just happened</p>
                  <p className="mt-2 font-semibold text-white">{transition.justFinished}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Now starting</p>
                  <p className="mt-2 text-sm font-semibold text-white">{transition.nowStarting}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1328]/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">What happens next</p>
                  <p className="mt-2 text-sm font-semibold text-white">{transition.nextBeat}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-[#0b1328]/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Teacher-turn pacing</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{pacing.lessonStageLabel}</h3>
                  <p className="mt-2 text-sm text-white/70">{pacing.stageDescription}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Reveal progress</p>
                  <p className="mt-2 text-lg font-semibold text-white">{pacing.stagePercent}%</p>
                  <p className="mt-1 text-xs text-white/55">{pacing.revealLabel}</p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.9),rgba(45,212,191,0.9))] transition-all duration-500"
                  style={{ width: `${pacing.stagePercent}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3">
                  {pacing.timeline.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/75">
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-semibold ${timelineBadgeClass(item.state)}`}
                      >
                        {item.state === "complete" ? "✓" : item.state === "active" ? "●" : "○"}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Revealing now</p>
                  <p className="mt-2 text-base font-semibold text-white">{pacing.revealLabel}</p>
                  <p className="mt-2 text-sm text-white/70">{pacing.revealDetail}</p>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1328]/80 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Next reveal</p>
                    <p className="mt-2 text-sm font-semibold text-white">{pacing.nextReveal}</p>
                  </div>
                  <div className={`mt-3 rounded-2xl border p-3 ${pacing.teacherHoldActive ? "border-electric/20 bg-electric/10" : "border-white/10 bg-white/5"}`}>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Board settle</p>
                    <p className="mt-2 text-sm font-semibold text-white">{pacing.holdLabel}</p>
                    <p className="mt-2 text-xs text-white/65">{pacing.holdDetail}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">{boardPresentation.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{boardPresentation.title}</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/70">{boardPresentation.subtitle}</p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${getBoardZoneBadgeClass(boardPresentation.emphasisTone)}`}>
                {boardPresentation.zoneBadge}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Turn rhythm</p>
                <p className="mt-2 text-sm font-semibold text-white">{getTurnRhythmLabel(snapshot)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Student prompt</p>
                <p className="mt-2 text-sm font-semibold text-white">{getStudentPrompt(snapshot)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Review posture</p>
                <p className="mt-2 text-sm font-semibold text-white">{getReviewPosture(snapshot)}</p>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${getTransitionSurfaceClass(transition.emphasis)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Lesson continuity cue</p>
                  <p className="mt-2 text-base font-semibold text-white">{transition.justFinished}</p>
                  <p className="mt-2 text-sm text-white/65">{transition.continuity}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {transition.badge}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#08101f] p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Now on deck</p>
                  <p className="mt-2 text-sm font-semibold text-white">{transition.nowStarting}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#08101f] p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Then</p>
                  <p className="mt-2 text-sm font-semibold text-white">{transition.nextBeat}</p>
                </div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border border-dashed p-4 ${pacing.teacherHoldActive ? "border-electric/20 bg-electric/10" : "border-white/10 bg-[#0b1328]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Teacher reveal status</p>
                  <p className="mt-2 text-base font-semibold text-white">{pacing.boardStateLabel}</p>
                  <p className="mt-2 text-sm text-white/65">{pacing.teacherHoldActive ? pacing.holdDetail : pacing.revealDetail}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {pacing.teacherHoldActive ? "settled hold" : `${pacing.stagePercent}% revealed`}
                </div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${reviewHandoff.active ? "border-violet-300/20 bg-violet-400/10" : "border-white/10 bg-[#0b1328]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Teacher-review handoff</p>
                  <p className="mt-2 text-base font-semibold text-white">{reviewHandoff.label}</p>
                  <p className="mt-2 text-sm text-white/65">{reviewHandoff.detail}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {reviewHandoff.active ? `${Math.round(reviewHandoff.progress * 100)}% handed back` : "idle"}
                </div>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${lessonClose.active ? "border-emerald-300/20 bg-emerald-400/10" : "border-white/10 bg-[#0b1328]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Lesson-close landing</p>
                  <p className="mt-2 text-base font-semibold text-white">{lessonClose.label}</p>
                  <p className="mt-2 text-sm text-white/65">{lessonClose.detail}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                  {lessonClose.active ? `${Math.round(lessonClose.progress * 100)}% landed` : "idle"}
                </div>
              </div>
            </div>
          </section>

          <CanonicalWhiteboard
            renderMode="layered-v2"
            title={boardPresentation.title}
            subtitle={boardPresentation.subtitle}
            ownershipLabel={boardPresentation.ownershipLabel}
            surfaceFocusLabel={boardPresentation.focusLabel}
            surfaceFocusDetail={boardPresentation.focusDetail}
            emphasisTone={boardPresentation.emphasisTone}
            teacherRevealProgress={pacing.stagePercent}
            activeRevealActionIndex={getActiveRevealActionIndex(pacing)}
            teacherMotionEnabled={isTeacherRevealState(snapshot.state)}
            teacherHoldActive={pacing.teacherHoldActive}
            teacherHoldStrength={pacing.teacherHoldStrength}
            reviewHandoffActive={reviewHandoff.active}
            reviewHandoffLabel={reviewHandoff.label}
            reviewHandoffDetail={reviewHandoff.detail}
            reviewHandoffProgress={reviewHandoff.progress}
            lessonCloseActive={lessonClose.active}
            lessonCloseLabel={lessonClose.label}
            lessonCloseDetail={lessonClose.detail}
            lessonCloseProgress={lessonClose.progress}
            tutorActions={snapshot.activeTurn?.actions ?? []}
            studentInputEnabled={snapshot.studentInput.board}
            onStudentSubmit={handleBoardSubmission}
          />

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">Turn plan review</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {snapshot.activeTurn ? snapshot.activeTurn.turnId : "No active tutor turn"}
                    </h2>
                    <p className="mt-2 text-sm text-white/65">
                      Child-facing cues live above. This section keeps the exact reviewable action list available for technical inspection.
                    </p>
                  </div>
                  <div className="rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-medium text-electric">
                    {snapshot.activeTurn?.expectsStudentEvidence ? "expects student evidence" : "no student evidence expected"}
                  </div>
                </div>

                <ol className="mt-4 space-y-3">
                  {pacing.actionStatuses.map((action, index) => (
                    <li key={action.key} className="rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{action.label}</p>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${actionStatusClass(action.state)}`}>
                              {action.state}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/70">{action.detail}</p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/55">#{index + 1}</span>
                      </div>
                    </li>
                  ))}
                </ol>

                {!snapshot.activeTurn ? <p className="mt-4 text-sm text-white/55">Start the preview to mount the first tutor turn.</p> : null}
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Technical inspection — retained evidence + next events</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {snapshot.allowedNextEvents.length > 0 ? (
                    snapshot.allowedNextEvents.map((eventType) => (
                      <span
                        key={eventType}
                        className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-medium text-mint"
                      >
                        {eventType}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">No events allowed</span>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">Retained student evidence</p>
                  <pre className="mt-3 overflow-x-auto text-xs leading-6 text-white/75">{formatEvidence(studentEvidence)}</pre>
                </div>

                <div className="mt-4 rounded-2xl border border-electric/15 bg-electric/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-electric/70">Packaged review artifacts</p>

                  {voiceEvidence?.reviewContext ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                      <p>
                        Voice utterance <span className="font-semibold text-white">{voiceEvidence.utteranceId}</span> normalized to <span className="font-semibold text-white">{JSON.stringify(voiceEvidence.normalizedTranscript)}</span>.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-white/65">
                        <li>raw transcript: {voiceEvidence.transcript}</li>
                        <li>startedAt: {voiceEvidence.startedAt}</li>
                        <li>endedAt: {voiceEvidence.endedAt}</li>
                        <li>segments packaged: {voiceEvidence.segments?.length ?? 0}</li>
                        <li>turnId: {voiceEvidence.reviewContext.turnId}</li>
                        <li>prompt: {voiceEvidence.reviewContext.prompt ?? "none"}</li>
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/55">
                      No voice submission package yet. Reach the student turn, then submit a preview transcript to see normalized tutor-review input.
                    </p>
                  )}

                  {boardEvidence?.snapshot && boardEvidence.reviewContext ? (
                    <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                      <p>
                        Submission <span className="font-semibold text-white">{boardEvidence.submissionId}</span> captured {boardEvidence.snapshot.strokeCount} stroke{boardEvidence.snapshot.strokeCount === 1 ? "" : "s"} at {boardEvidence.snapshot.width}×{boardEvidence.snapshot.height}.
                      </p>
                      <ul className="space-y-1 text-xs text-white/65">
                        <li>lessonId: {boardEvidence.reviewContext.lessonId}</li>
                        <li>turnId: {boardEvidence.reviewContext.turnId}</li>
                        <li>state at capture: {boardEvidence.reviewContext.state}</li>
                        <li>prompt: {boardEvidence.reviewContext.prompt ?? "none"}</li>
                        <li>teacher actions packaged: {boardEvidence.reviewContext.actions.length}</li>
                      </ul>
                      <details className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                          Snapshot preview data URL
                        </summary>
                        <p className="mt-2 break-all text-[11px] leading-5 text-white/55">{boardEvidence.snapshot.dataUrl}</p>
                      </details>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Technical inspection — orchestrator + transport</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-sky-100/80">V2 realtime adapter seam</p>
                    <div className="mt-3 space-y-2 text-sm text-white/80">
                      <p>Transport connected: {transportSnapshot.connected ? "yes" : "no"}</p>
                      <p>Transport status: {transportSnapshot.status}</p>
                      <p>Mic muted by adapter: {transportSnapshot.micMuted ? "yes" : "no"}</p>
                      <p>Effective policy: {transportSnapshot.appliedPolicy?.studentCapture ?? "not applied yet"}</p>
                      <p>Policy state owner: {transportSnapshot.appliedPolicy?.classroomState ?? "n/a"}</p>
                      <p>Speech cues emitted: {transportSnapshot.spokenTexts.length}</p>
                    </div>
                    <p className="mt-3 text-xs text-white/60">
                      The preview is still browser-local, but tutor speech plus state-aware student capture policy now flow through a transport-shaped adapter instead of direct realtime coupling.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Whiteboard architecture freeze</p>
                    <p className="mt-2 text-sm font-semibold text-white">{CANONICAL_WHITEBOARD_ARCHITECTURE.label}</p>
                    <p className="mt-2 text-sm text-white/70">{CANONICAL_WHITEBOARD_ARCHITECTURE.rationale}</p>
                    <p className="mt-3 text-xs text-white/55">Next planned slice: {CANONICAL_WHITEBOARD_ARCHITECTURE.nextStep}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Recent orchestrator dispatches</p>
                <div className="mt-4 space-y-3">
                  {history.length > 0 ? (
                    history.map((entry, index) => (
                      <div key={`${entry.event.type}-${index}`} className="rounded-2xl border border-white/10 bg-[#0b1328] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{entry.event.type}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              entry.ok ? "bg-mint/15 text-mint" : "bg-softred/15 text-softred"
                            }`}
                          >
                            {entry.ok ? "ok" : entry.error.code}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/55">
                          {entry.previous.state} → {entry.ok ? entry.current.state : entry.previous.state}
                        </p>
                        {!entry.ok ? <p className="mt-2 text-sm text-softred">{entry.error.message}</p> : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#0b1328] p-4 text-sm text-white/55">
                      No events yet. Use the controls on the left to drive the demo lesson.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Adapter-issued transport commands</p>
                <div className="mt-3 space-y-2">
                  {transportSnapshot.commands.length > 0 ? (
                    transportSnapshot.commands.slice(-8).reverse().map((command, index) => (
                      <div key={`${command.type}-${index}`} className="rounded-xl border border-white/10 bg-[#0b1328] p-3 text-xs text-white/75">
                        <code>{formatTransportCommand(command)}</code>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[#0b1328] p-3 text-xs text-white/55">
                      No transport commands yet. Start the demo turn to watch the orchestrator drive the realtime-shaped adapter.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function ClassroomCueCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1328]/80 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/65">{description}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-[#0b1328]/80 px-3 py-2 text-xs text-white/75">
      <span className="mr-2 text-white/45">{label}</span>
      <span className={`rounded-full px-2 py-1 font-semibold ${accentClass}`}>{value}</span>
    </div>
  );
}

function usePreviewPacingSnapshot(snapshot: ClassroomOrchestratorSnapshot, phaseStartedAt: number): PreviewPacingSnapshot {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!["tutor_rendering", "tutor_speaking", "tutor_reviewing"].includes(snapshot.state)) {
      setNow(Date.now());
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 240);

    return () => window.clearInterval(interval);
  }, [snapshot.state, phaseStartedAt]);

  return useMemo(() => getPreviewPacingSnapshot(snapshot, Math.max(0, now - phaseStartedAt)), [snapshot, now, phaseStartedAt]);
}

function useTransitionSnapshot(snapshot: ClassroomOrchestratorSnapshot, studentName: string): TransitionSnapshot {
  const [transitionStartedAt, setTransitionStartedAt] = useState(() => Date.now());
  const [previousState, setPreviousState] = useState<ClassroomOrchestratorSnapshot["state"] | null>(null);
  const lastSeenStateRef = useRef<ClassroomOrchestratorSnapshot["state"]>(snapshot.state);

  useEffect(() => {
    if (lastSeenStateRef.current === snapshot.state) {
      return;
    }

    setPreviousState(lastSeenStateRef.current);
    setTransitionStartedAt(Date.now());
    lastSeenStateRef.current = snapshot.state;
  }, [snapshot.state]);

  return useMemo(
    () =>
      getTransitionSnapshot({
        snapshot,
        previousState,
        studentName,
        elapsedMs: Date.now() - transitionStartedAt,
      }),
    [snapshot, previousState, studentName, transitionStartedAt],
  );
}

function createPreviewRuntime(studentId: string, handoff: PreviewLaunchHandoff | null) {
  const transport = createInMemoryClassroomRealtimeTransport(studentId);
  void transport.connect();

  const realtime = createClassroomRealtimeOrchestrationAdapter({
    transport,
  });

  const orchestrator = createClassroomOrchestrator({
    lessonId: "classroom-v2-preview",
    adapters: realtime.adapters,
  });

  transport.applySessionPolicy(getClassroomRealtimeSessionPolicy(orchestrator.getSnapshot()));
  applyPreviewLaunchHandoff(orchestrator, studentId, handoff);
  transport.applySessionPolicy(getClassroomRealtimeSessionPolicy(orchestrator.getSnapshot()));

  return {
    orchestrator,
    realtime,
  };
}

function getPrimaryAdvanceEvent(
  snapshot: ClassroomOrchestratorSnapshot,
): ClassroomTransitionEvent | null {
  if (snapshot.allowedNextEvents.includes("classroom.startTutorTurn")) {
    return {
      type: "classroom.startTutorTurn",
      turn: INITIAL_TURN,
    };
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorRendering") && snapshot.activeTurn) {
    return {
      type: "classroom.finishTutorRendering",
      nextState: getPostRenderState(snapshot.activeTurn),
    };
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorSpeaking") && snapshot.activeTurn) {
    return {
      type: "classroom.finishTutorSpeaking",
      nextState: snapshot.activeTurn.expectsStudentEvidence ? "student_answering" : "ended",
    };
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorReview")) {
    return {
      type: "classroom.finishTutorReview",
      nextState: REVIEW_TURN.expectsStudentEvidence ? "tutor_rendering" : "tutor_rendering",
      nextTurn: REVIEW_TURN,
    };
  }

  return null;
}

function getPrimaryAdvanceLabel(snapshot: ClassroomOrchestratorSnapshot) {
  if (snapshot.allowedNextEvents.includes("classroom.startTutorTurn")) {
    return "Start demo tutor turn";
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorRendering")) {
    return "Finish tutor rendering";
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorSpeaking")) {
    return snapshot.activeTurn?.expectsStudentEvidence ? "Finish tutor speaking → student turn" : "Finish tutor speaking → end";
  }

  if (snapshot.allowedNextEvents.includes("classroom.finishTutorReview")) {
    return "Finish tutor review → next tutor turn";
  }

  return "No automatic next step";
}

function getPostRenderState(turn: TutorTurnPlan): Extract<ClassroomTransitionEvent, { type: "classroom.finishTutorRendering" }>["nextState"] {
  const hasSpeech = turn.actions.some((action) => action.type === "speak" || action.type === "ask");

  if (hasSpeech) {
    return "tutor_speaking";
  }

  if (turn.expectsStudentEvidence) {
    return "student_answering";
  }

  return "ended";
}

function getBoardEvidence(evidence: StudentEvidence | null) {
  if (!evidence) {
    return null;
  }

  if (evidence.type === "board") {
    return evidence;
  }

  if (evidence.type === "both") {
    return evidence.board;
  }

  return null;
}

function getVoiceEvidence(evidence: StudentEvidence | null): StudentVoiceEvidence | null {
  if (!evidence) {
    return null;
  }

  if (evidence.type === "voice") {
    return evidence;
  }

  if (evidence.type === "both") {
    return evidence.voice;
  }

  return null;
}

function getTurnCue(snapshot: ClassroomOrchestratorSnapshot, studentName: string): TurnCue {
  switch (snapshot.state) {
    case "idle":
      return {
        ownerLabel: "Maximus gets ready",
        ownerBadge: "Warmup",
        headline: "Maximus is getting the lesson ready.",
        guidance: `${studentName} can relax and wait for the first problem to appear on the board.`,
        nextStep: "Press start to let Maximus open the lesson.",
        statusTone: "Waiting to begin",
        accentClass: "bg-electric/15 text-electric",
        panelClass: "border-electric/25 bg-electric/10",
      };
    case "tutor_rendering":
      return {
        ownerLabel: "Maximus owns the turn",
        ownerBadge: "Teacher turn",
        headline: "Watch the board — Maximus is setting up the lesson.",
        guidance: "The teacher layer is being prepared, so the student should watch and get ready.",
        nextStep: "Next, Maximus will talk through the problem.",
        statusTone: "Teaching setup",
        accentClass: "bg-electric/15 text-electric",
        panelClass: "border-electric/25 bg-electric/10",
      };
    case "tutor_speaking":
      return {
        ownerLabel: "Maximus owns the turn",
        ownerBadge: "Teacher speaking",
        headline: "Listen to Maximus.",
        guidance: "The child-facing cue is to listen and look at the board while Maximus explains the step.",
        nextStep: snapshot.activeTurn?.expectsStudentEvidence
          ? "After the explanation, it will become the student's turn to answer."
          : "After this explanation, the preview lesson can end or move on.",
        statusTone: "Live explanation",
        accentClass: "bg-electric/15 text-electric",
        panelClass: "border-electric/25 bg-electric/10",
      };
    case "student_answering":
      return {
        ownerLabel: `${studentName} owns the turn`,
        ownerBadge: "Student turn",
        headline: "Your turn — say it or show it on the board.",
        guidance: "The student can speak, draw, and then check or submit work while Maximus waits.",
        nextStep: "Answer now, then submit so Maximus can review the work.",
        statusTone: "Waiting for student work",
        accentClass: "bg-mint/15 text-mint",
        panelClass: "border-mint/25 bg-mint/10",
      };
    case "student_submitted":
      return {
        ownerLabel: "Student turn is complete",
        ownerBadge: "Work sent",
        headline: "Nice — the answer is in.",
        guidance: "The student has finished the response and Maximus can now begin reviewing it.",
        nextStep: "Start tutor review so Maximus can respond.",
        statusTone: "Awaiting review",
        accentClass: "bg-amber-300/15 text-amber-200",
        panelClass: "border-amber-300/25 bg-amber-300/10",
      };
    case "tutor_reviewing":
      return {
        ownerLabel: "Maximus owns the turn",
        ownerBadge: "Teacher reviewing",
        headline: "Maximus is checking the work.",
        guidance: "The preview is in teacher-review mode, where Maximus looks at the answer and prepares feedback.",
        nextStep: "Finish review to show the next teacher step on the board.",
        statusTone: "Review + feedback",
        accentClass: "bg-violet-400/15 text-violet-200",
        panelClass: "border-violet-400/25 bg-violet-400/10",
      };
    case "ended":
      return {
        ownerLabel: "Lesson complete",
        ownerBadge: "Finished",
        headline: "Maximus has landed the lesson.",
        guidance: "The preview now holds the finished classroom beat for a moment so the ending reads like an intentional close, not an abrupt stop.",
        nextStep: "Reset the preview to replay the lesson.",
        statusTone: "Lesson landed",
        accentClass: "bg-emerald-300/15 text-emerald-100",
        panelClass: "border-emerald-300/20 bg-emerald-400/10",
      };
  }
}

function getBoardTitle(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Classroom board standby";
    case "tutor_rendering":
      return "Maximus is writing the setup";
    case "tutor_speaking":
      return "Maximus is teaching from the board";
    case "student_answering":
      return "Student work time";
    case "student_submitted":
      return "Student work captured";
    case "tutor_reviewing":
      return "Maximus is reviewing the work";
    case "ended":
      return "Lesson recap board";
  }
}

function getBoardSubtitle(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "The board is waiting for the opening teacher turn.";
    case "tutor_rendering":
      return "Teacher visuals are being prepared before the spoken explanation begins.";
    case "tutor_speaking":
      return snapshot.activeTurn?.expectsStudentEvidence
        ? "Teacher owns the floor right now; student input stays quiet until Maximus finishes speaking."
        : "Teacher is finishing the explanation before the lesson closes or advances.";
    case "student_answering":
      return "Student tools are open now, so the child can speak, draw, and submit work from this board.";
    case "student_submitted":
      return "The student answer is saved and ready for teacher review.";
    case "tutor_reviewing":
      return "Teacher feedback is being prepared from the submitted evidence and board context.";
    case "ended":
      return "The board stays in a deliberate landed posture so the lesson close can be reviewed after completion.";
  }
}

function getTutorActivityLabel(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Waiting to start";
    case "tutor_rendering":
      return "Building the board";
    case "tutor_speaking":
      return "Explaining out loud";
    case "student_answering":
      return "Listening and waiting";
    case "student_submitted":
      return "Ready to review";
    case "tutor_reviewing":
      return "Studying the student's work";
    case "ended":
      return "Closing the lesson on purpose";
  }
}

function getTutorActivityDescription(snapshot: ClassroomOrchestratorSnapshot) {
  if (!snapshot.activeTurn) {
    return "No tutor turn is active yet in the preview.";
  }

  const speakAction = snapshot.activeTurn.actions.find((action) => action.type === "speak");
  const askAction = snapshot.activeTurn.actions.find((action) => action.type === "ask");

  if (snapshot.state === "tutor_speaking" && speakAction?.type === "speak") {
    return `Current spoken cue: ${speakAction.text}`;
  }

  if (snapshot.state === "student_answering" && askAction?.type === "ask") {
    return `Prompt in play: ${askAction.prompt}`;
  }

  return `${snapshot.activeTurn.actions.length} tutor action${snapshot.activeTurn.actions.length === 1 ? "" : "s"} are attached to this turn.`;
}

function getPreviewPacingSnapshot(
  snapshot: ClassroomOrchestratorSnapshot,
  elapsedMs: number,
): PreviewPacingSnapshot {
  const stagePercent = getStagePercent(snapshot, elapsedMs);
  const actionStatuses = getActionStatuses(snapshot, stagePercent);
  const activeAction = actionStatuses.find((action) => action.state === "active");
  const queuedAction = actionStatuses.find((action) => action.state === "queued");
  const teacherHoldActive = isTeacherHoldWindow(snapshot, stagePercent);
  const teacherHoldStrength = teacherHoldActive ? getTeacherHoldStrength(stagePercent) : 0;

  return {
    lessonStageLabel: getLessonStageLabel(snapshot),
    stageDescription: getLessonStageDescription(snapshot, stagePercent),
    stagePercent,
    revealLabel: activeAction?.label ?? getDefaultRevealLabel(snapshot),
    revealDetail: activeAction?.detail ?? getDefaultRevealDetail(snapshot),
    nextReveal: queuedAction?.label ?? getNextMilestoneLabel(snapshot),
    holdLabel: getTeacherHoldLabel(snapshot, teacherHoldActive),
    holdDetail: getTeacherHoldDetail(snapshot, teacherHoldActive),
    boardStateLabel: getBoardStateLabel(snapshot, teacherHoldActive),
    teacherHoldActive,
    teacherHoldStrength,
    timeline: getLessonTimeline(snapshot),
    actionStatuses,
  };
}

function getStagePercent(snapshot: ClassroomOrchestratorSnapshot, elapsedMs: number) {
  switch (snapshot.state) {
    case "idle":
      return 0;
    case "tutor_rendering":
      return clampPercent((elapsedMs / 2600) * 100);
    case "tutor_speaking":
      return clampPercent(18 + (elapsedMs / 3800) * 82);
    case "student_answering":
      return 100;
    case "student_submitted":
      return 100;
    case "tutor_reviewing":
      return clampPercent(24 + (elapsedMs / 3200) * 76);
    case "ended":
      return 100;
  }
}

function isTeacherHoldWindow(snapshot: ClassroomOrchestratorSnapshot, stagePercent: number) {
  if (!isTeacherRevealState(snapshot.state)) {
    return false;
  }

  return stagePercent >= 82;
}

function getTeacherHoldStrength(stagePercent: number) {
  return clampUnit((stagePercent - 82) / 18);
}

function getTeacherHoldLabel(snapshot: ClassroomOrchestratorSnapshot, teacherHoldActive: boolean) {
  if (!teacherHoldActive) {
    return "Board is still revealing the teacher move";
  }

  switch (snapshot.state) {
    case "tutor_rendering":
      return "The setup has landed and is being held on purpose";
    case "tutor_speaking":
      return "The explanation has landed and the board is being held steady";
    case "tutor_reviewing":
      return "The feedback board has landed before the next handoff";
    default:
      return "The board is holding the finished teacher beat";
  }
}

function getTeacherHoldDetail(snapshot: ClassroomOrchestratorSnapshot, teacherHoldActive: boolean) {
  if (!teacherHoldActive) {
    return "Teacher-owned motion is still guiding the board into place before the beat fully settles.";
  }

  switch (snapshot.state) {
    case "tutor_rendering":
      return "This brief settle makes the board feel intentionally placed before Maximus starts talking through it.";
    case "tutor_speaking":
      return "The board stops feeling like it is still arriving and instead reads like Maximus is deliberately holding the finished teaching moment.";
    case "tutor_reviewing":
      return "The review visuals now pause in a calmer landed posture so the coaching beat feels acknowledged before the next move.";
    default:
      return "The current teacher-owned board moment is being held intentionally before the next transition.";
  }
}

function getBoardStateLabel(snapshot: ClassroomOrchestratorSnapshot, teacherHoldActive: boolean) {
  if (!isTeacherRevealState(snapshot.state)) {
    return getDefaultRevealLabel(snapshot);
  }

  return teacherHoldActive ? "Teacher board has landed and is holding" : "Teacher board is still revealing";
}

function getLessonTimeline(snapshot: ClassroomOrchestratorSnapshot): PreviewPacingSnapshot["timeline"] {
  const order: ClassroomOrchestratorSnapshot["state"][] = [
    "tutor_rendering",
    "tutor_speaking",
    "student_answering",
    "tutor_reviewing",
  ];
  const currentIndex = order.indexOf(snapshot.state);

  return [
    { key: "render", label: "Write the setup on the board", state: getTimelineItemState(snapshot.state, currentIndex, 0, ["idle"]) },
    { key: "speak", label: "Explain the step out loud", state: getTimelineItemState(snapshot.state, currentIndex, 1, ["idle"]) },
    { key: "student", label: "Open the student response window", state: getTimelineItemState(snapshot.state, currentIndex, 2, ["idle"]) },
    { key: "review", label: "Review and coach the answer", state: getTimelineItemState(snapshot.state, currentIndex, 3, ["idle", "student_submitted"]) },
  ];
}

function getTimelineItemState(
  state: ClassroomOrchestratorSnapshot["state"],
  currentIndex: number,
  targetIndex: number,
  preIdleStates: ClassroomOrchestratorSnapshot["state"][] = [],
): "complete" | "active" | "upcoming" {
  if (state === "ended") {
    return "complete";
  }

  if (preIdleStates.includes(state)) {
    return "upcoming";
  }

  if (state === "student_submitted") {
    if (targetIndex <= 2) {
      return "complete";
    }

    return targetIndex === 3 ? "active" : "upcoming";
  }

  if (currentIndex === -1) {
    return "upcoming";
  }

  if (targetIndex < currentIndex) {
    return "complete";
  }

  if (targetIndex === currentIndex) {
    return "active";
  }

  return "upcoming";
}

function getActionStatuses(snapshot: ClassroomOrchestratorSnapshot, stagePercent: number): PreviewPacingSnapshot["actionStatuses"] {
  const actions = snapshot.activeTurn?.actions ?? [];

  if (actions.length === 0) {
    return [];
  }

  const revealCount = Math.max(1, Math.ceil((stagePercent / 100) * actions.length));

  return actions.map((action, index) => ({
    key: `${snapshot.activeTurn?.turnId ?? "no-turn"}-${index}`,
    label: action.type,
    detail: describeAction(action),
    state: index < revealCount - 1 ? "revealed" : index === revealCount - 1 ? "active" : "queued",
  }));
}

function getLessonStageLabel(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Lesson warmup";
    case "tutor_rendering":
      return "Teacher is writing the setup";
    case "tutor_speaking":
      return "Teacher is revealing the explanation";
    case "student_answering":
      return "Student response window is open";
    case "student_submitted":
      return "Student work is queued for feedback";
    case "tutor_reviewing":
      return "Teacher is preparing feedback";
    case "ended":
      return "Lesson landed and held for review";
  }
}

function getLessonStageDescription(snapshot: ClassroomOrchestratorSnapshot, stagePercent: number) {
  switch (snapshot.state) {
    case "idle":
      return "The preview is waiting for Maximus to begin the first modeled turn.";
    case "tutor_rendering":
      return `Maximus is staging the board before speaking so the child sees the problem build up intentionally (${stagePercent}% revealed).`;
    case "tutor_speaking":
      return `The explanation is now unfolding on top of the prepared board, keeping the student in watch-and-listen mode (${stagePercent}% through this teacher beat).`;
    case "student_answering":
      return "Teacher reveal is complete for now; the child can answer by voice, board, or both.";
    case "student_submitted":
      return "The student's work is in, and the preview is holding the handoff before teacher feedback begins.";
    case "tutor_reviewing":
      return `Maximus is turning submitted evidence into the next coaching move, so the review beat feels like a real pause before feedback (${stagePercent}% through review).`;
    case "ended":
      return "The staged lesson remains visible in a small landed hold so the final teacher beat can be reviewed after the preview loop finishes.";
  }
}

function getTransitionSnapshot({
  snapshot,
  previousState,
  studentName,
  elapsedMs,
}: {
  snapshot: ClassroomOrchestratorSnapshot;
  previousState: ClassroomOrchestratorSnapshot["state"] | null;
  studentName: string;
  elapsedMs: number;
}): TransitionSnapshot {
  const isFresh = elapsedMs < 2600;

  switch (snapshot.state) {
    case "idle":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished: previousState === "ended" ? "The previous preview run finished cleanly." : "The lesson has not started yet.",
        nowStarting: "Maximus is waiting to open the lesson.",
        continuity: "This is the quiet setup moment before the first teaching beat appears on the board.",
        nextBeat: "Start the tutor turn to let the first modeled problem appear.",
        accentClass: "border-white/10 bg-white/5",
        badge: "Warmup",
        emphasis: "neutral",
        isFresh,
      };
    case "tutor_rendering":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished:
          previousState === "tutor_reviewing"
            ? "Maximus finished reviewing the last answer and is rolling straight into the next teacher move."
            : previousState === "idle"
              ? "The warmup ended and the lesson has officially begun."
              : "A prior beat wrapped and the teacher is reclaiming the board.",
        nowStarting: "Maximus is laying out the next board step before speaking.",
        continuity:
          previousState === "tutor_reviewing"
            ? "The feedback beat is turning into a fresh modeled step so the lesson keeps flowing instead of hard-resetting."
            : "The board setup is the bridge into the next explanation, giving the student visual continuity before the words begin.",
        nextBeat: "After the setup finishes, Maximus will talk through this exact board moment.",
        accentClass: "border-electric/25 bg-electric/10",
        badge: "Teacher setup",
        emphasis: "teacher",
        isFresh,
      };
    case "tutor_speaking":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished: "The board setup is done, so the written problem is now ready to be explained.",
        nowStarting: "Maximus is connecting the fresh board work to the spoken explanation.",
        continuity: "This handoff turns silent setup into guided teaching, so the same board content now gets narrated instead of feeling like a new scene.",
        nextBeat: snapshot.activeTurn?.expectsStudentEvidence
          ? `${studentName} will get the floor as soon as Maximus finishes speaking.`
          : "The lesson will either close or move directly into the next teacher beat.",
        accentClass: "border-electric/25 bg-electric/10",
        badge: "Explain",
        emphasis: "teacher",
        isFresh,
      };
    case "student_answering":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished: "Maximus finished the explanation and released the floor.",
        nowStarting: `${studentName} now owns the response beat.`,
        continuity: "The same problem stays on the board, but the responsibility shifts from watching to answering so the lesson feels like one continuous exchange.",
        nextBeat: "Submit the answer and Maximus will switch into review mode.",
        accentClass: "border-mint/25 bg-mint/10",
        badge: "Student handoff",
        emphasis: "student",
        isFresh,
      };
    case "student_submitted":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished: `${studentName} finished the response and the evidence is locked in.`,
        nowStarting: "The preview is holding the answer in a short pause before teacher review begins.",
        continuity: "This buffer keeps the submission from feeling abrupt by marking the moment between student effort and teacher feedback.",
        nextBeat: "Begin tutor review so Maximus can inspect the work and coach the next step.",
        accentClass: "border-amber-300/25 bg-amber-300/10",
        badge: "Answer received",
        emphasis: "review",
        isFresh,
      };
    case "tutor_reviewing":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished: "The student's answer has been captured and handed back to Maximus.",
        nowStarting: "Maximus is translating that answer into feedback.",
        continuity: "Review is framed as a real thinking beat, so the lesson acknowledges the student's work before jumping into correction or praise.",
        nextBeat: snapshot.allowedNextEvents.includes("classroom.finishTutorReview")
          ? "When review finishes, Maximus will either model the next step or close the lesson."
          : "The next teacher move will appear after review completes.",
        accentClass: "border-violet-400/25 bg-violet-400/10",
        badge: "Review handoff",
        emphasis: "review",
        isFresh,
      };
    case "ended":
      return {
        fromState: previousState,
        toState: snapshot.state,
        justFinished:
          previousState === "tutor_reviewing"
            ? "Maximus finished the review beat and wrapped the lesson."
            : "The last active classroom beat has concluded.",
        nowStarting: "The lesson is complete and ready for replay or inspection.",
        continuity: "Ending is treated like the last classroom handoff, so the preview lands cleanly instead of disappearing after the final teacher move.",
        nextBeat: "Reset the demo to replay the full lesson flow from the top.",
        accentClass: "border-white/15 bg-white/5",
        badge: "Lesson end",
        emphasis: "neutral",
        isFresh,
      };
  }
}

function getDefaultRevealLabel(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Waiting for the first teacher move";
    case "student_answering":
      return "Student is actively working";
    case "student_submitted":
      return "Student answer has been captured";
    case "ended":
      return "Preview is complete";
    default:
      return "Teacher turn is in progress";
  }
}

function getDefaultRevealDetail(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Start the demo to let the first teacher turn begin revealing on the board.";
    case "student_answering":
      return "The teacher reveal has paused so the student can respond using the open tools.";
    case "student_submitted":
      return "The answer is preserved, and Maximus can now pivot into a review beat.";
    case "ended":
      return "Reset the preview to watch the staged teacher flow again.";
    default:
      return "The preview is staging the current teacher-owned classroom beat.";
  }
}

function getActiveRevealActionIndex(pacing: PreviewPacingSnapshot) {
  const activeIndex = pacing.actionStatuses.findIndex((action) => action.state === "active");

  if (activeIndex >= 0) {
    return activeIndex;
  }

  const lastRevealedIndex = pacing.actionStatuses.findLastIndex((action) => action.state === "revealed");
  return lastRevealedIndex >= 0 ? lastRevealedIndex : null;
}

function isTeacherRevealState(state: ClassroomOrchestratorSnapshot["state"]) {
  return state === "tutor_rendering" || state === "tutor_speaking" || state === "tutor_reviewing";
}

function getReviewHandoffSnapshot(
  snapshot: ClassroomOrchestratorSnapshot,
  phaseStartedAt: number,
): ReviewHandoffSnapshot {
  const elapsedMs = Math.max(0, Date.now() - phaseStartedAt);

  if (snapshot.state === "student_submitted") {
    return {
      active: true,
      label: "Answer received — handing the board back to Maximus",
      detail: "The student's work stays visible while the lesson pauses just long enough to mark that Maximus is taking over for review.",
      progress: clampUnit(0.35 + elapsedMs / 2600),
    };
  }

  if (snapshot.state === "tutor_reviewing") {
    return {
      active: elapsedMs < 2600,
      label: "Maximus is now inspecting the submitted work",
      detail: "The review beat stays visibly connected to the student's answer so feedback feels handed off, not restarted.",
      progress: clampUnit(0.68 + elapsedMs / 3200),
    };
  }

  return {
    active: false,
    label: "Review handoff is idle",
    detail: "This cue wakes up only between answer capture and early teacher review.",
    progress: 0,
  };
}

function getLessonCloseSnapshot(
  snapshot: ClassroomOrchestratorSnapshot,
  phaseStartedAt: number,
): LessonCloseSnapshot {
  const elapsedMs = Math.max(0, Date.now() - phaseStartedAt);

  if (snapshot.state === "ended") {
    return {
      active: elapsedMs < 3600,
      label: "Lesson complete — Maximus is holding the finished beat",
      detail: "The preview keeps the final board state in view just long enough to make the close feel intentional and reviewable.",
      progress: clampUnit(0.56 + elapsedMs / 2600),
    };
  }

  return {
    active: false,
    label: "Lesson close is idle",
    detail: "This cue appears only when the preview has just landed on the final lesson-close beat.",
    progress: 0,
  };
}

function getReviewChecklist(
  snapshot: ClassroomOrchestratorSnapshot,
  history: ClassroomOrchestratorDispatchResult[],
): ReviewChecklistItem[] {
  const visitedStates = new Set<ClassroomOrchestratorSnapshot["state"]>([snapshot.state]);

  history.forEach((entry) => {
    visitedStates.add(entry.previous.state);

    if (entry.ok) {
      visitedStates.add(entry.current.state);
    }
  });

  const hasStudentEvidence = snapshot.session.studentEvidence !== null;

  return [
    {
      key: "teacher-setup",
      label: "Teacher-owned setup becomes visible",
      detail: "Confirm Maximus clearly takes the board first instead of dropping straight into open conversation.",
      done: visitedStates.has("tutor_rendering") || visitedStates.has("tutor_speaking"),
    },
    {
      key: "student-turn",
      label: "Student turn opens explicitly",
      detail: "Confirm the preview reaches a clear student-owned answer window with mic/board tools open.",
      done: visitedStates.has("student_answering"),
    },
    {
      key: "review-handoff",
      label: "Submitted answer hands back into teacher review",
      detail: "Confirm student evidence is captured and the flow visibly transitions into Maximus review.",
      done:
        hasStudentEvidence &&
        (visitedStates.has("student_submitted") || visitedStates.has("tutor_reviewing") || visitedStates.has("ended")),
    },
    {
      key: "lesson-close",
      label: "Lesson lands intentionally at the end",
      detail: "Confirm the demo reaches the finished hold state so the close reads like a deliberate classroom landing.",
      done: visitedStates.has("ended"),
    },
  ];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getStudentActionLabel(snapshot: ClassroomOrchestratorSnapshot) {
  if (snapshot.state === "student_answering") {
    return "Answer by voice or board";
  }

  if (snapshot.state === "student_submitted") {
    return "Wait for review";
  }

  if (snapshot.studentInput.board || snapshot.studentInput.mic) {
    return "Use open tools";
  }

  return "Watch and listen";
}

function getNextMilestoneLabel(snapshot: ClassroomOrchestratorSnapshot) {
  const label = getPrimaryAdvanceLabel(snapshot);

  if (label === "No automatic next step") {
    if (snapshot.allowedNextEvents.includes("classroom.beginTutorReview")) {
      return "Begin tutor review";
    }

    if (snapshot.allowedNextEvents.includes("classroom.endLesson")) {
      return "End the preview";
    }
  }

  return label;
}

function getBoardPresentationSnapshot(snapshot: ClassroomOrchestratorSnapshot, studentName: string): BoardPresentationSnapshot {
  switch (snapshot.state) {
    case "idle":
      return {
        eyebrow: "Board + lesson stage",
        title: "Board on standby for the first teaching move",
        subtitle: "The board is quiet for now so the opening teacher setup can arrive clearly when the preview starts.",
        ownershipLabel: "Warmup · waiting for Maximus",
        focusLabel: "The board is waiting for the lesson to begin",
        focusDetail: "No student action is needed yet; this surface will become the lesson anchor once Maximus opens the first turn.",
        emphasisTone: "neutral",
        zoneBadge: "board warmup",
      };
    case "tutor_rendering":
      return {
        eyebrow: "Board + lesson stage",
        title: "Maximus is writing the next teaching moment",
        subtitle: "The teacher layer owns the surface so the problem setup lands before the spoken explanation begins.",
        ownershipLabel: "Teacher board · Maximus is setting the board",
        focusLabel: "Teacher setup zone is active",
        focusDetail: "Visual attention stays on the teacher layer while Maximus stages the exact board content the student is about to hear explained.",
        emphasisTone: "teacher",
        zoneBadge: "teacher-owned board",
      };
    case "tutor_speaking":
      return {
        eyebrow: "Board + lesson stage",
        title: "Maximus is teaching from the board",
        subtitle: "The same written board moment now carries the spoken explanation so the lesson reads like one guided teacher beat.",
        ownershipLabel: "Teacher board · explanation in progress",
        focusLabel: "Teacher explanation zone is active",
        focusDetail: "The board stays visually centered while student tools remain quiet, making the explanation feel anchored instead of split across panels.",
        emphasisTone: "teacher",
        zoneBadge: "teacher-owned board",
      };
    case "student_answering":
      return {
        eyebrow: "Board + lesson stage",
        title: `${studentName} now works on the same lesson board`,
        subtitle: "Teacher work remains visible as context while the student layer becomes the active place to draw, think, and submit an answer.",
        ownershipLabel: `Student board · ${studentName}'s response beat`,
        focusLabel: "Student work zone is active",
        focusDetail: "The board keeps the teacher context in place, but ownership visibly shifts so the child knows this is their turn to respond.",
        emphasisTone: "student",
        zoneBadge: "student-owned board",
      };
    case "student_submitted":
      return {
        eyebrow: "Board + lesson stage",
        title: "The board is holding the student's work for review",
        subtitle: "Student evidence stays visible on the board so the upcoming teacher feedback feels connected to what was just submitted.",
        ownershipLabel: "Review handoff · answer captured",
        focusLabel: "Review handoff zone is active",
        focusDetail: "This short pause keeps the board anchored on the student's effort before Maximus starts coaching from it.",
        emphasisTone: "review",
        zoneBadge: "review handoff",
      };
    case "tutor_reviewing":
      return {
        eyebrow: "Board + lesson stage",
        title: "Maximus is reviewing the work on the board",
        subtitle: "The board shifts back into teacher ownership so feedback can grow directly out of the submitted answer and visible context.",
        ownershipLabel: "Teacher review · coaching from the board",
        focusLabel: "Teacher review zone is active",
        focusDetail: "The submitted work stays legible while the teacher layer regains emphasis, helping the review beat feel deliberate and teacher-led.",
        emphasisTone: "review",
        zoneBadge: "teacher review board",
      };
    case "ended":
      return {
        eyebrow: "Board + lesson stage",
        title: "Lesson-close board",
        subtitle: "The final board surface remains visible in a landed posture so the preview ends like an intentional teacher close instead of a hard stop.",
        ownershipLabel: "Lesson complete · landed board",
        focusLabel: "Lesson-close surface is active",
        focusDetail: "The lesson is done, but the board stays calmly in place so the final teacher beat can be reviewed as a finished moment.",
        emphasisTone: "neutral",
        zoneBadge: "lesson close",
      };
  }
}

function getBoardZoneBadgeClass(emphasis: TransitionSnapshot["emphasis"]) {
  switch (emphasis) {
    case "teacher":
      return "border-electric/25 bg-electric/10 text-electric";
    case "student":
      return "border-mint/25 bg-mint/10 text-mint";
    case "review":
      return "border-violet-300/25 bg-violet-400/10 text-violet-200";
    case "neutral":
      return "border-white/10 bg-[#0b1328] text-white/70";
  }
}

function getTurnRhythmLabel(snapshot: ClassroomOrchestratorSnapshot) {
  switch (snapshot.state) {
    case "idle":
      return "Warmup before the lesson starts";
    case "tutor_rendering":
      return "Teacher writes first";
    case "tutor_speaking":
      return "Teacher talks while student waits";
    case "student_answering":
      return "Student response window is open";
    case "student_submitted":
      return "Student turn complete, awaiting review";
    case "tutor_reviewing":
      return "Teacher studies the answer before coaching";
    case "ended":
      return "The preview loop has completed";
  }
}

function getStudentPrompt(snapshot: ClassroomOrchestratorSnapshot) {
  const prompt = snapshot.activeTurn?.actions.find((action) => action.type === "ask");

  if (prompt?.type === "ask") {
    return prompt.prompt;
  }

  if (snapshot.state === "student_answering") {
    return "Use the open mic or board to answer.";
  }

  return "No student prompt is active right now.";
}

function getReviewPosture(snapshot: ClassroomOrchestratorSnapshot) {
  if (snapshot.state === "tutor_reviewing") {
    return "Teacher is analyzing submitted evidence";
  }

  if (snapshot.state === "student_submitted") {
    return "Evidence is ready for teacher review";
  }

  if (snapshot.state === "student_answering") {
    return "Review has not started yet";
  }

  return "Review follows only after a student response";
}

function describeAction(action: TutorAction) {
  switch (action.type) {
    case "speak":
      return action.text;
    case "ask":
      return action.prompt;
    case "board.writeProblem":
    case "board.writeText":
      return `${action.text}${action.position ? ` at (${action.position.x}, ${action.position.y})` : ""}`;
    case "board.highlight":
      return `Highlight ${formatTarget(action.target)}${action.color ? ` in ${action.color}` : ""}`;
    case "board.arrow":
      return `Arrow from (${action.from.x}, ${action.from.y}) to (${action.to.x}, ${action.to.y})${action.label ? ` labeled ${action.label}` : ""}`;
    case "board.underline":
      return `Underline ${formatTarget(action.target)}${action.color ? ` in ${action.color}` : ""}`;
    case "board.stepBox":
      return `Step box around ${formatTarget(action.target)}${action.label ? ` labeled ${action.label}` : ""}`;
    case "board.clearTeacherLayer":
      return "Clear teacher layer before rendering the next step.";
  }
}

function formatTarget(target: BoardTarget) {
  if (target.kind === "region") {
    return `region (${target.x}, ${target.y}, ${target.width}, ${target.height})`;
  }

  if (target.kind === "element") {
    return `element ${target.elementId}`;
  }

  return `text range ${target.elementId}[${target.start}-${target.end}]`;
}

function formatEvidence(evidence: StudentEvidence | null) {
  if (!evidence) {
    return "No student evidence retained yet.";
  }

  return JSON.stringify(evidence, null, 2);
}

function formatTransportCommand(command: ClassroomRealtimeTransportSnapshot["commands"][number]) {
  switch (command.type) {
    case "transport.connect":
      return `connect(studentId=${command.studentId})`;
    case "transport.disconnect":
      return "disconnect()";
    case "transport.applySessionPolicy":
      return `applySessionPolicy(state=${command.policy.classroomState}, capture=${command.policy.studentCapture}, micMuted=${String(command.policy.micMuted)})`;
    case "transport.setMicMuted":
      return `setMicMuted(${String(command.muted)})`;
    case "transport.speak":
      return `speak(${JSON.stringify(command.text)})`;
  }
}

function getTransitionSurfaceClass(emphasis: TransitionSnapshot["emphasis"]) {
  switch (emphasis) {
    case "teacher":
      return "border-electric/20 bg-electric/5";
    case "student":
      return "border-mint/20 bg-mint/5";
    case "review":
      return "border-violet-400/20 bg-violet-400/5";
    case "neutral":
      return "border-white/10 bg-[#0b1328]";
  }
}

function timelineBadgeClass(state: "complete" | "active" | "upcoming") {
  switch (state) {
    case "complete":
      return "bg-mint/15 text-mint";
    case "active":
      return "bg-electric/15 text-electric";
    case "upcoming":
      return "bg-white/10 text-white/50";
  }
}

function actionStatusClass(state: "revealed" | "active" | "queued") {
  switch (state) {
    case "revealed":
      return "bg-mint/15 text-mint";
    case "active":
      return "bg-electric/15 text-electric";
    case "queued":
      return "bg-white/10 text-white/50";
  }
}

function buttonClass(enabled: boolean) {
  if (!enabled) {
    return "cursor-not-allowed border border-white/10 bg-white/5 text-white/35";
  }

  return "border border-electric/25 bg-electric/15 text-white hover:bg-electric/25";
}

function getPreviewLaunchHandoff(searchParams: ReturnType<typeof useSearchParams>): PreviewLaunchHandoff | null {
  const mode = searchParams.get("reviewMode");

  if (mode !== "start" && mode !== "continue" && mode !== "recheck") {
    return null;
  }

  const targeted = searchParams.get("reviewTargeted") === "1";
  const beatKey = searchParams.get("reviewBeat");

  if (beatKey !== "teacher-setup" && beatKey !== "student-turn" && beatKey !== "review-handoff" && beatKey !== "lesson-close") {
    return { mode, beatKey: null, targeted };
  }

  return { mode, beatKey, targeted };
}

function applyPreviewLaunchHandoff(
  orchestrator: ReturnType<typeof createClassroomOrchestrator>,
  studentId: string,
  handoff: PreviewLaunchHandoff | null,
) {
  if (!handoff || (handoff.mode === "start" && handoff.beatKey === null)) {
    return;
  }

  const dispatch = (event: ClassroomTransitionEvent) => {
    orchestrator.dispatch(event);
  };

  dispatch({ type: "classroom.startTutorTurn", turn: INITIAL_TURN });

  if (handoff.beatKey === "teacher-setup") {
    return;
  }

  dispatch({ type: "classroom.finishTutorRendering", nextState: getPostRenderState(INITIAL_TURN) });
  dispatch({
    type: "classroom.finishTutorSpeaking",
    nextState: INITIAL_TURN.expectsStudentEvidence ? "student_answering" : "ended",
  });

  if (handoff.beatKey === "student-turn") {
    return;
  }

  const now = new Date().toISOString();
  const voiceEvidence = createVoiceSubmissionEvidence({
    lessonId: orchestrator.getSnapshot().session.lessonId,
    state: orchestrator.getSnapshot().state,
    activeTurn: orchestrator.getSnapshot().activeTurn ?? INITIAL_TURN,
    utteranceId: `${studentId}-resume-voice`,
    transcript: "24",
    startedAt: now,
    endedAt: now,
    segments: [{ text: "24" }],
  });

  dispatch({ type: "classroom.submitStudentEvidence", evidence: voiceEvidence });

  if (handoff.beatKey === "review-handoff") {
    return;
  }

  dispatch({ type: "classroom.beginTutorReview" });
  dispatch({ type: "classroom.finishTutorReview", nextState: "tutor_rendering", nextTurn: REVIEW_TURN });
  dispatch({ type: "classroom.finishTutorRendering", nextState: getPostRenderState(REVIEW_TURN) });
  dispatch({ type: "classroom.finishTutorSpeaking", nextState: "ended" });
}

function getActiveReviewBeatKey(snapshot: ClassroomOrchestratorSnapshot): ClassroomV2ReviewBeatKey | null {
  switch (snapshot.state) {
    case "idle":
      return null;
    case "tutor_rendering":
    case "tutor_speaking":
      return snapshot.session.lastCompletedTurnId === REVIEW_TURN.turnId ? "lesson-close" : "teacher-setup";
    case "student_answering":
      return "student-turn";
    case "student_submitted":
    case "tutor_reviewing":
      return "review-handoff";
    case "ended":
      return "lesson-close";
  }
}

function getTargetedBeatCue({
  handoff,
  reviewChecklist,
  activeBeatKey,
}: {
  handoff: PreviewLaunchHandoff | null;
  reviewChecklist: ReviewChecklistItem[];
  activeBeatKey: ClassroomV2ReviewBeatKey | null;
}): TargetedBeatCue | null {
  if (!handoff?.targeted || !handoff.beatKey) {
    return null;
  }

  const requestedBeat = reviewChecklist.find((item) => item.key === handoff.beatKey) ?? null;
  const activeBeat = activeBeatKey ? reviewChecklist.find((item) => item.key === activeBeatKey) ?? null : null;
  const isStillOnRequestedBeat = activeBeatKey === handoff.beatKey;
  const isConfirmed = requestedBeat?.done ?? false;
  const confirmedCount = reviewChecklist.filter((item) => item.done).length;
  const projectedConfirmedCount = isConfirmed ? confirmedCount : Math.min(reviewChecklist.length, confirmedCount + 1);
  const nextUnconfirmedBeat = getNextUnconfirmedReviewBeat(reviewChecklist, handoff.beatKey);

  return {
    title: isStillOnRequestedBeat
      ? `You are reviewing ${requestedBeat?.label ?? "the targeted beat"}.`
      : `The targeted beat was ${requestedBeat?.label ?? "the requested beat"}, and preview has already moved on.`,
    detail: isStillOnRequestedBeat
      ? requestedBeat?.detail ?? "This targeted beat is open now."
      : `Preview is now showing ${activeBeat?.label ?? "a later beat"}, which means the requested checkpoint has already been crossed in this run.`,
    confirmLabel: getTargetedBeatConfirmationLabel(handoff.beatKey),
    followupLabel: getTargetedBeatFollowupLabel(handoff.beatKey),
    verdictLabel: getTargetedBeatVerdictLabel({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
    }),
    verdictDetail: getTargetedBeatVerdictDetail({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
      activeBeatLabel: activeBeat?.label ?? null,
    }),
    recommendedActionLabel: getTargetedBeatRecommendedActionLabel({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
    }),
    recommendedActionDetail: getTargetedBeatRecommendedActionDetail({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
      activeBeatLabel: activeBeat?.label ?? null,
    }),
    projectedProgressLabel: getTargetedBeatProjectedProgressLabel({
      confirmedCount: projectedConfirmedCount,
      totalCount: reviewChecklist.length,
      requestedBeatDone: isConfirmed,
    }),
    projectedProgressDetail: getTargetedBeatProjectedProgressDetail({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
      nextUnconfirmedBeatLabel: nextUnconfirmedBeat?.label ?? null,
    }),
    returnGuidanceLabel: getTargetedBeatReturnGuidanceLabel({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
    }),
    returnGuidanceDetail: getTargetedBeatReturnGuidanceDetail({
      requestedBeatKey: handoff.beatKey,
      requestedBeatDone: isConfirmed,
      isStillOnRequestedBeat,
      nextUnconfirmedBeatLabel: nextUnconfirmedBeat?.label ?? null,
    }),
    confidenceSignals: [
      {
        label: "Live targeted match",
        value: isStillOnRequestedBeat ? "Requested beat is active now" : `Active now: ${activeBeat?.label ?? "none"}`,
        done: isStillOnRequestedBeat,
      },
      {
        label: "Checklist confirmation",
        value: isConfirmed ? "Marked confirmed in this run" : "Not confirmed yet in this run",
        done: isConfirmed,
      },
    ],
    statusLabel: isStillOnRequestedBeat ? "open now" : isConfirmed ? "confirmed" : "advanced",
    panelClass: isStillOnRequestedBeat ? "border-fuchsia-400/25 bg-fuchsia-400/10" : "border-amber-300/25 bg-amber-300/10",
    pillClass: isStillOnRequestedBeat ? "bg-fuchsia-400/15 text-fuchsia-100" : isConfirmed ? "bg-mint/15 text-mint" : "bg-amber-300/15 text-amber-100",
    verdictPanelClass: isConfirmed
      ? "border-mint/25 bg-mint/10"
      : isStillOnRequestedBeat
        ? "border-fuchsia-400/25 bg-fuchsia-400/10"
        : "border-amber-300/25 bg-amber-300/10",
  };
}

function getTargetedBeatConfirmationLabel(beatKey: ClassroomV2ReviewBeatKey) {
  switch (beatKey) {
    case "teacher-setup":
      return "Maximus clearly owns the board first and the setup is visible before student input opens.";
    case "student-turn":
      return "The student answer window is clearly open and mic or board tools are available.";
    case "review-handoff":
      return "The submitted answer is visibly captured and the lesson pivots back into teacher review.";
    case "lesson-close":
      return "The preview reaches the calm finished hold so the lesson feels intentionally landed.";
  }
}

function getTargetedBeatFollowupLabel(beatKey: ClassroomV2ReviewBeatKey) {
  switch (beatKey) {
    case "teacher-setup":
      return "Maximus explains the same board setup out loud.";
    case "student-turn":
      return "The student submits work and hands the lesson back for review.";
    case "review-handoff":
      return "Maximus turns that submission into the next coaching move or close.";
    case "lesson-close":
      return "Reset only if you want to replay the seam again from the top.";
  }
}

function getTargetedBeatVerdictLabel({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
}) {
  if (requestedBeatDone) {
    return `Confirmed: ${getTargetedBeatShortLabel(requestedBeatKey)} has been satisfied in this run.`;
  }

  if (isStillOnRequestedBeat) {
    return `Open now: ${getTargetedBeatShortLabel(requestedBeatKey)} is the live checkpoint on screen.`;
  }

  return `Pending confirmation: ${getTargetedBeatShortLabel(requestedBeatKey)} has not been satisfied yet.`;
}

function getTargetedBeatVerdictDetail({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
  activeBeatLabel,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
  activeBeatLabel: string | null;
}) {
  if (requestedBeatDone) {
    return `The guided checklist already marks this targeted beat complete, so Sung can treat the requested checkpoint as confirmed.`;
  }

  if (isStillOnRequestedBeat) {
    return `Preview is currently centered on this requested beat, so Sung only needs to verify the visible signal below to confirm it.`;
  }

  return `Preview is currently on ${activeBeatLabel ?? "another beat"}, so the requested checkpoint still needs a direct visual confirmation or a replay from the earlier target.`;
}

function getTargetedBeatRecommendedActionLabel({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
}) {
  if (requestedBeatDone) {
    return `This pass is good. ${getTargetedBeatShortLabel(requestedBeatKey)} is already confirmed.`;
  }

  if (isStillOnRequestedBeat) {
    return `Confirm ${getTargetedBeatShortLabel(requestedBeatKey)} now, then keep moving.`;
  }

  return `Replay ${getTargetedBeatShortLabel(requestedBeatKey)} from the targeted launcher.`;
}

function getTargetedBeatRecommendedActionDetail({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
  activeBeatLabel,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
  activeBeatLabel: string | null;
}) {
  if (requestedBeatDone) {
    return `The checklist already marks ${getTargetedBeatShortLabel(requestedBeatKey)} complete in this run, so Sung can return to the classroom route or continue only if he wants extra confidence.`;
  }

  if (isStillOnRequestedBeat) {
    return `The requested checkpoint is on screen right now. Verify the confirmation signal below, then continue into ${getTargetedBeatFollowupLabel(requestedBeatKey).toLowerCase()}`;
  }

  return `Preview is already showing ${activeBeatLabel ?? "a later beat"}, so the cleanest next move is to relaunch this exact target and recheck the requested moment directly.`;
}

function getTargetedBeatProjectedProgressLabel({
  confirmedCount,
  totalCount,
  requestedBeatDone,
}: {
  confirmedCount: number;
  totalCount: number;
  requestedBeatDone: boolean;
}) {
  if (requestedBeatDone) {
    return `Review progress remains ${confirmedCount} of ${totalCount} beats confirmed.`;
  }

  return `Confirming this beat puts the run at ${confirmedCount} of ${totalCount} beats confirmed.`;
}

function getTargetedBeatProjectedProgressDetail({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
  nextUnconfirmedBeatLabel,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
  nextUnconfirmedBeatLabel: string | null;
}) {
  if (requestedBeatDone) {
    return nextUnconfirmedBeatLabel
      ? `The requested ${getTargetedBeatShortLabel(requestedBeatKey)} checkpoint is already counted, so the next unresolved review beat is ${nextUnconfirmedBeatLabel}.`
      : "Every guided review beat is already confirmed in this run, so Sung can return to the route with confidence.";
  }

  if (isStillOnRequestedBeat) {
    return nextUnconfirmedBeatLabel
      ? `Once this checkpoint is confirmed, the next unresolved beat will be ${nextUnconfirmedBeatLabel}.`
      : "Once this checkpoint is confirmed, the full guided review run is complete for this pass.";
  }

  return nextUnconfirmedBeatLabel
    ? `Because this beat is not confirmed yet, the run should not be treated as progressing to ${nextUnconfirmedBeatLabel} until the requested checkpoint is replayed and verified.`
    : `This targeted checkpoint still needs a direct replay and confirmation before the run can be treated as complete.`;
}

function getTargetedBeatReturnGuidanceLabel({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
}) {
  if (requestedBeatDone) {
    return `Safe to return: ${getTargetedBeatShortLabel(requestedBeatKey)} is confirmed.`;
  }

  if (isStillOnRequestedBeat) {
    return `Stay in preview: ${getTargetedBeatShortLabel(requestedBeatKey)} still needs live confirmation.`;
  }

  return `Replay before returning: ${getTargetedBeatShortLabel(requestedBeatKey)} is still unconfirmed.`;
}

function getTargetedBeatReturnGuidanceDetail({
  requestedBeatKey,
  requestedBeatDone,
  isStillOnRequestedBeat,
  nextUnconfirmedBeatLabel,
}: {
  requestedBeatKey: ClassroomV2ReviewBeatKey;
  requestedBeatDone: boolean;
  isStillOnRequestedBeat: boolean;
  nextUnconfirmedBeatLabel: string | null;
}) {
  if (requestedBeatDone) {
    return nextUnconfirmedBeatLabel
      ? `It is safe to return to the real classroom route because the requested ${getTargetedBeatShortLabel(requestedBeatKey)} checkpoint is already confirmed. Continue only if you also want to inspect ${nextUnconfirmedBeatLabel} in the same pass.`
      : `It is safe to return to the real classroom route now. The requested checkpoint is confirmed and the guided review pass is fully complete in this run.`;
  }

  if (isStillOnRequestedBeat) {
    return `Do not return yet. The requested checkpoint is on screen now, so continue the preview long enough to verify the visible signal and let this beat become confirmed.`;
  }

  return `Returning now would leave the requested ${getTargetedBeatShortLabel(requestedBeatKey)} checkpoint unverified. Replay this exact target from the launcher, confirm it directly, and then return to the classroom route.`;
}

function getNextUnconfirmedReviewBeat(
  reviewChecklist: ReviewChecklistItem[],
  requestedBeatKey: ClassroomV2ReviewBeatKey,
) {
  return reviewChecklist.find((item) => item.key !== requestedBeatKey && !item.done) ?? null;
}

function getTargetedBeatShortLabel(beatKey: ClassroomV2ReviewBeatKey) {
  switch (beatKey) {
    case "teacher-setup":
      return "teacher setup";
    case "student-turn":
      return "student turn";
    case "review-handoff":
      return "review handoff";
    case "lesson-close":
      return "lesson close";
  }
}

function getLaunchBanner(
  handoff: PreviewLaunchHandoff | null,
  reviewChecklist: ReviewChecklistItem[],
) {
  if (!handoff) {
    return null;
  }

  const target = handoff.beatKey ? reviewChecklist.find((item) => item.key === handoff.beatKey) ?? null : null;

  if (handoff.targeted) {
    return {
      badge: "Targeted review",
      title: `This preview launched directly into ${target?.label ?? "the requested review beat"}.`,
      detail:
        handoff.mode === "recheck"
          ? "The classroom route requested a direct confidence check of this specific beat, so preview skipped straight to the targeted moment."
          : "The classroom route requested a direct beat-level review jump, so preview skipped intermediate moments and opened right at the requested checkpoint.",
      accentClass: "bg-fuchsia-400/15 text-fuchsia-100",
      panelClass: "border-fuchsia-400/25 bg-fuchsia-400/10",
    };
  }

  if (handoff.mode === "start") {
    return {
      badge: "Start fresh",
      title: "This preview launched as a fresh route-level review pass.",
      detail: "No remembered resume point was passed in, so preview starts from the opening teacher setup beat.",
      accentClass: "bg-electric/15 text-electric",
      panelClass: "border-electric/25 bg-electric/10",
    };
  }

  if (handoff.mode === "continue") {
    return {
      badge: "Resume",
      title: `This preview resumed at ${target?.label ?? "the remembered checkpoint"}.`,
      detail: "The real classroom route passed the next unconfirmed review beat into preview, so the seam opens with that resume point already in view.",
      accentClass: "bg-amber-300/15 text-amber-100",
      panelClass: "border-amber-300/25 bg-amber-300/10",
    };
  }

  return {
    badge: "Confidence pass",
    title: "This preview launched as a re-check of an already completed route-level review pass.",
    detail: "All remembered beats were already confirmed, so preview reopens at the lesson-close posture for a quick confidence check instead of a cold start.",
    accentClass: "bg-mint/15 text-mint",
    panelClass: "border-mint/25 bg-mint/10",
  };
}
