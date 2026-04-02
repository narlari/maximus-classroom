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
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-bubble backdrop-blur">
        <section className="relative overflow-hidden px-4 pb-5 pt-6 sm:px-8 sm:pt-8">
          <div className="absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-mango/50 blur-2xl" />
          <div className="absolute bottom-[-2rem] left-[-2rem] h-32 w-32 rounded-full bg-coral/30 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-lagoon"
                >
                  Student Select
                </Link>
                <Link
                  href="/parent"
                  className="inline-flex items-center rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white"
                >
                  Parent Dashboard
                </Link>
              </div>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-ink sm:text-5xl">
                {profile.student.name}&apos;s classroom
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
                Grade {profile.student.gradeLevel} tutoring with live voice, shared whiteboard, and memory from prior sessions.
              </p>
            </div>

            <div className="min-w-[220px] rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-[0_12px_40px_rgba(21,50,74,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Recent summaries</p>
              <div className="mt-3 space-y-3">
                {profile.recentSessions.length > 0 ? (
                  profile.recentSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl bg-sky/45 px-3 py-3 text-sm text-ink/80">
                      {session.summary ?? "Previous session is waiting for a saved summary."}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-sky/45 px-3 py-3 text-sm text-ink/80">
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
