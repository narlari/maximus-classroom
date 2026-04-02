"use client";

import { useState } from "react";
import type { ParentDashboard } from "@/lib/db";

type Props = {
  dashboard: ParentDashboard;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function masteryTone(mastery: number) {
  if (mastery < 40) {
    return "bg-coral";
  }

  if (mastery <= 70) {
    return "bg-mango";
  }

  return "bg-lagoon";
}

export function ParentDashboardClient({ dashboard }: Props) {
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  const toggleSession = (sessionId: string) => {
    setExpandedSessionIds((current) => ({
      ...current,
      [sessionId]: !current[sessionId],
    }));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] border border-lagoon/10 bg-white/90 p-5 shadow-[0_18px_60px_rgba(21,50,74,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-lagoon/70">API Cost</p>
          <p className="mt-3 text-3xl font-black text-ink">{formatMoney(dashboard.costs.weekCents)}</p>
          <p className="mt-2 text-sm text-ink/65">This week</p>
        </div>
        <div className="rounded-[2rem] border border-lagoon/10 bg-white/90 p-5 shadow-[0_18px_60px_rgba(21,50,74,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-lagoon/70">API Cost</p>
          <p className="mt-3 text-3xl font-black text-ink">{formatMoney(dashboard.costs.monthCents)}</p>
          <p className="mt-2 text-sm text-ink/65">Last 30 days</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {dashboard.students.map((entry) => (
          <article
            key={entry.student.id}
            className="rounded-[2rem] border border-lagoon/10 bg-white/92 p-5 shadow-[0_22px_70px_rgba(21,50,74,0.08)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-lagoon/70">Student</p>
                <h2 className="mt-2 text-3xl font-black text-ink">{entry.student.name}</h2>
                <p className="mt-2 text-base text-ink/70">Grade {entry.student.gradeLevel}</p>
              </div>
              <div className="rounded-[1.5rem] bg-sky/60 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Completed</p>
                <p className="mt-2 text-2xl font-black text-ink">{entry.totalSessions}</p>
                <p className="text-sm text-ink/60">sessions</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-[#f8fbfd] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">Last session</p>
                  <p className="mt-2 text-lg font-black text-ink">{formatDate(entry.lastSession?.endedAt ?? entry.lastSession?.startedAt ?? null)}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink shadow-sm">
                  {entry.lastSession?.durationMinutes ?? 0} min
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/75">
                {entry.lastSession?.summary ?? "No completed sessions yet."}
              </p>
            </div>

            {entry.flaggedEvents.length > 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-coral/25 bg-coral/10 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">⚠️ Parent review</p>
                <div className="mt-3 space-y-2">
                  {entry.flaggedEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="rounded-2xl bg-white/80 px-3 py-3 text-sm text-ink/80">
                      <p className="font-bold text-ink">{event.flagReason ?? "Flagged event"}</p>
                      <p className="mt-1">{event.content ?? "No event text saved."}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink/45">{formatDate(event.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink/45">Skill progress</p>
              <div className="mt-3 space-y-4">
                {entry.progressByDomain.map((domainGroup) => (
                  <div key={domainGroup.domain} className="rounded-[1.5rem] bg-[#fffdf8] p-4">
                    <p className="text-sm font-black text-ink">{domainGroup.domain}</p>
                    <div className="mt-3 space-y-3">
                      {domainGroup.skills.map((skill) => (
                        <div key={skill.id}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-ink">{skill.standardName ?? skill.standardCode}</p>
                            <p className="text-xs uppercase tracking-[0.14em] text-ink/45">{skill.standardCode}</p>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10">
                            <div
                              className={`h-full rounded-full ${masteryTone(skill.masteryLevel)}`}
                              style={{ width: `${skill.masteryLevel}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.14em] text-ink/50">
                            <span>{skill.masteryLevel}% mastery</span>
                            <span>{skill.attempts} attempts</span>
                            <span>Last practiced {formatDate(skill.lastPracticed)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink/45">Recent sessions</p>
              <div className="mt-3 space-y-3">
                {entry.recentSessions.map((session) => {
                  const isExpanded = Boolean(expandedSessionIds[session.id]);

                  return (
                    <div key={session.id} className="rounded-[1.5rem] border border-lagoon/10 bg-[#fbfcff] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-ink">{formatDate(session.endedAt ?? session.startedAt)}</p>
                          <p className="mt-1 text-sm text-ink/60">{session.durationMinutes ?? 0} minutes</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSession(session.id)}
                          className="rounded-full bg-lagoon/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-lagoon"
                        >
                          {isExpanded ? "Hide details" : "Show details"}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {session.topicsCovered.length > 0 ? (
                          session.topicsCovered.map((topic) => (
                            <span
                              key={`${session.id}-${topic}`}
                              className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-lagoon"
                            >
                              {topic}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-lagoon">General math</span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-ink/75">{session.summary ?? "Summary pending."}</p>
                      <p className="mt-2 text-sm text-ink/65">{session.performanceNotes ?? "No performance note saved."}</p>

                      {isExpanded ? (
                        <div className="mt-4 rounded-[1.25rem] bg-white p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/45">Event log</p>
                          <div className="mt-3 space-y-2">
                            {session.events.length > 0 ? (
                              session.events.map((event) => (
                                <div key={event.id} className="rounded-xl bg-[#f7fafc] px-3 py-3 text-sm text-ink/80">
                                  <p className="font-bold text-ink">
                                    {event.flagged ? "⚠️ " : ""}
                                    {event.eventType.replace(/_/g, " ")}
                                  </p>
                                  <p className="mt-1">{event.content ?? "No content."}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink/45">
                                    {formatDate(event.timestamp)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-ink/60">No events saved for this session.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
