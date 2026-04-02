"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { SharedWhiteboard } from "@/components/SharedWhiteboard";
import { connectRealtimeSession, type RealtimeController, type SessionStatus } from "@/lib/realtime";
import type { Student } from "@/lib/db";

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Tap the mic to start",
  connecting: "Connecting to Maximus...",
  listening: "Listening...",
  thinking: "Maximus is thinking...",
  speaking: "Maximus is speaking...",
  error: "Connection paused",
};

const IDLE_WARNING_MS = 2 * 60 * 1000;
const IDLE_END_MS = 5 * 60 * 1000;
const COST_CAP_CENTS = 500;

type Props = {
  student: Student;
};

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function estimateSessionCostCents(elapsedSeconds: number, visionSnapshots: number) {
  const minutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
  return minutes * 6 + visionSnapshots * 2 + 5;
}

export function VoiceSession({ student }: Props) {
  const controllerRef = useRef<RealtimeController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const finalizingRef = useRef(false);
  const sessionStartRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const idlePromptedRef = useRef(false);
  const fiveMinuteWarningRef = useRef(false);
  const visionSnapshotsRef = useRef(0);
  const costCapHandledRef = useRef(false);
  const autoStopScheduledRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tutorTranscript, setTutorTranscript] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [idleState, setIdleState] = useState<"active" | "warning">("active");
  const [isEnding, setIsEnding] = useState(false);

  const isActive = status !== "idle" && status !== "error";
  const estimatedCostCents = estimateSessionCostCents(elapsedSeconds, visionSnapshotsRef.current);

  const markStudentActivity = () => {
    lastActivityRef.current = Date.now();
    idlePromptedRef.current = false;
    setIdleState("active");
  };

  const prepareSession = async () => {
    setSessionReady(false);

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId: student.id,
      }),
    });

    const data = (await response.json()) as { id?: string; error?: string };

    if (!response.ok || !data.id) {
      throw new Error(data.error || "Unable to prepare a session.");
    }

    sessionIdRef.current = data.id;
    setSessionId(data.id);
    setSessionReady(true);
  };

  const logEvent = async (
    eventType: string,
    content?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!sessionIdRef.current) {
      return;
    }

    await fetch(`/api/sessions/${sessionIdRef.current}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        content,
        metadata,
      }),
    });
  };

  const finalizeCurrentSession = async (reason: string) => {
    if (!sessionIdRef.current || finalizingRef.current) {
      return;
    }

    finalizingRef.current = true;
    setIsEnding(true);

    try {
      const response = await fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endReason: reason,
          visionSnapshots: visionSnapshotsRef.current,
          generateSummary: true,
        }),
      });

      const data = (await response.json()) as { summary?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to complete the session.");
      }

      setSessionSummary(data.summary ?? "Session saved.");
      sessionIdRef.current = null;
      setSessionId(null);
      setSessionReady(false);
      visionSnapshotsRef.current = 0;
      sessionStartRef.current = null;
      setElapsedSeconds(0);
      autoStopScheduledRef.current = false;
    } finally {
      finalizingRef.current = false;
      setIsEnding(false);
    }
  };

  const stopSession = async (reason = "ended_by_user") => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setError(null);
    setStatus("idle");
    await finalizeCurrentSession(reason);
  };

  const speakAndStop = async (message: string, reason: string) => {
    if (autoStopScheduledRef.current) {
      return;
    }

    autoStopScheduledRef.current = true;
    controllerRef.current?.speakMessage(message);
    await logEvent("system_notice", message, { reason });
    window.setTimeout(() => {
      void stopSession(reason);
    }, 2200);
  };

  const startSession = async () => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }

    setError(null);
    setSessionSummary(null);
    setIdleState("active");
    idlePromptedRef.current = false;
    fiveMinuteWarningRef.current = false;
    costCapHandledRef.current = false;
    autoStopScheduledRef.current = false;

    try {
      if (!sessionIdRef.current) {
        await prepareSession();
      }

      const controller = await connectRealtimeSession({
        studentId: student.id,
        onStatusChange: setStatus,
        onError: setError,
        onUserTranscript: (transcript) => {
          markStudentActivity();
          void logEvent("voice_exchange", transcript, { speaker: "student" });
        },
        onAssistantTranscript: (transcript) => {
          setTutorTranscript(`${Date.now()}::${transcript}`);
          void logEvent("voice_exchange", transcript, { speaker: "assistant" });
        },
      });

      controllerRef.current = controller;
      sessionStartRef.current = Date.now();
      lastActivityRef.current = Date.now();
      setElapsedSeconds(0);
    } catch (sessionError) {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to start session.");
    }
  };

  const handleMicPress = () => {
    if (isActive) {
      if (window.confirm("Are you sure? Your progress is saved!")) {
        void stopSession();
      }
      return;
    }

    void startSession();
  };

  const handleEndButton = () => {
    if (!isActive) {
      return;
    }

    if (window.confirm("Are you sure? Your progress is saved!")) {
      void stopSession();
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus("idle");
    void startSession();
  };

  const handleStudentDrawingDescription = (description: string) => {
    markStudentActivity();
    visionSnapshotsRef.current += 1;
    controllerRef.current?.sendTextMessage(`Whiteboard update: ${description}`);
    void logEvent("whiteboard_snapshot", description, { source: "shared_whiteboard" });
  };

  useEffect(() => {
    void prepareSession().catch((sessionError) => {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to prepare the session.");
    });

    return () => {
      controllerRef.current?.stop();

      if (!sessionIdRef.current || finalizingRef.current) {
        return;
      }

      finalizingRef.current = true;
      void fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endReason: "page_exit",
          visionSnapshots: visionSnapshotsRef.current,
          generateSummary: true,
        }),
        keepalive: true,
      });
    };
  }, [student.id]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = window.setInterval(() => {
      const startedAt = sessionStartRef.current;

      if (!startedAt) {
        return;
      }

      const nextElapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const idleForMs = Date.now() - lastActivityRef.current;

      setElapsedSeconds(nextElapsedSeconds);

      if (!idlePromptedRef.current && idleForMs >= IDLE_WARNING_MS) {
        idlePromptedRef.current = true;
        setIdleState("warning");
        controllerRef.current?.speakMessage("Hey, you still there? Take your time, I'm here when you're ready!");
        void logEvent("system_notice", "Idle warning delivered.", { reason: "idle_warning" });
      }

      if (idleForMs >= IDLE_END_MS && !finalizingRef.current) {
        void speakAndStop(
          "Looks like you're taking a break. I'll save our progress - come back anytime!",
          "idle_timeout",
        );
        return;
      }

      if (!fiveMinuteWarningRef.current && nextElapsedSeconds >= Math.max(0, student.maxSessionMinutes - 5) * 60) {
        fiveMinuteWarningRef.current = true;
        controllerRef.current?.speakMessage("We've got about 5 more minutes! Let's wrap up this problem.");
        void logEvent("system_notice", "Five-minute session warning delivered.", { reason: "time_warning" });
      }

      if (nextElapsedSeconds >= student.maxSessionMinutes * 60 && !finalizingRef.current) {
        void speakAndStop(
          "Great session today! Time to take a break. See you next time!",
          "max_duration_reached",
        );
        return;
      }

      if (estimateSessionCostCents(nextElapsedSeconds, visionSnapshotsRef.current) > COST_CAP_CENTS && !costCapHandledRef.current) {
        costCapHandledRef.current = true;
        void speakAndStop(
          "Great work today. I'm going to pause here and save our progress so we can pick this up next time.",
          "cost_cap_reached",
        );
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isActive, student.maxSessionMinutes]);

  return (
    <section className="flex flex-1 flex-col gap-5 px-4 pb-5 sm:px-8 sm:pb-8">
      <div className="rounded-[2rem] bg-ink px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80"
              >
                Back to students
              </Link>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                  idleState === "warning" ? "bg-mango text-ink" : "bg-white/10 text-white/75"
                }`}
              >
                {idleState === "warning" ? "Idle check" : "Live session"}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Talk and draw with Maximus, {student.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Ask a math question out loud, then sketch your work on the shared whiteboard while Maximus tracks progress for Grade {student.gradeLevel}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Status</p>
              <p className="mt-2 text-base font-black">{STATUS_LABELS[status]}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Elapsed</p>
              <p className="mt-2 text-base font-black">{formatElapsed(elapsedSeconds)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Cost</p>
              <p className="mt-2 text-base font-black">${(estimatedCostCents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 rounded-[1.75rem] bg-white/6 px-4 py-5 text-center">
          <MicButton active={isActive} onClick={handleMicPress} disabled={status === "connecting" || isEnding || !sessionReady} />
          <div className="space-y-2">
            {status === "connecting" ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-mango" />
                Connecting to Maximus...
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleEndButton}
                disabled={!isActive || isEnding}
                className="min-h-14 rounded-2xl bg-white px-5 text-sm font-black text-ink transition disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/55"
              >
                End session
              </button>
              {error ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="min-h-14 rounded-2xl border border-white/20 bg-transparent px-5 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Retry voice
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl bg-coral/20 px-4 py-3 text-sm text-white">
            Voice connection paused. {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
          <div className="rounded-full bg-white/10 px-4 py-2">
            Session record: {sessionId ? "ready" : "waiting"}
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2">
            Session cap: {student.maxSessionMinutes} minutes
          </div>
          {sessionSummary ? (
            <div className="max-w-2xl rounded-2xl bg-white/10 px-4 py-3 text-white/90">
              {sessionSummary}
            </div>
          ) : null}
        </div>
      </div>

      <SharedWhiteboard
        sessionActive={isActive}
        tutorTranscript={tutorTranscript}
        onStudentDrawingDescription={handleStudentDrawingDescription}
        onStudentActivity={markStudentActivity}
      />
    </section>
  );
}
