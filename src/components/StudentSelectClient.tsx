"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StudentCard } from "@/lib/db";

type Props = {
  students: StudentCard[];
};

const SYMBOLS = ["+", "÷", "=", "★", "△", "π", "∞", "7", "9"];

const AVATARS: Record<string, string> = {
  ariana: "🎨",
  liam: "🎮",
};

function formatLastSession(dateString: string | null) {
  if (!dateString) {
    return "First quest";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

function getAvatar(student: StudentCard) {
  const normalized = student.name.toLowerCase();
  return AVATARS[normalized] ?? "⚡";
}

function getStars(student: StudentCard) {
  return Math.max(3, Math.min(5, student.gradeLevel));
}

function getStreak(student: StudentCard) {
  if (!student.lastSessionAt) {
    return 1;
  }

  return Math.max(2, Math.min(7, student.gradeLevel + 1));
}

export function StudentSelectClient({ students }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gamebg px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,92,231,0.22),transparent_32%),radial-gradient(circle_at_20%_25%,rgba(0,184,148,0.14),transparent_22%),radial-gradient(circle_at_80%_15%,rgba(253,203,110,0.16),transparent_20%),linear-gradient(180deg,#1A1A2E_0%,#101728_100%)]" />
        {SYMBOLS.map((symbol, index) => (
          <span
            key={`${symbol}-${index}`}
            className="absolute text-xl font-black text-white/10 animate-floatSlow"
            style={{
              left: `${10 + index * 10}%`,
              top: `${8 + (index % 4) * 18}%`,
              animationDelay: `${index * 0.5}s`,
            }}
          >
            {symbol}
          </span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8"
      >
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(108,92,231,0.24),rgba(22,33,62,0.82),rgba(0,184,148,0.18))] px-5 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(253,203,110,0.18),transparent_24%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex min-h-12 items-center rounded-full border border-white/15 bg-white/8 px-4 text-sm font-extrabold uppercase tracking-[0.24em] text-white/80">
                Maximus Classroom
              </div>
              <h1 className="mt-5 bg-[linear-gradient(90deg,#ffffff,#FDCB6E,#ffffff)] bg-[length:200%_200%] bg-clip-text text-4xl font-black text-transparent animate-shimmer sm:text-6xl">
                Ready to level up?
              </h1>
              <p className="mt-3 max-w-2xl text-base font-bold text-muted sm:text-lg">
                Pick your character and jump into a live math quest with Maximus.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-[#0f1730]/80 px-4 py-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Today&apos;s vibe</p>
                <p className="text-lg font-black text-white">Fun mode</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid flex-1 gap-5 md:grid-cols-2">
          {students.map((student, index) => {
            const stars = getStars(student);
            const streak = getStreak(student);

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08, duration: 0.35 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.985 }}
              >
                <Link
                  href={`/classroom/${student.id}`}
                  className="group flex min-h-[320px] flex-col justify-between rounded-[2rem] border border-white/12 bg-cardbg/95 p-6 shadow-glow transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-electric/40 sm:p-7"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(108,92,231,0.35),rgba(0,184,148,0.15))] text-5xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        {getAvatar(student)}
                      </div>
                      <div className="rounded-full border border-reward/25 bg-reward/12 px-4 py-2 text-sm font-black text-reward">
                        Level {student.gradeLevel}
                      </div>
                    </div>

                    <h2 className="mt-6 text-4xl font-black tracking-tight text-white">{student.name}</h2>
                    <p className="mt-2 text-lg font-bold text-muted">Grade {student.gradeLevel}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Stars</p>
                        <p className="mt-2 text-2xl text-reward">{Array.from({ length: stars }, () => "⭐").join("")}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Streak</p>
                        <p className="mt-2 text-2xl font-black text-white">🔥 {streak} day</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Last quest</p>
                      <p className="mt-2 text-lg font-black text-white">{formatLastSession(student.lastSessionAt)}</p>
                    </div>
                    <span className="inline-flex min-h-14 items-center rounded-full bg-[linear-gradient(135deg,#6C5CE7,#00B894)] px-6 text-base font-black text-white shadow-[0_14px_36px_rgba(108,92,231,0.28)] transition group-hover:scale-105">
                      Enter room
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>

        <div className="mt-6 flex justify-end">
          <Link
            href="/parent"
            className="inline-flex min-h-12 items-center rounded-full border border-white/12 bg-white/8 px-5 text-sm font-black text-white/85 transition hover:bg-white/12"
          >
            👨‍👩‍👧‍👦 Parent Dashboard
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
