"use client";

import { useEffect, useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { SharedWhiteboard } from "@/components/SharedWhiteboard";
import { connectRealtimeSession, type RealtimeController, type SessionStatus } from "@/lib/realtime";
import type { Student } from "@/lib/db";

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Tap the mic to start",
  connecting: "Connecting...",
  listening: "Listening...",
  thinking: "Maximus is thinking...",
  speaking: "Maximus is speaking...",
  error: "Something went wrong",
};

type Props = {
  student: Student;
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function VoiceSession({ student }: Props) {
  const controllerRef = useRef<RealtimeController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tutorTranscript, setTutorTranscript] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);

  const isActive = status !== "idle" && status !== "error";

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const resetIdleTimer = () => {
    clearIdleTimer();

    idleTimerRef.current = window.setTimeout(() => {
      void stopSession("idle_timeout");
    }, IDLE_TIMEOUT_MS);
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

  const startSession = async () => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }

    setError(null);
    setSessionSummary(null);

    try {
      if (!sessionIdRef.current) {
        await prepareSession();
      }

      const controller = await connectRealtimeSession({
        studentId: student.id,
        onStatusChange: setStatus,
        onError: setError,
        onUserTranscript: (transcript) => {
          resetIdleTimer();
          void logEvent("voice_exchange", transcript, { speaker: "student" });
        },
        onAssistantTranscript: (transcript) => {
          resetIdleTimer();
          setTutorTranscript(`${Date.now()}::${transcript}`);
          void logEvent("voice_exchange", transcript, { speaker: "assistant" });
        },
      });

      controllerRef.current = controller;
      resetIdleTimer();
    } catch (sessionError) {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to start session.");
    }
  };

  const finalizeCurrentSession = async (reason: string) => {
    if (!sessionIdRef.current || finalizingRef.current) {
      return;
    }

    finalizingRef.current = true;

    try {
      const response = await fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
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
      await prepareSession();
    } finally {
      finalizingRef.current = false;
    }
  };

  const stopSession = async (reason = "ended_by_user") => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setError(null);
    clearIdleTimer();
    await finalizeCurrentSession(reason);
  };

  const handleMicPress = () => {
    if (isActive) {
      void stopSession();
      return;
    }

    void startSession();
  };

  const handleStudentDrawingDescription = (description: string) => {
    resetIdleTimer();
    controllerRef.current?.sendTextMessage(`Whiteboard update: ${description}`);
    void logEvent("whiteboard_snapshot", description, { source: "shared_whiteboard" });
  };

  useEffect(() => {
    void prepareSession().catch((sessionError) => {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to prepare the session.");
    });

    return () => {
      clearIdleTimer();
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
          reason: "page_exit",
          generateSummary: true,
        }),
        keepalive: true,
      });
    };
  }, [student.id]);

  return (
    <section className="flex flex-1 flex-col gap-5 px-5 pb-6 sm:px-8 sm:pb-8">
      <div className="rounded-[2rem] bg-ink px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/65">Live session</p>
            <h2 className="mt-2 text-2xl font-black">Talk and draw with Maximus, {student.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Ask a math question out loud, then sketch your work on the shared whiteboard while Maximus tracks progress for Grade {student.gradeLevel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:justify-end">
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full ${
                    status === "speaking"
                      ? "bg-mango shadow-[0_0_20px_rgba(255,211,110,0.9)]"
                      : status === "listening"
                        ? "bg-coral shadow-[0_0_20px_rgba(255,127,107,0.75)]"
                        : "bg-white/30"
                  }`}
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Status</p>
                  <p className="text-base font-black">{STATUS_LABELS[status]}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MicButton active={isActive} onClick={handleMicPress} disabled={status === "connecting" || !sessionReady} />
              <button
                type="button"
                onClick={() => void stopSession()}
                disabled={!isActive}
                className="min-h-14 rounded-2xl bg-white px-5 text-sm font-black text-ink transition disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/55"
              >
                End session
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-coral/20 px-4 py-3 text-sm text-white">
            {error}
          </div>
        )}

        {!error && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
            <div className="rounded-full bg-white/10 px-4 py-2">
              Session record: {sessionId ? "ready" : "saving"}
            </div>
            {sessionSummary ? (
              <div className="max-w-2xl rounded-2xl bg-white/10 px-4 py-3 text-white/90">
                {sessionSummary}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <SharedWhiteboard
        sessionActive={isActive}
        tutorTranscript={tutorTranscript}
        onStudentDrawingDescription={handleStudentDrawingDescription}
      />
    </section>
  );
}
