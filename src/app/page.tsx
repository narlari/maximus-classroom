import Link from "next/link";
import { listStudents } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatLastSession(dateString: string | null) {
  if (!dateString) {
    return "New student";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export default function Home() {
  const students = listStudents();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-bubble backdrop-blur">
        <section className="relative overflow-hidden px-5 pb-8 pt-8 sm:px-8 sm:pt-10">
          <div className="absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-mango/50 blur-2xl" />
          <div className="absolute bottom-[-2rem] left-[-2rem] h-32 w-32 rounded-full bg-coral/30 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-lagoon">
              Maximus Classroom
            </div>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-ink sm:text-5xl">
              Pick a student and jump back into math.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
              Maximus remembers past sessions, keeps skill progress in SQLite, and loads the right context before class starts.
            </p>
          </div>
        </section>

        <section className="grid flex-1 gap-5 px-5 pb-6 sm:grid-cols-2 sm:px-8 sm:pb-8">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/classroom/${student.id}`}
              className="group flex min-h-[260px] flex-col justify-between rounded-[2rem] border border-lagoon/10 bg-white/85 p-6 shadow-[0_24px_80px_rgba(21,50,74,0.08)] transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(21,50,74,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lagoon/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-lagoon/70">Student</p>
                  <h2 className="mt-2 text-3xl font-black text-ink">{student.name}</h2>
                  <p className="mt-2 text-base text-ink/70">Grade {student.gradeLevel} math</p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-sky/50 text-2xl font-black text-lagoon">
                  {student.name.slice(0, 1)}
                </div>
              </div>

              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink/45">Last session</p>
                  <p className="mt-2 text-lg font-bold text-ink">{formatLastSession(student.lastSessionAt)}</p>
                </div>
                <span className="rounded-full bg-lagoon px-4 py-2 text-sm font-black text-white transition group-hover:bg-ink">
                  Enter classroom
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
