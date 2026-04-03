"use client";

import type { SessionStatus } from "@/lib/realtime";

type MicButtonProps = {
  status: SessionStatus;
  disabled?: boolean;
  onClick: () => void;
};

const STATUS_STYLES: Record<SessionStatus, { shell: string; pulse: string; label: string; icon: string }> = {
  idle: {
    shell: "border-white/12 bg-[#22263d] text-white shadow-[0_18px_45px_rgba(0,0,0,0.32)]",
    pulse: "bg-white/10",
    label: "Tap to talk",
    icon: "🎤",
  },
  connecting: {
    shell: "border-reward/55 bg-reward/18 text-reward shadow-[0_0_0_14px_rgba(253,203,110,0.12)]",
    pulse: "bg-reward/20",
    label: "Connecting...",
    icon: "⋯",
  },
  listening: {
    shell: "border-mint bg-mint/16 text-white shadow-[0_0_0_14px_rgba(0,184,148,0.16)]",
    pulse: "bg-mint/30",
    label: "I'm listening...",
    icon: "🎙️",
  },
  thinking: {
    shell: "border-electric bg-electric/18 text-white shadow-[0_0_0_14px_rgba(108,92,231,0.18)]",
    pulse: "bg-electric/32",
    label: "Hmm...",
    icon: "🤔",
  },
  speaking: {
    shell: "border-[#4D96FF] bg-[#4D96FF]/18 text-white shadow-[0_0_0_14px_rgba(77,150,255,0.18)]",
    pulse: "bg-[#4D96FF]/28",
    label: "Maximus is talking...",
    icon: "🗣️",
  },
  error: {
    shell: "border-softred bg-softred/18 text-white shadow-[0_0_0_14px_rgba(255,107,107,0.16)]",
    pulse: "bg-softred/24",
    label: "Retry",
    icon: "↻",
  },
};

export function MicButton({ status, disabled = false, onClick }: MicButtonProps) {
  const active = status !== "idle" && status !== "error";
  const appearance = STATUS_STYLES[status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-[10px] transition duration-200 sm:h-52 sm:w-52 ${appearance.shell} ${
        disabled ? "cursor-not-allowed opacity-60" : "active:scale-95"
      }`}
    >
      <span className={`absolute inset-0 rounded-full ${appearance.pulse} animate-pulseRing`} />
      <span className="relative text-5xl sm:text-6xl" aria-hidden="true">
        {appearance.icon}
      </span>
      <span className="relative mt-3 text-center text-sm font-black uppercase tracking-[0.16em] text-current/90">
        {appearance.label}
      </span>
      <span className="sr-only">{active ? "Stop session" : "Start session"}</span>
    </button>
  );
}
