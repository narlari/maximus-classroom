import Link from "next/link";
import { notFound } from "next/navigation";
import { VoiceSession } from "@/components/VoiceSession";
import { getStudentProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ClassroomPage({
  params,
}: {
  params: { studentId: string };
}) {
  const profile = getStudentProfile(params.studentId);

  if (!profile) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gamebg px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="kid-card-grid mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(22,33,62,0.98),rgba(15,23,48,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
        <section className="relative overflow-hidden border-b border-white/8 px-4 pb-5 pt-6 sm:px-8 sm:pt-8">
          <div className="absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-electric/30 blur-3xl" />
          <div className="absolute bottom-[-2rem] left-[-2rem] h-32 w-32 rounded-full bg-mint/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center rounded-full border border-white/10 bg-white/6 px-4 text-xs font-bold uppercase tracking-[0.2em] text-white/80"
                >
                  ← Student Select
                </Link>
                <Link
                  href="/parent"
                  className="inline-flex min-h-12 items-center rounded-full border border-white/10 bg-white/6 px-4 text-xs font-bold uppercase tracking-[0.2em] text-white/80"
                >
                  Parent Dashboard
                </Link>
              </div>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
                {profile.student.name}&apos;s Room
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Grade {profile.student.gradeLevel} live tutoring with a game-style voice coach, a bright whiteboard, and saved progress from past sessions.
              </p>
            </div>

            <div className="min-w-[260px] rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Recent summaries</p>
              <div className="mt-3 space-y-3">
                {profile.recentSessions.length > 0 ? (
                  profile.recentSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-white/8 bg-[#0d1430] px-3 py-3 text-sm text-white/78">
                      {session.summary ?? "Previous session is waiting for a saved summary."}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-[#0d1430] px-3 py-3 text-sm text-white/78">
                    No saved sessions yet. Maximus will start with a fresh warm-up.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <VoiceSession student={profile.student} />
      </div>
    </main>
  );
}
