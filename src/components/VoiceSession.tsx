"use client";

import { useRef, useState } from "react";
import { MicButton } from "@/components/MicButton";
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

  return (
    <section className="grid gap-6 px-5 pb-6 sm:px-8 sm:pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
      <div className="rounded-[2rem] bg-ink px-6 py-7 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/65">Live session</p>
            <h2 className="mt-2 text-2xl font-black">Talk to Maximus</h2>
          </div>
          <div
            className={`h-4 w-4 rounded-full ${
              status === "speaking"
                ? "bg-mango shadow-[0_0_20px_rgba(255,211,110,0.9)]"
                : status === "listening"
                  ? "bg-coral shadow-[0_0_20px_rgba(255,127,107,0.75)]"
                  : "bg-white/30"
            }`}
          />
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-6 rounded-[1.5rem] bg-white/10 px-4 py-8 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/10">
            {(status === "speaking" || status === "listening") && (
              <>
                <span className="absolute inset-0 rounded-full bg-white/20 animate-pulseRing" />
                <span className="absolute inset-3 rounded-full bg-white/20 animate-pulseRing [animation-delay:240ms]" />
              </>
            )}
            <span className="relative text-4xl animate-bob" aria-hidden="true">
              {status === "speaking" ? "✦" : status === "listening" ? "◉" : "◎"}
            </span>
          </div>

          <div>
            <p className="text-2xl font-black">{STATUS_LABELS[status]}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
              Maximus speaks back in real time and keeps the conversation focused on elementary math.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-coral/20 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-lagoon/10 bg-white p-6 text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-lagoon/60">Controls</p>
        <div className="mt-6 flex justify-center">
          <MicButton active={isActive} onClick={handleMicPress} disabled={status === "connecting"} />
        </div>
        <p className="mt-5 text-base font-semibold text-ink">
          {isActive ? "Tap to hang up" : "Tap to start talking"}
        </p>
        <button
          type="button"
          onClick={stopSession}
          disabled={!isActive}
          className="mt-6 min-h-14 w-full rounded-2xl bg-lagoon px-5 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:bg-lagoon/25"
        >
          End session
        </button>
      </div>
    </section>
  );
}
