"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { SimpleCanvas } from "@/components/SimpleCanvas";
import { connectRealtimeSession, type RealtimeController, type SessionStatus } from "@/lib/realtime";
import type { Student } from "@/lib/db";

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Tap the mic to start",
  connecting: "Connecting to Maximus...",
  listening: "I&apos;m listening...",
  thinking: "Maximus is thinking...",
  speaking: "Maximus is talking...",
  error: "Connection paused",
};

const AVATAR_STATES: Record<SessionStatus, { emoji: string; mood: string; accent: string }> = {
  idle: { emoji: "😊", mood: "Ready to play", accent: "from-electric/35 to-reward/15" },
  connecting: { emoji: "⚡", mood: "Waking up", accent: "from-reward/40 to-electric/20" },
  listening: { emoji: "😊", mood: "Listening", accent: "from-mint/35 to-electric/12" },
  thinking: { emoji: "🤔", mood: "Thinking", accent: "from-electric/42 to-transparent" },
  speaking: { emoji: "🗣️", mood: "Speaking", accent: "from-sky-400/30 to-electric/18" },
  error: { emoji: "😅", mood: "Try again", accent: "from-softred/28 to-electric/10" },
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
  const assistantMessage = tutorTranscript?.includes("::")
    ? tutorTranscript.split("::").slice(1).join("::")
    : tutorTranscript;
  const sessionProgress = Math.min(100, Math.round((elapsedSeconds / (student.maxSessionMinutes * 60)) * 100));
  const avatarState = AVATAR_STATES[status];
  const statusTone =
    status === "listening"
      ? "text-mint"
      : status === "speaking"
        ? "text-sky-300"
        : status === "thinking"
          ? "text-electric"
          : status === "error"
            ? "text-softred"
            : "text-reward";

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
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,48,0.96),rgba(20,26,50,0.98))] px-5 py-5 text-white sm:px-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,92,231,0.18),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(0,184,148,0.12),transparent_24%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center rounded-full border border-white/10 bg-white/6 px-4 text-xs font-bold uppercase tracking-[0.18em] text-white/80"
              >
                Back to students
              </Link>
              <span
                className={`inline-flex min-h-12 items-center rounded-full px-4 text-xs font-bold uppercase tracking-[0.18em] ${
                  idleState === "warning" ? "bg-reward text-gamebg" : "border border-white/10 bg-white/6 text-white/75"
                }`}
              >
                {idleState === "warning" ? "Idle check" : "Live session"}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Talk and draw with Maximus, {student.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Ask a question out loud, watch Maximus react in real time, and sketch your thinking on the board below.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Status</p>
              <p className={`mt-2 text-base font-black ${statusTone}`}>{STATUS_LABELS[status]}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Time</p>
              <p className="mt-2 text-base font-black font-mono">{formatElapsed(elapsedSeconds)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Quest Bar</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#6C5CE7,#00B894,#FDCB6E)] transition-all"
                  style={{ width: `${Math.max(8, sessionProgress)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.9rem] border border-white/10 bg-[#0f1730]/90 p-5">
            <div className="flex flex-col items-center text-center">
              <motion.div
                key={status}
                initial={{ scale: 0.92, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={`avatar-ring relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b ${avatarState.accent} to-transparent text-7xl sm:h-48 sm:w-48 sm:text-8xl`}
              >
                <div className="absolute inset-0 rounded-full border border-white/10" />
                {status === "speaking" ? <span className="absolute inset-0 rounded-full border border-sky-300/40 animate-pulseRing" /> : null}
                <span className={status === "listening" ? "animate-blink" : ""}>{avatarState.emoji}</span>
              </motion.div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-muted">Maximus Avatar</p>
              <p className="mt-2 text-2xl font-black text-white">{avatarState.mood}</p>
              <p className="mt-1 text-sm font-bold text-white/65">
                Cost est. ${(estimatedCostCents / 100).toFixed(2)} • Cap {student.maxSessionMinutes} min
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={assistantMessage ?? status}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="speech-bubble relative mt-6 rounded-[1.6rem] border border-white/8 bg-[#17213b] px-5 py-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Maximus says</p>
                <p className="mt-2 text-lg font-black leading-7 text-white">
                  {assistantMessage ?? "Tap the mic when you are ready. Maximus is waiting for your first move."}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/8 bg-white/5 px-4 py-5 text-center">
              <MicButton status={status} onClick={handleMicPress} disabled={status === "connecting" || isEnding || !sessionReady} />
              <div className="space-y-3">
                {status === "connecting" ? (
                  <div className="inline-flex min-h-12 items-center gap-2 rounded-full border border-reward/25 bg-reward/10 px-4 py-2 text-sm font-bold text-reward">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-reward" />
                    Connecting...
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleMicPress}
                    disabled={status === "connecting" || isEnding || !sessionReady}
                    className="min-h-14 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isActive ? "Tap mic again" : "Start voice"}
                  </button>
                  <button
                    type="button"
                    onClick={handleEndButton}
                    disabled={!isActive || isEnding}
                    className="min-h-14 rounded-full bg-softred px-5 text-sm font-black text-white transition hover:bg-softred/90 disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/45"
                  >
                    End session
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-white/10 bg-[#0f1730]/90 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Session timer</p>
                  <p className="mt-2 text-3xl font-black font-mono text-white">{formatElapsed(elapsedSeconds)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3 text-right">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Session record</p>
                  <p className="mt-2 text-base font-black text-white">{sessionId ? "Ready" : "Waiting"}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/5 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Status</p>
                  <p className="mt-2 text-lg font-black text-white">{STATUS_LABELS[status]}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/5 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Grade mode</p>
                  <p className="mt-2 text-lg font-black text-white">Grade {student.gradeLevel}</p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-[1.6rem] border border-softred/30 bg-softred/10 px-4 py-4 text-sm text-white">
                Voice connection paused. {error}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="min-h-12 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-black text-white transition hover:bg-white/10"
                  >
                    Retry voice
                  </button>
                </div>
              </div>
            ) : null}

            <AnimatePresence>
              {sessionSummary ? (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  className="relative overflow-hidden rounded-[1.8rem] border border-reward/20 bg-[linear-gradient(135deg,rgba(253,203,110,0.16),rgba(108,92,231,0.12))] p-5"
                >
                  <div className="confetti-strip absolute inset-x-0 top-0 h-1 animate-shimmer" />
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-reward">Session complete</p>
                  <p className="mt-2 text-2xl font-black text-white">⭐ ⭐ ⭐ Great work!</p>
                  <p className="mt-3 text-sm leading-6 text-white/82">{sessionSummary}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
          <div className="rounded-full border border-white/8 bg-white/5 px-4 py-2">
            Session cap: {student.maxSessionMinutes} minutes
          </div>
          <div className="rounded-full border border-white/8 bg-white/5 px-4 py-2">
            Whiteboard snapshots: {visionSnapshotsRef.current}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <SimpleCanvas
          sessionActive={isActive}
          tutorTranscript={tutorTranscript}
          onStudentDrawingDescription={handleStudentDrawingDescription}
          onStudentActivity={markStudentActivity}
        />
      </motion.div>
    </section>
  );
}
