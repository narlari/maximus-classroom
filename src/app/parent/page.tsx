import Link from "next/link";
import { ParentDashboardClient } from "@/components/ParentDashboardClient";
import { getParentDashboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ParentPage() {
  const dashboard = getParentDashboard();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-bubble backdrop-blur sm:p-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#15324a] px-5 py-6 text-white sm:px-8">
          <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-mango/40 blur-2xl" />
          <div className="absolute bottom-[-2rem] left-[-2rem] h-28 w-28 rounded-full bg-sky/25 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80"
                >
                  Student select
                </Link>
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                  Parent dashboard
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black sm:text-5xl">Family progress at a glance</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">
                Review recent sessions, spot flagged moments for follow-up, and check how Ariana and Liam are progressing across their math standards.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <ParentDashboardClient dashboard={dashboard} />
        </div>
      </div>
    </main>
  );
}
