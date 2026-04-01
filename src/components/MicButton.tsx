"use client";

type MicButtonProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MicButton({ active, disabled = false, onClick }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative flex h-40 w-40 items-center justify-center rounded-full border-8 transition duration-200 sm:h-48 sm:w-48 ${
        active
          ? "border-coral bg-coral text-white shadow-[0_0_0_14px_rgba(255,127,107,0.16)]"
          : "border-lagoon/20 bg-white text-lagoon shadow-[0_18px_45px_rgba(10,110,140,0.18)]"
      } ${disabled ? "cursor-not-allowed opacity-60" : "active:scale-95"}`}
    >
      {active && <span className="absolute inset-0 rounded-full bg-coral/30 animate-pulseRing" />}
      <span className="relative text-5xl" aria-hidden="true">
        {active ? "■" : "●"}
      </span>
      <span className="sr-only">{active ? "Stop session" : "Start session"}</span>
    </button>
  );
}
