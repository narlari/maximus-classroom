"use client";

import { useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
import { SharedWhiteboard } from "@/components/SharedWhiteboard";
import { connectRealtimeSession, type RealtimeController, type SessionStatus } from "@/lib/realtime";

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "Tap the mic to start",
  connecting: "Connecting...",
  listening: "Listening...",
  thinking: "Maximus is thinking...",
  speaking: "Maximus is speaking...",
  error: "Something went wrong",
};

export function VoiceSession() {
  const controllerRef = useRef<RealtimeController | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tutorTranscript, setTutorTranscript] = useState<string | null>(null);

  const isActive = status !== "idle" && status !== "error";

  const startSession = async () => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      controllerRef.current = null;
    }

    setError(null);

    try {
      const controller = await connectRealtimeSession({
        onStatusChange: setStatus,
        onError: setError,
        onAssistantTranscript: (transcript) => {
          setTutorTranscript(`${Date.now()}::${transcript}`);
        },
      });

      controllerRef.current = controller;
    } catch (sessionError) {
      setStatus("error");
      setError(sessionError instanceof Error ? sessionError.message : "Unable to start session.");
    }
  };

  const stopSession = () => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setError(null);
  };

  const handleMicPress = () => {
    if (isActive) {
      stopSession();
      return;
    }

    void startSession();
  };

  const handleStudentDrawingDescription = (description: string) => {
    controllerRef.current?.sendTextMessage(`Whiteboard update: ${description}`);
  };

  return (
    <section className="flex flex-1 flex-col gap-5 px-5 pb-6 sm:px-8 sm:pb-8">
      <div className="rounded-[2rem] bg-ink px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/65">Live session</p>
            <h2 className="mt-2 text-2xl font-black">Talk and draw with Maximus</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Ask a math question out loud, then sketch your work on the shared whiteboard.
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
              <MicButton active={isActive} onClick={handleMicPress} disabled={status === "connecting"} />
              <button
                type="button"
                onClick={stopSession}
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
      </div>

      <SharedWhiteboard
        sessionActive={isActive}
        tutorTranscript={tutorTranscript}
        onStudentDrawingDescription={handleStudentDrawingDescription}
      />
    </section>
  );
}
