"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SimpleCanvas } from "@/components/SimpleCanvas";
import { connectRealtimeSession, type RealtimeController, type SessionStatus } from "@/lib/realtime";
import type { Student } from "@/lib/db";

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
  const [sessionReady, setSessionReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  const isActive = status !== "idle" && status !== "error";
  const avatarState = AVATAR_STATES[status];
  const assistantMessage = tutorTranscript?.includes("::")
    ? tutorTranscript.split("::").slice(1).join("::")
    : tutorTranscript;

  const markStudentActivity = () => {
    lastActivityRef.current = Date.now();
    idlePromptedRef.current = false;
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

      sessionIdRef.current = null;
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

  const handleStudentDrawingDescription = (description: string) => {
    markStudentActivity();
    visionSnapshotsRef.current += 1;
    controllerRef.current?.sendTextMessage(`Whiteboard update: ${description}`);
    void logEvent("whiteboard_snapshot", description, { source: "shared_whiteboard" });
  };

  useEffect(() => {
    document.documentElement.classList.add("classroom-shell");
    document.body.classList.add("classroom-shell");

    void prepareSession().catch((sessionError) => {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to prepare the session.");
    });

    return () => {
      controllerRef.current?.stop();
      document.documentElement.classList.remove("classroom-shell");
      document.body.classList.remove("classroom-shell");

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
    <section className="classroom-session flex h-full min-h-0 flex-1 overflow-hidden bg-[#060b16]">
      <motion.aside
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24 }}
        className="classroom-controls flex shrink-0 items-center justify-between border-white/10 bg-[linear-gradient(180deg,#10182d,#0a1022)] p-4"
      >
        <div className="classroom-controls-top flex items-center justify-center">
          <motion.div
            key={status}
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            aria-label={assistantMessage ?? avatarState.mood}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b ${avatarState.accent} text-5xl shadow-[0_10px_30px_rgba(0,0,0,0.28)]`}
          >
            {status === "speaking" ? (
              <>
                <span className="absolute inset-[-4px] rounded-full border border-sky-300/50 animate-pulseRing" />
                <span className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(77,150,255,0.45)]" />
              </>
            ) : null}
            <span className={status === "listening" ? "animate-blink" : ""}>{avatarState.emoji}</span>
          </motion.div>
        </div>

        <div className="classroom-controls-middle flex items-center justify-center">
          <button
            type="button"
            onClick={handleMicPress}
            disabled={status === "connecting" || isEnding || !sessionReady}
            aria-pressed={isActive}
            aria-label={isActive ? "Stop microphone" : "Start microphone"}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full border-[8px] text-4xl transition duration-200 ${
              isActive
                ? "border-mint/80 bg-mint/20 text-white shadow-[0_0_0_10px_rgba(0,184,148,0.18),0_20px_40px_rgba(0,0,0,0.25)]"
                : "border-white/12 bg-[#2d3348] text-white shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
            } ${disabledButtonClass(status === "connecting" || isEnding || !sessionReady)}`}
          >
            {isActive ? <span className="absolute inset-0 rounded-full bg-mint/20 animate-pulseRing" /> : null}
            <span className="relative" aria-hidden="true">
              {status === "connecting" ? "⋯" : "🎤"}
            </span>
          </button>
        </div>

        <div className="classroom-controls-bottom flex items-center justify-center">
          <button
            type="button"
            onClick={handleEndButton}
            disabled={!isActive || isEnding}
            aria-label="End session"
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#ef4444] text-xl text-white shadow-[0_12px_24px_rgba(0,0,0,0.26)] transition ${
              !isActive || isEnding ? "cursor-not-allowed opacity-45" : "active:scale-95"
            }`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </motion.aside>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.24 }}
        className="min-w-0 flex-1 overflow-hidden"
      >
        <SimpleCanvas
          sessionActive={isActive}
          tutorTranscript={tutorTranscript}
          onStudentDrawingDescription={handleStudentDrawingDescription}
          onStudentActivity={markStudentActivity}
        />
      </motion.div>

      <div className="sr-only" aria-live="polite">
        {error ?? assistantMessage ?? avatarState.mood}
      </div>
    </section>
  );
}

function disabledButtonClass(disabled: boolean) {
  return disabled ? "cursor-not-allowed opacity-55" : "active:scale-95";
}
